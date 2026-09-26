import { Injectable } from '@nestjs/common';
import { RoleCode } from '../common/enums/role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { ScopeService } from '../common/scope/scope.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  SEARCH_TYPES,
  SearchEntityType,
  SearchQueryDto,
} from './dto/search-query.dto';

export type SearchHit = {
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle?: string | null;
  meta?: Record<string, unknown> | null;
};

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async search(
    user: AuthenticatedUser,
    query: SearchQueryDto,
  ): Promise<PaginatedResult<SearchHit>> {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const q = query.q?.trim() ?? '';
    const types = this.parseTypes(query.types, user);

    if (!q || types.length === 0) {
      return paginated([], 0, page, limit);
    }

    const perType = Math.max(1, Math.ceil(limit / types.length));
    const buckets = await Promise.all(
      types.map((type) => this.searchType(user, type, q, perType)),
    );

    const combined = buckets.flat();
    const total = combined.length;
    const skip = (page - 1) * limit;
    const data = combined.slice(skip, skip + limit);

    return paginated(data, total, page, limit);
  }

  private parseTypes(
    raw: string | undefined,
    user: AuthenticatedUser,
  ): SearchEntityType[] {
    const requested = raw
      ? raw
          .split(',')
          .map((part) => part.trim().toLowerCase())
          .filter(Boolean)
      : [...SEARCH_TYPES];

    const allowed = new Set<SearchEntityType>(SEARCH_TYPES);
    const unique = [
      ...new Set(
        requested.filter((t): t is SearchEntityType =>
          allowed.has(t as SearchEntityType),
        ),
      ),
    ];

    if (user.role === RoleCode.CUSTOMER) {
      return unique.filter((t) =>
        t === 'customers' || t === 'bills' || t === 'appointments',
      );
    }

    if (user.role === RoleCode.MANAGER || user.role === RoleCode.STAFF) {
      // Salons search is primarily for SA/ADMIN franchise browsing.
      return unique.filter((t) => t !== 'salons' || Boolean(user.salonId));
    }

    return unique;
  }

  private async searchType(
    user: AuthenticatedUser,
    type: SearchEntityType,
    q: string,
    take: number,
  ): Promise<SearchHit[]> {
    switch (type) {
      case 'customers':
        return this.searchCustomers(user, q, take);
      case 'bills':
        return this.searchBills(user, q, take);
      case 'appointments':
        return this.searchAppointments(user, q, take);
      case 'services':
        return this.searchServices(user, q, take);
      case 'products':
        return this.searchProducts(user, q, take);
      case 'salons':
        return this.searchSalons(user, q, take);
      default:
        return [];
    }
  }

  private async searchCustomers(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchHit[]> {
    const rows = await this.prisma.customer.findMany({
      where: {
        ...this.scope.customerTableScope(user),
        OR: [
          { customerCode: { contains: q } },
          { user: { firstName: { contains: q } } },
          { user: { lastName: { contains: q } } },
          { user: { email: { contains: q } } },
          { user: { phone: { contains: q } } },
        ],
      },
      select: {
        id: true,
        customerCode: true,
        user: {
          select: { firstName: true, lastName: true, phone: true, email: true },
        },
      },
      take,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      type: 'customers' as const,
      id: row.id,
      title: `${row.user.firstName} ${row.user.lastName}`.trim(),
      subtitle: row.user.phone ?? row.user.email,
      meta: { customerCode: row.customerCode },
    }));
  }

  private async searchBills(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchHit[]> {
    const where: Record<string, unknown> = {
      billNumber: { contains: q },
    };

    if (user.role === RoleCode.CUSTOMER) {
      where.customerId = await this.scope.requireOwnCustomerId(user);
    } else {
      Object.assign(where, this.scope.salonScope(user));
    }

    const rows = await this.prisma.bill.findMany({
      where,
      select: {
        id: true,
        billNumber: true,
        status: true,
        total: true,
        salonId: true,
      },
      take,
      orderBy: { billDate: 'desc' },
    });

    return rows.map((row) => ({
      type: 'bills' as const,
      id: row.id,
      title: row.billNumber,
      subtitle: row.status,
      meta: {
        salonId: row.salonId,
        total: row.total.toString(),
      },
    }));
  }

  private async searchAppointments(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchHit[]> {
    const where: Record<string, unknown> = {
      appointmentNumber: { contains: q },
      ...this.scope.salonScope(user),
    };

    if (user.role === RoleCode.CUSTOMER) {
      where.customerId = await this.scope.requireOwnCustomerId(user);
    }

    const rows = await this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        appointmentNumber: true,
        status: true,
        appointmentDate: true,
        salonId: true,
      },
      take,
      orderBy: { appointmentDate: 'desc' },
    });

    return rows.map((row) => ({
      type: 'appointments' as const,
      id: row.id,
      title: row.appointmentNumber,
      subtitle: row.status,
      meta: {
        salonId: row.salonId,
        appointmentDate: row.appointmentDate,
      },
    }));
  }

  private async searchServices(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchHit[]> {
    if (user.role === RoleCode.CUSTOMER) {
      return [];
    }

    const rows = await this.prisma.service.findMany({
      where: {
        ...this.scope.salonScope(user),
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, name: true, salonId: true, isActive: true },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      type: 'services' as const,
      id: row.id,
      title: row.name,
      subtitle: row.isActive ? 'Active' : 'Inactive',
      meta: { salonId: row.salonId },
    }));
  }

  private async searchProducts(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchHit[]> {
    if (user.role === RoleCode.CUSTOMER) {
      return [];
    }

    const rows = await this.prisma.product.findMany({
      where: {
        ...this.scope.salonScope(user),
        OR: [
          { name: { contains: q } },
          { sku: { contains: q } },
          { barcode: { contains: q } },
          { description: { contains: q } },
        ],
      },
      select: { id: true, name: true, sku: true, salonId: true },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      type: 'products' as const,
      id: row.id,
      title: row.name,
      subtitle: row.sku,
      meta: { salonId: row.salonId },
    }));
  }

  private async searchSalons(
    user: AuthenticatedUser,
    q: string,
    take: number,
  ): Promise<SearchHit[]> {
    if (
      user.role !== RoleCode.SUPER_ADMIN &&
      user.role !== RoleCode.ADMIN &&
      user.role !== RoleCode.MANAGER &&
      user.role !== RoleCode.STAFF
    ) {
      return [];
    }

    const rows = await this.prisma.salon.findMany({
      where: {
        ...this.scope.salonTableScope(user),
        OR: [
          { name: { contains: q } },
          { code: { contains: q } },
          { city: { contains: q } },
        ],
      },
      select: { id: true, name: true, code: true, city: true },
      take,
      orderBy: { name: 'asc' },
    });

    return rows.map((row) => ({
      type: 'salons' as const,
      id: row.id,
      title: row.name,
      subtitle: row.city,
      meta: { code: row.code },
    }));
  }
}
