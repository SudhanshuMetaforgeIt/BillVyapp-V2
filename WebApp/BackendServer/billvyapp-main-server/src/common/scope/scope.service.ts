import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RoleCode } from '../enums/role.enum';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

/**
 * Row-level authorization.
 *
 * RolesGuard answers "may this role call this endpoint?".
 * This service answers "may this specific user touch this specific row?",
 * which is the check that stops an ADMIN of Franchise A from reading a salon
 * belonging to Franchise B.
 *
 * Business services must call these helpers instead of trusting any
 * franchiseId/salonId supplied by the client.
 */
@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Prisma `where` fragment limiting a salon-owned table to the caller's scope.
   * Spread into a query: `where: { ...scope.salonScope(user), isActive: true }`
   */
  salonScope(user: AuthenticatedUser): Record<string, unknown> {
    switch (user.role) {
      case RoleCode.SUPER_ADMIN:
        return {};
      case RoleCode.ADMIN:
        return { salon: { franchiseId: this.requireFranchise(user) } };
      case RoleCode.MANAGER:
      case RoleCode.STAFF:
        return { salonId: this.requireSalon(user) };
      case RoleCode.CUSTOMER:
        // Customers are not scoped by salon; they are scoped by their own
        // customer row. Use customerScope() for customer-owned tables.
        return {};
      default:
        throw new ForbiddenException('Unknown role scope');
    }
  }

  /** Scope fragment for the `salons` table itself (no nested `salon` relation). */
  salonTableScope(user: AuthenticatedUser): Record<string, unknown> {
    switch (user.role) {
      case RoleCode.SUPER_ADMIN:
      case RoleCode.CUSTOMER:
        return {};
      case RoleCode.ADMIN:
        return { franchiseId: this.requireFranchise(user) };
      case RoleCode.MANAGER:
      case RoleCode.STAFF:
        return { id: this.requireSalon(user) };
      default:
        throw new ForbiddenException('Unknown role scope');
    }
  }

  /** Scope fragment for the `franchises` table. */
  franchiseTableScope(user: AuthenticatedUser): Record<string, unknown> {
    if (user.role === RoleCode.SUPER_ADMIN) {
      return {};
    }
    if (user.role === RoleCode.ADMIN) {
      return { id: this.requireFranchise(user) };
    }
    if (user.role === RoleCode.MANAGER || user.role === RoleCode.STAFF) {
      return { salons: { some: { id: this.requireSalon(user) } } };
    }
    return {};
  }

  /**
   * Verifies the caller may act on a given salon, resolving the salon's
   * franchise from the database rather than trusting the request.
   */
  async assertSalonAccess(
    user: AuthenticatedUser,
    salonId: string,
  ): Promise<void> {
    if (user.role === RoleCode.SUPER_ADMIN) {
      return;
    }

    if (user.role === RoleCode.MANAGER || user.role === RoleCode.STAFF) {
      if (this.requireSalon(user) !== salonId) {
        throw new ForbiddenException('Salon outside your scope');
      }
      return;
    }

    if (user.role === RoleCode.ADMIN) {
      const salon = await this.prisma.salon.findUnique({
        where: { id: salonId },
        select: { franchiseId: true },
      });

      if (!salon) {
        throw new NotFoundException('Salon not found');
      }
      if (salon.franchiseId !== this.requireFranchise(user)) {
        throw new ForbiddenException('Salon outside your franchise');
      }
      return;
    }

    throw new ForbiddenException('Salon outside your scope');
  }

  /** Verifies the caller may act on a given franchise. */
  assertFranchiseAccess(user: AuthenticatedUser, franchiseId: string): void {
    if (user.role === RoleCode.SUPER_ADMIN) {
      return;
    }
    if (
      user.role === RoleCode.ADMIN &&
      this.requireFranchise(user) === franchiseId
    ) {
      return;
    }
    throw new ForbiddenException('Franchise outside your scope');
  }

  /**
   * Resolves the customer row owned by the caller. Customers may only ever
   * read their own customer-linked data.
   */
  async requireOwnCustomerId(user: AuthenticatedUser): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: user.userId },
      select: { id: true },
    });

    if (!customer) {
      throw new ForbiddenException(
        'No customer profile linked to this account',
      );
    }
    return customer.id;
  }

  private requireFranchise(user: AuthenticatedUser): string {
    if (!user.franchiseId) {
      throw new ForbiddenException('Account is not assigned to a franchise');
    }
    return user.franchiseId;
  }

  private requireSalon(user: AuthenticatedUser): string {
    if (!user.salonId) {
      throw new ForbiddenException('Account is not assigned to a salon');
    }
    return user.salonId;
  }
}
