import {
  BadRequestException,
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
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';

const PAYMENT_SELECT = {
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

type TxClient = {
  payment: PrismaService['payment'];
  bill: PrismaService['bill'];
};

@Injectable()
export class PaymentsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: PaymentQueryDto,
  ): Promise<PaginatedResult<PaymentRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
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
    }
    if (query.paymentMethod) {
      filters.push({ paymentMethod: query.paymentMethod });
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) dateFilter.gte = this.parseDateOnly(query.dateFrom);
    if (query.dateTo) {
      dateFilter.lte = this.endOfUtcDay(this.parseDateOnly(query.dateTo));
    }
    if (dateFilter.gte || dateFilter.lte) {
      filters.push({ paymentDate: dateFilter });
    }

    const where = { AND: filters };

    const [rows, total] = await this.prisma.$transaction([
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
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const bill = await this.prisma.bill.findUnique({
      where: { id: dto.billId },
      select: {
        id: true,
        salonId: true,
        customerId: true,
        status: true,
        total: true,
        paidAmount: true,
        dueAmount: true,
        paymentStatus: true,
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    await this.assertBillPaymentAccess(actor, bill);

    if ((bill.status as BillStatus) !== BillStatus.COMPLETED) {
      throw new BadRequestException('Only COMPLETED bills accept payments');
    }

    const status = dto.status ?? PaymentStatus.SUCCESS;

    if (status !== PaymentStatus.SUCCESS && status !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'New payments may only be created as PENDING or SUCCESS',
      );
    }

    const dueAmount = this.asNumber(bill.dueAmount);

    if (status === PaymentStatus.SUCCESS && dto.amount > dueAmount + 1e-9) {
      throw new BadRequestException('Payment amount exceeds bill due amount');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          billId: bill.id,
          amount: this.decimalString(dto.amount),
          paymentMethod: dto.paymentMethod,
          transactionReference: trimOrNull(dto.transactionReference) ?? null,
          paymentDate: dto.paymentDate
            ? this.parseDateOnly(dto.paymentDate)
            : new Date(),
          status,
          notes: trimOrNull(dto.notes) ?? null,
        },
        select: PAYMENT_SELECT,
      });

      if (status === PaymentStatus.SUCCESS) {
        await this.recalculateBillPayments(tx, bill.id);
        return tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
          select: PAYMENT_SELECT,
        });
      }

      return payment;
    });

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
    const existing = await this.requirePayment(id);
    await this.assertPaymentAccess(actor, existing);

    const current = existing.status as PaymentStatus;
    const next = dto.status;

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

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: existing.id },
        data: { status: next },
      });

      if (current === PaymentStatus.SUCCESS || next === PaymentStatus.SUCCESS) {
        await this.recalculateBillPayments(tx, existing.billId);
      }

      return tx.payment.findUniqueOrThrow({
        where: { id: existing.id },
        select: PAYMENT_SELECT,
      });
    });

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
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const successPayments = await tx.payment.findMany({
      where: { billId, status: PaymentStatus.SUCCESS },
      select: { amount: true },
    });

    const paidAmount = this.roundMoney(
      successPayments.reduce(
        (sum, payment) => sum + this.asNumber(payment.amount),
        0,
      ),
    );
    const total = this.asNumber(bill.total);
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

  private parseDateOnly(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private endOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
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
