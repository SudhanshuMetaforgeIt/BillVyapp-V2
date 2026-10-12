import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { LoyaltyProgramDto, LoyaltyQuoteDto } from './dto/loyalty-program.dto';
import { loyaltyPolicy } from './loyalty-program';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role.enum';
import type { Prisma } from '../generated/prisma/client';

@Injectable()
export class LoyaltyProgramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}
  private owner(user: AuthenticatedUser) {
    if (user.role !== RoleCode.ADMIN || !user.franchiseId)
      throw new ForbiddenException('Franchise owner access required');
    return user.franchiseId;
  }
  async settings(user: AuthenticatedUser) {
    const id = this.owner(user);
    const franchise = await this.prisma.franchise.findUnique({
      where: { id },
      select: { preferences: true },
    });
    if (!franchise) throw new NotFoundException('Franchise not found');
    return loyaltyPolicy(franchise.preferences);
  }
  async update(user: AuthenticatedUser, dto: LoyaltyProgramDto) {
    const id = this.owner(user);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM franchises WHERE id = ${id} FOR UPDATE`;
      const franchise = await tx.franchise.findUniqueOrThrow({
        where: { id },
        select: { preferences: true },
      });
      const preferences = (franchise.preferences ?? {}) as Record<
        string,
        Prisma.InputJsonValue
      >;
      await tx.franchise.update({
        where: { id },
        data: { preferences: { ...preferences, loyalty: { ...dto } } },
      });
    });
    await this.audit.record({
      userId: user.userId,
      action: 'UPDATE',
      entityType: 'FranchiseLoyalty',
      entityId: id,
      newData: { ...dto },
    });
    return dto;
  }
  async quote(user: AuthenticatedUser, dto: LoyaltyQuoteDto) {
    if (user.role === RoleCode.CUSTOMER)
      throw new ForbiddenException('Staff access required');
    await this.scope.assertSalonAccess(user, dto.salonId);
    await this.scope.assertCustomerAccess(user, dto.customerId);
    const salon = await this.prisma.salon.findUnique({
      where: { id: dto.salonId },
      select: {
        isActive: true,
        franchiseId: true,
        franchise: { select: { preferences: true } },
      },
    });
    if (!salon?.isActive) throw new BadRequestException('Active shop required');
    const policy = loyaltyPolicy(salon.franchise.preferences);
    const aggregate = await this.prisma.loyaltyTransaction.aggregate({
      where: {
        customerId: dto.customerId,
        salon: { franchiseId: salon.franchiseId },
      },
      _sum: { points: true },
    });
    const balance = aggregate._sum.points ?? 0;
    return {
      ...policy,
      balance,
      canRedeem: policy.enabled && balance >= policy.minimumRedeemPoints,
      pointValue: 1,
    };
  }
}
