import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import type { Prisma } from '../generated/prisma/client';
import {
  requireRequestKey,
  financialRequestHash,
  assertSameFinancialRequest,
} from '../common/security/financial-integrity';
import { LoyaltyTransactionType } from '../common/enums/loyalty-transaction-type.enum';
import { RoleCode } from '../common/enums/role.enum';
import { assertFinancialAuthority } from '../common/security/access-policy';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { ScopeService } from '../common/scope/scope.service';
import { trimOrNull } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoyaltyTransactionDto } from './dto/create-loyalty-transaction.dto';
import { LoyaltyBalanceQueryDto } from './dto/loyalty-balance-query.dto';
import { LoyaltyQueryDto } from './dto/loyalty-query.dto';

const LOYALTY_SELECT = {
  requestHash: true,
  id: true,
  customerId: true,
  salonId: true,
  points: true,
  transactionType: true,
  referenceType: true,
  referenceId: true,
  description: true,
  createdAt: true,
} as const;

type LoyaltyRow = {
  id: string;
  customerId: string;
  salonId: string | null;
  points: number;
  transactionType: string;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
};

export type LoyaltyTransactionRecord = {
  id: string;
  customerId: string;
  salonId: string | null;
  points: number;
  transactionType: LoyaltyTransactionType;
  referenceType: string | null;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
};

export type LoyaltyBalanceRecord = {
  customerId: string;
  balance: number;
};

@Injectable()
export class LoyaltyService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: LoyaltyQueryDto,
  ): Promise<PaginatedResult<LoyaltyTransactionRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const filters: Record<string, unknown>[] = [];

    if (user.role === RoleCode.CUSTOMER) {
      filters.push({ customerId: await this.scope.requireOwnCustomerId(user) });
    } else {
      filters.push(this.scope.salonScope(user));
      if (query.customerId) {
        await this.scope.assertCustomerAccess(user, query.customerId);
        filters.push({ customerId: query.customerId });
      }
    }

    if (query.salonId) {
      if (user.role !== RoleCode.CUSTOMER) {
        await this.scope.assertSalonAccess(user, query.salonId);
      }
      filters.push({ salonId: query.salonId });
    }

    if (query.transactionType) {
      filters.push({ transactionType: query.transactionType });
    }

    const where = { AND: filters };

    const [rows, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where,
        select: LOYALTY_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loyaltyTransaction.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async balance(
    user: AuthenticatedUser,
    query: LoyaltyBalanceQueryDto,
  ): Promise<LoyaltyBalanceRecord> {
    const customerId = await this.resolveCustomerId(user, query.customerId);

    const aggregate = await this.prisma.loyaltyTransaction.aggregate({
      where: {
        customerId,
        ...(user.role === RoleCode.CUSTOMER ? {} : this.scope.salonScope(user)),
      },
      _sum: { points: true },
    });

    return {
      customerId,
      balance: aggregate._sum.points ?? 0,
    };
  }

  async findOne(
    user: AuthenticatedUser,
    id: string,
  ): Promise<LoyaltyTransactionRecord> {
    const record = await this.prisma.loyaltyTransaction.findUnique({
      where: { id },
      select: LOYALTY_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Loyalty transaction not found');
    }

    await this.assertReadable(user, record);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateLoyaltyTransactionDto,
    ctx: RequestContext,
  ): Promise<LoyaltyTransactionRecord> {
    assertFinancialAuthority(actor);
    const idempotencyKey = requireRequestKey(dto.idempotencyKey);
    const salonId = dto.salonId ?? actor.salonId;
    if (!salonId && actor.role !== RoleCode.SUPER_ADMIN)
      throw new ForbiddenException(
        'A salon is required for loyalty adjustments',
      );
    await this.scope.assertCustomerAccess(actor, dto.customerId);
    await this.requireActiveCustomer(dto.customerId);

    if (salonId) {
      await this.scope.assertSalonAccess(actor, salonId);
      await this.requireActiveSalon(salonId);
    }

    this.assertPointsSign(dto.transactionType, dto.points);
    const requestHash = financialRequestHash({
      actor: actor.userId,
      ...dto,
      salonId: salonId ?? null,
    });
    const created = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM customers WHERE id = ${dto.customerId} FOR UPDATE`;
        const retry = await tx.loyaltyTransaction.findFirst({
          where: { customerId: dto.customerId, idempotencyKey },
          select: LOYALTY_SELECT,
        });
        if (retry) {
          assertSameFinancialRequest(retry.requestHash, requestHash);
          return retry;
        }
        if (dto.points < 0)
          await this.assertSufficientBalance(
            dto.customerId,
            dto.points,
            salonId ?? null,
            tx,
          );
        return tx.loyaltyTransaction.create({
          data: {
            idempotencyKey,
            requestHash,
            customerId: dto.customerId,
            salonId: salonId ?? null,
            points: dto.points,
            transactionType: dto.transactionType,
            referenceType: trimOrNull(dto.referenceType) ?? null,
            referenceId: dto.referenceId ?? null,
            description: trimOrNull(dto.description) ?? null,
          },
          select: LOYALTY_SELECT,
        });
      },
      { isolationLevel: 'ReadCommitted' },
    );

    await this.audit.record({
      userId: actor.userId,
      salonId: created.salonId ?? undefined,
      action: 'LOYALTY_TRANSACTION_CREATED',
      entityType: 'LoyaltyTransaction',
      entityId: created.id,
      newData: {
        customerId: created.customerId,
        salonId: created.salonId,
        points: created.points,
        transactionType: created.transactionType,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(created);
  }

  private async resolveCustomerId(
    user: AuthenticatedUser,
    customerId?: string,
  ): Promise<string> {
    if (user.role === RoleCode.CUSTOMER) {
      return this.scope.requireOwnCustomerId(user);
    }

    if (!customerId) {
      throw new BadRequestException('customerId is required');
    }

    await this.scope.assertCustomerAccess(user, customerId);
    return customerId;
  }

  private async assertReadable(
    user: AuthenticatedUser,
    record: LoyaltyRow,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      await this.scope.assertOwnCustomerAccess(user, record.customerId);
      return;
    }

    await this.scope.assertCustomerAccess(user, record.customerId);
    if (record.salonId) {
      await this.scope.assertSalonAccess(user, record.salonId);
    } else if (user.role !== RoleCode.SUPER_ADMIN) {
      throw new ForbiddenException('Loyalty transaction outside your scope');
    }
  }

  private assertPointsSign(type: LoyaltyTransactionType, points: number): void {
    if (
      !Number.isInteger(points) ||
      Math.abs(points) > 2_147_483_647 ||
      !Object.values(LoyaltyTransactionType).includes(type)
    )
      throw new BadRequestException(
        'Invalid loyalty points or transaction type',
      );
    if (type === LoyaltyTransactionType.REDEEMED && points >= 0) {
      throw new BadRequestException('REDEEMED transactions require points < 0');
    }
    if (
      (type === LoyaltyTransactionType.EARNED ||
        type === LoyaltyTransactionType.BONUS) &&
      points <= 0
    ) {
      throw new BadRequestException(`${type} transactions require points > 0`);
    }
    if (type === LoyaltyTransactionType.EXPIRED && points >= 0) {
      throw new BadRequestException('EXPIRED transactions require points < 0');
    }
    if (points === 0) {
      throw new BadRequestException('points must be non-zero');
    }
  }

  private async assertSufficientBalance(
    customerId: string,
    points: number,
    salonId: string | null,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const aggregate = await tx.loyaltyTransaction.aggregate({
      where: { customerId, salonId },
      _sum: { points: true },
    });
    const balance = aggregate._sum.points ?? 0;
    if (balance + points < 0) {
      throw new BadRequestException('Insufficient loyalty balance');
    }
  }

  private async requireActiveCustomer(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        user: { select: { isActive: true } },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }
    if (!customer.user.isActive) {
      throw new BadRequestException('Customer is inactive');
    }
  }

  private async requireActiveSalon(salonId: string): Promise<void> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, isActive: true },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }
    if (!salon.isActive) {
      throw new BadRequestException('Salon is inactive');
    }
  }

  private toResponse(row: LoyaltyRow): LoyaltyTransactionRecord {
    return {
      id: row.id,
      customerId: row.customerId,
      salonId: row.salonId,
      points: row.points,
      transactionType: row.transactionType as LoyaltyTransactionType,
      referenceType: row.referenceType,
      referenceId: row.referenceId,
      description: row.description,
      createdAt: row.createdAt,
    };
  }
}
