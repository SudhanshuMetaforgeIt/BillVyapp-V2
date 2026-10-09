import { measureBaseline } from '../common/performance/baseline';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import {
  BillPaymentStatus,
  BillStatus,
} from '../common/enums/bill-status.enum';
import {
  PAYMENT_STATUS_TRANSITIONS,
  PaymentMethod,
  PaymentStatus,
} from '../common/enums/payment.enum';
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
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import {
  businessCalendarRangeToUtc,
  calendarDateStartUtc,
  isDateOnlyString,
} from '../common/datetime/datetime';
import { trimOrNull } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import type { Prisma } from '../generated/prisma/client';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { completeChosenEnrollment } from '../bills/bill-enrollment';
import {
  moneyCents,
  centsString,
  requireRequestKey,
  financialRequestHash,
  assertSameFinancialRequest,
  requireCurrency,
  assertNoRawCardData,
} from '../common/security/financial-integrity';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

const PAYMENT_SELECT = {
  currency: true,
  requestHash: true,
  provider: true,
  id: true,
  billId: true,
  amount: true,
  paymentMethod: true,
  transactionReference: true,
  paymentDate: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  bill: {
    select: {
      currency: true,
      id: true,
      salonId: true,
      customerId: true,
      status: true,
      total: true,
      paidAmount: true,
      dueAmount: true,
      paymentStatus: true,
    },
  },
} as const;

type Decimalish = { toString(): string } | string | number;

type PaymentRow = {
  currency?: string;
  requestHash?: string | null;
  provider?: string;
  id: string;
  billId: string;
  amount: Decimalish;
  paymentMethod: string;
  transactionReference: string | null;
  paymentDate: Date;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  bill: {
    currency?: string;
    id: string;
    salonId: string;
    customerId: string;
    status: string;
    total: Decimalish;
    paidAmount: Decimalish;
    dueAmount: Decimalish;
    paymentStatus: string;
  };
};

export type PaymentRecord = {
  currency: 'INR' | 'USD';
  id: string;
  billId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  transactionReference: string | null;
  paymentDate: Date;
  status: PaymentStatus;
  notes: string | null;
  salonId: string;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
};

type TxClient = Prisma.TransactionClient;

@Injectable()
export class PaymentsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly businessTimezone: BusinessTimezoneService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: PaymentQueryDto,
  ): Promise<PaginatedResult<PaymentRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const timeZone = await this.businessTimezone.resolveForUser(user);
    const billFilters: Record<string, unknown>[] = [
      this.scope.salonScope(user),
    ];

    if (user.role === RoleCode.CUSTOMER) {
      billFilters.push({
        customerId: await this.scope.requireOwnCustomerId(user),
      });
    }

    const filters: Record<string, unknown>[] = [{ bill: { AND: billFilters } }];

    if (query.billId) {
      filters.push({ billId: query.billId });
    }
    if (query.status) {
      filters.push({ status: query.status });
      // Legacy refunded bills may still have SUCCESS payment rows.
      if (query.status === PaymentStatus.SUCCESS) {
        billFilters.push({ status: BillStatus.COMPLETED });
      }
    }
    if (query.paymentMethod) {
      filters.push({ paymentMethod: query.paymentMethod });
    }

    if (query.dateFrom || query.dateTo) {
      try {
        const range = businessCalendarRangeToUtc(
          query.dateFrom,
          query.dateTo,
          timeZone,
        );
        filters.push({ paymentDate: range });
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid date range',
        );
      }
    }

    const where = { AND: filters };

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        select: PAYMENT_SELECT,
        orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<PaymentRecord> {
    const record = await this.requirePayment(id);
    await this.assertPaymentAccess(user, record);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreatePaymentDto,
    ctx: RequestContext,
  ): Promise<PaymentRecord> {
    this.assertPaymentWriter(actor);
    const idempotencyKey = requireRequestKey(dto.idempotencyKey);
    if (!Object.values(PaymentMethod).includes(dto.paymentMethod))
      throw new BadRequestException('Unsupported payment method');
    assertNoRawCardData(
      dto.notes,
      dto.transactionReference,
      dto.paymentMethod === PaymentMethod.CARD,
    );
    if (dto.source !== undefined && dto.source !== 'MANUAL')
      throw new BadRequestException(
        'Gateway payments require trusted server verification; integration is unavailable',
      );
    if (moneyCents(dto.amount, 'payment amount') <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const bill = await this.prisma.bill.findUnique({
      where: { id: dto.billId },
      select: {
        currency: true,
        id: true,
        salonId: true,
        customerId: true,
        status: true,
        total: true,
        paidAmount: true,
        dueAmount: true,
        paymentStatus: true,
        salon: {
          select: {
            franchiseId: true,
            franchise: { select: { preferences: true } },
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    await this.assertBillPaymentAccess(actor, bill);
    const currency = requireCurrency(bill.currency);
    if (dto.currency !== undefined && dto.currency !== currency)
      throw new BadRequestException(
        'Payment currency does not match bill currency',
      );
    const status = dto.status ?? PaymentStatus.SUCCESS;
    const reference = trimOrNull(dto.transactionReference) ?? null;
    const provider = `MANUAL_${dto.paymentMethod}`;
    const providerTransactionId = [
      PaymentMethod.CASH,
      PaymentMethod.OTHER,
    ].includes(dto.paymentMethod)
      ? null
      : reference;
    const requestHash = financialRequestHash({
      actor: actor.userId,
      ...dto,
      amount: centsString(moneyCents(dto.amount, 'payment amount')),
      status,
      currency,
      source: 'MANUAL',
      transactionReference: reference,
    });
    const previous = await this.prisma.payment.findFirst({
      where: { billId: bill.id, idempotencyKey },
      select: PAYMENT_SELECT,
    });
    if (previous) {
      assertSameFinancialRequest(previous.requestHash, requestHash);
      return this.toResponse(previous);
    }

    if (dto.paymentMethod === PaymentMethod.UPI && currency === 'USD') {
      throw new BadRequestException('UPI is unavailable for USD payments');
    }

    if ((bill.status as BillStatus) !== BillStatus.COMPLETED) {
      throw new BadRequestException('Only COMPLETED bills accept payments');
    }

    if (status === PaymentStatus.REFUNDED) assertFinancialAuthority(actor);

    if (status !== PaymentStatus.SUCCESS && status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'New payments may only be created as PENDING or SUCCESS',
      );
    }

    const dueAmount = this.asNumber(bill.dueAmount);

    if (status === PaymentStatus.SUCCESS && dto.amount > dueAmount + 1e-9) {
      throw new BadRequestException('Payment amount exceeds bill due amount');
    }

    const paymentDate = dto.paymentDate
      ? this.resolvePaymentDateInput(
          dto.paymentDate,
          await this.businessTimezone.resolveForUser({
            ...actor,
            franchiseId: bill.salon?.franchiseId ?? actor.franchiseId,
          }),
        )
      : new Date();
    let newlyCreated = false;
    const created = await measureBaseline(
      'transaction:payment-create:ms',
      async () => {
        try {
          return await this.prisma.$transaction(
            async (tx) => {
              // The same row is locked by bill completion/refund and every payment mutation.
              await tx.$queryRaw`SELECT id FROM bills WHERE id = ${bill.id} FOR UPDATE`;
              const retry = await tx.payment.findFirst({
                where: { billId: bill.id, idempotencyKey },
                select: PAYMENT_SELECT,
              });
              if (retry) {
                assertSameFinancialRequest(retry.requestHash, requestHash);
                return retry;
              }
              const locked = await tx.bill.findUniqueOrThrow({
                where: { id: bill.id },
                select: PAYMENT_SELECT.bill.select,
              });
              await this.assertBillPaymentAccess(actor, locked);
              if ((locked.status as BillStatus) !== BillStatus.COMPLETED)
                throw new BadRequestException(
                  'Only COMPLETED bills accept payments',
                );
              if (requireCurrency(locked.currency) !== currency)
                throw new ConflictException(
                  'Bill currency changed; reload and retry',
                );
              if (
                status === PaymentStatus.SUCCESS &&
                moneyCents(dto.amount, 'amount') >
                  moneyCents(locked.dueAmount, 'bill due')
              )
                throw new BadRequestException(
                  'Payment amount exceeds bill due amount',
                );
              const payment = await tx.payment.create({
                data: {
                  currency,
                  idempotencyKey,
                  requestHash,
                  provider,
                  providerTransactionId,
                  billId: bill.id,
                  amount: this.decimalString(dto.amount),
                  paymentMethod: dto.paymentMethod,
                  transactionReference:
                    trimOrNull(dto.transactionReference) ?? null,
                  paymentDate,
                  status,
                  notes: trimOrNull(dto.notes) ?? null,
                },
                select: PAYMENT_SELECT,
              });
              newlyCreated = true;

              if (status === PaymentStatus.SUCCESS) {
                await this.recalculateBillPayments(tx, bill.id);
                return tx.payment.findUniqueOrThrow({
                  where: { id: payment.id },
                  select: PAYMENT_SELECT,
                });
              }

              return payment;
            },
            { isolationLevel: 'ReadCommitted' },
          );
        } catch (error) {
          if (!isPrismaUniqueError(error)) throw error;
          const retry = await this.prisma.payment.findFirst({
            where: { billId: bill.id, idempotencyKey },
            select: PAYMENT_SELECT,
          });
          if (retry) {
            assertSameFinancialRequest(retry.requestHash, requestHash);
            return retry;
          }
          throw new ConflictException(
            'Transaction reference is already recorded',
          );
        }
      },
    );
    if (!newlyCreated) return this.toResponse(created);
    await this.audit.record({
      userId: actor.userId,
      salonId: created.bill.salonId,
      action: 'PAYMENT_CREATED',
      entityType: 'Payment',
      entityId: created.id,
      newData: {
        billId: created.billId,
        amount: this.decimalString(created.amount),
        status: created.status,
        paymentMethod: created.paymentMethod,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(created);
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdatePaymentStatusDto,
    ctx: RequestContext,
  ): Promise<PaymentRecord> {
    this.assertPaymentWriter(actor);
    const existing = await this.requirePayment(id);
    await this.assertPaymentAccess(actor, existing);

    const current = existing.status as PaymentStatus;
    const next = dto.status;
    if (
      next === PaymentStatus.REFUNDED ||
      (current === PaymentStatus.SUCCESS && next !== current)
    )
      assertFinancialAuthority(actor);

    if (current === next) {
      return this.toResponse(existing);
    }

    const allowed = PAYMENT_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot change payment status from ${current} to ${next}`,
      );
    }

    if ((existing.bill.status as BillStatus) !== BillStatus.COMPLETED) {
      throw new BadRequestException(
        'Only payments on COMPLETED bills can change status',
      );
    }

    if (next === PaymentStatus.SUCCESS && current !== PaymentStatus.SUCCESS) {
      const dueAmount = this.asNumber(existing.bill.dueAmount);
      const amount = this.asNumber(existing.amount);
      if (amount > dueAmount + 1e-9) {
        throw new BadRequestException('Payment amount exceeds bill due amount');
      }
    }

    let statusChanged = false;
    const updated = await measureBaseline('transaction:payment-update:ms', () =>
      this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM bills WHERE id = ${existing.billId} FOR UPDATE`;
          const locked = await tx.payment.findUniqueOrThrow({
            where: { id: existing.id },
            select: PAYMENT_SELECT,
          });
          await this.assertPaymentAccess(actor, locked);
          if ((locked.status as PaymentStatus) === next) return locked;
          if ((locked.status as PaymentStatus) !== current)
            throw new ConflictException(
              'Payment status changed; reload and retry',
            );
          if (locked.provider && !locked.provider.startsWith('MANUAL'))
            throw new BadRequestException(
              'Provider payment states require trusted server verification',
            );
          if ((locked.bill.status as BillStatus) !== BillStatus.COMPLETED)
            throw new BadRequestException(
              'Only payments on COMPLETED bills can change status',
            );
          if (
            next === PaymentStatus.SUCCESS &&
            moneyCents(locked.amount, 'payment amount') >
              moneyCents(locked.bill.dueAmount, 'bill due')
          )
            throw new BadRequestException(
              'Payment amount exceeds bill due amount',
            );
          await tx.payment.update({
            where: { id: existing.id },
            data: { status: next },
          });
          statusChanged = true;

          if (
            current === PaymentStatus.SUCCESS ||
            next === PaymentStatus.SUCCESS
          ) {
            await this.recalculateBillPayments(tx, existing.billId);
          }

          return tx.payment.findUniqueOrThrow({
            where: { id: existing.id },
            select: PAYMENT_SELECT,
          });
        },
        { isolationLevel: 'ReadCommitted' },
      ),
    );
    if (!statusChanged) return this.toResponse(updated);
    await this.audit.record({
      userId: actor.userId,
      salonId: updated.bill.salonId,
      action: 'PAYMENT_STATUS_CHANGED',
      entityType: 'Payment',
      entityId: updated.id,
      oldData: { status: current },
      newData: { status: next },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated);
  }

  private assertPaymentWriter(actor: AuthenticatedUser): void {
    if (
      ![
        RoleCode.SUPER_ADMIN,
        RoleCode.ADMIN,
        RoleCode.MANAGER,
        RoleCode.STAFF,
      ].includes(actor.role)
    ) {
      throw new ForbiddenException(
        'Customers cannot record or settle payments',
      );
    }
  }

  private async recalculateBillPayments(
    tx: TxClient,
    billId: string,
  ): Promise<void> {
    const bill = await tx.bill.findUnique({
      where: { id: billId },
      select: {
        id: true,
        total: true,
        status: true,
        salonId: true,
        customerId: true,
        enrollmentPlanId: true,
        enrollmentDetails: true,
        membershipFee: true,
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const successPayments = await tx.payment.findMany({
      where: { billId, status: PaymentStatus.SUCCESS },
      select: { amount: true },
    });

    const paidCents = successPayments.reduce(
      (sum, payment) =>
        sum + moneyCents(payment.amount, 'stored payment amount'),
      0,
    );
    const paidAmount = Number(centsString(paidCents));
    const total = this.asNumber(bill.total);
    if (paidCents > moneyCents(bill.total, 'bill total'))
      throw new ConflictException(
        'Recorded payments exceed bill total; reconciliation required',
      );
    const dueAmount = this.roundMoney(Math.max(0, total - paidAmount));
    const paymentStatus = this.derivePaymentStatus(
      paidAmount,
      dueAmount,
      bill.status as BillStatus,
    );

    await tx.bill.update({
      where: { id: billId },
      data: {
        paidAmount: this.decimalString(paidAmount),
        dueAmount: this.decimalString(dueAmount),
        paymentStatus,
      },
    });
    if ((bill.status as BillStatus) === BillStatus.COMPLETED && dueAmount === 0)
      await completeChosenEnrollment(tx, {
        ...bill,
        paidAmount: centsString(paidCents),
      });
    if (dueAmount > 0)
      await tx.membership.updateMany({
        where: {
          qualifyingBillId: billId,
          status: { in: ['ACTIVE', 'PENDING'] },
        },
        data: { status: 'CANCELLED' },
      });
  }

  private derivePaymentStatus(
    paidAmount: number,
    dueAmount: number,
    billStatus: BillStatus,
  ): BillPaymentStatus {
    if (billStatus === BillStatus.REFUNDED) {
      return BillPaymentStatus.REFUNDED;
    }
    if (paidAmount <= 0) {
      return BillPaymentStatus.UNPAID;
    }
    if (dueAmount <= 0) {
      return BillPaymentStatus.PAID;
    }
    return BillPaymentStatus.PARTIAL;
  }

  private async requirePayment(id: string): Promise<PaymentRow> {
    const record = await this.prisma.payment.findUnique({
      where: { id },
      select: PAYMENT_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Payment not found');
    }

    return record;
  }

  private async assertPaymentAccess(
    user: AuthenticatedUser,
    record: PaymentRow,
  ): Promise<void> {
    await this.assertBillPaymentAccess(user, record.bill);
  }

  private async assertBillPaymentAccess(
    user: AuthenticatedUser,
    bill: { salonId: string; customerId: string },
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      await this.scope.assertOwnCustomerAccess(user, bill.customerId);
      return;
    }

    await this.scope.assertSalonAccess(user, bill.salonId);
  }

  private resolvePaymentDateInput(value: string, timeZone: string): Date {
    if (isDateOnlyString(value)) {
      return calendarDateStartUtc(value, timeZone);
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(
        'paymentDate must be YYYY-MM-DD or an ISO-8601 timestamp',
      );
    }
    return parsed;
  }

  private asNumber(value: Decimalish): number {
    return Number(value.toString());
  }

  private roundMoney(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private decimalString(value: Decimalish): string {
    const amount = this.asNumber(value);
    return Number.isFinite(amount) ? amount.toFixed(2) : value.toString();
  }

  private toResponse(row: PaymentRow): PaymentRecord {
    return {
      currency: requireCurrency(row.currency),
      id: row.id,
      billId: row.billId,
      amount: this.decimalString(row.amount),
      paymentMethod: row.paymentMethod as PaymentMethod,
      transactionReference: row.transactionReference,
      paymentDate: row.paymentDate,
      status: row.status as PaymentStatus,
      notes: row.notes,
      salonId: row.bill.salonId,
      customerId: row.bill.customerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
