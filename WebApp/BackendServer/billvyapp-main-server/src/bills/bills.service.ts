import { measureBaseline } from '../common/performance/baseline';
import {
  moneyCents,
  centsString,
  lineTaxCents,
  requireRequestKey,
  financialRequestHash,
  assertSameFinancialRequest,
  requireCurrency,
} from '../common/security/financial-integrity';
import {
  priceMembershipLines,
  requireBenefitConfiguration,
} from './membership-pricing';
import { requireBillCoupon } from './bill-coupon';
import { ValidateBillCouponDto } from './dto/validate-bill-coupon.dto';
import {
  completeChosenEnrollment,
  requireEnrollmentPlan,
  enrollmentConsent,
} from './bill-enrollment';
import type { Prisma } from '../generated/prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import {
  BILL_STATUS_TRANSITIONS,
  BillItemType,
  BillPaymentStatus,
  BillStatus,
} from '../common/enums/bill-status.enum';
import { PaymentMethod, PaymentStatus } from '../common/enums/payment.enum';
import {
  assertFinancialAuthority,
  assertPermission,
} from '../common/security/access-policy';
import { RoleCode } from '../common/enums/role.enum';
import type { RequestContext } from '../common/http/request-context';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  normalizePagination,
  paginated,
  PaginatedResult,
} from '../common/pagination/pagination';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import { ScopeService } from '../common/scope/scope.service';
import { BusinessTimezoneService } from '../common/datetime/business-timezone.service';
import {
  businessCalendarRangeToUtc,
  calendarDateInTimeZone,
  formatBillDateApi,
  isDateOnlyString,
  parseDateOnlyUtc,
} from '../common/datetime/datetime';
import { trimOrNull } from '../common/strings';
import { PrismaService } from '../prisma/prisma.service';
import { BillQueryDto } from './dto/bill-query.dto';
import { CreateBillDto, CreateBillItemDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { UpdateBillStatusDto } from './dto/update-bill-status.dto';

/** Minimal interactive-transaction client surface used by stock deduction. */
type TxClient = {
  inventory: PrismaService['inventory'];
  stockMovement: PrismaService['stockMovement'];
  bill: PrismaService['bill'];
  billItem: PrismaService['billItem'];
};
const BILL_ITEM_SELECT = {
  membershipDiscount: true,
  membershipUnits: true,
  membershipBenefit: true,
  id: true,
  itemType: true,
  serviceId: true,
  productId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  discount: true,
  taxRate: true,
  taxAmount: true,
  total: true,
} as const;

const BILL_PAYMENT_SUMMARY_SELECT = {
  id: true,
  amount: true,
  paymentMethod: true,
  status: true,
  paymentDate: true,
} as const;

const BILL_SELECT = {
  currency: true,
  requestHash: true,
  qualifyingMembership: { select: { id: true, couponCode: true } },
  enrollmentPlanId: true,
  enrollmentDetails: true,
  membershipFee: true,
  enrollmentPlanName: true,
  appliedMembershipId: true,
  appliedMembership: { select: { couponCode: true } },
  id: true,
  salonId: true,
  customerId: true,
  billNumber: true,
  billDate: true,
  subtotal: true,
  discount: true,
  tax: true,
  roundOff: true,
  total: true,
  paidAmount: true,
  dueAmount: true,
  status: true,
  paymentStatus: true,
  notes: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
  salon: {
    select: {
      id: true,
      name: true,
    },
  },
  customer: {
    select: {
      id: true,
      customerCode: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
    },
  },
  items: {
    orderBy: [
      { linePosition: 'asc' },
      { createdAt: 'asc' },
      { id: 'asc' },
    ] as import('../generated/prisma/client').Prisma.BillItemOrderByWithRelationInput[],
    select: BILL_ITEM_SELECT,
  },
  payments: {
    orderBy: { paymentDate: 'desc' as const },
    select: BILL_PAYMENT_SUMMARY_SELECT,
  },
} as const;

type Decimalish = { toString(): string } | string | number;

type BillItemRow = {
  membershipDiscount?: Decimalish;
  membershipUnits?: number;
  membershipBenefit?: boolean;
  id: string;
  itemType: string;
  serviceId: string | null;
  productId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: Decimalish;
  discount: Decimalish;
  taxRate: Decimalish;
  taxAmount: Decimalish;
  total: Decimalish;
};

type BillPaymentSummaryRow = {
  id: string;
  amount: Decimalish;
  paymentMethod: string;
  status: string;
  paymentDate: Date;
};

type BillRow = {
  currency?: string;
  qualifyingMembership?: { id: string; couponCode: string } | null;
  enrollmentPlanId?: string | null;
  enrollmentDetails?: Prisma.JsonValue | null;
  membershipFee?: Decimalish;
  enrollmentPlanName?: string | null;
  appliedMembershipId?: string | null;
  appliedMembership?: { couponCode: string } | null;
  id: string;
  salonId: string;
  customerId: string;
  billNumber: string;
  billDate: Date;
  subtotal: Decimalish;
  discount: Decimalish;
  tax: Decimalish;
  roundOff: Decimalish;
  total: Decimalish;
  paidAmount: Decimalish;
  dueAmount: Decimalish;
  status: string;
  paymentStatus: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  salon?: {
    id: string;
    name: string;
  } | null;
  customer?: {
    id: string;
    customerCode: string;
    user?: {
      firstName: string | null;
      lastName: string | null;
      phone: string | null;
      email: string | null;
    } | null;
  } | null;
  items: BillItemRow[];
  payments: BillPaymentSummaryRow[];
};

export type BillRecord = {
  currency: 'INR' | 'USD';
  enrolledCouponCode?: string | null;
  enrollmentPlanId?: string | null;
  membershipFee?: string;
  enrollmentPlanName?: string | null;
  couponCode: string | null;
  id: string;
  salonId: string;
  customerId: string;
  billNumber: string;
  billDate: string;
  subtotal: string;
  discount: string;
  tax: string;
  roundOff: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  status: BillStatus;
  paymentStatus: BillPaymentStatus;
  notes: string | null;
  createdBy: string | null;
  salon?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    customerCode: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  items: Array<{
    id: string;
    itemType: BillItemType;
    serviceId: string | null;
    productId: string | null;
    description: string | null;
    quantity: number;
    unitPrice: string;
    discount: string;
    taxRate: string;
    taxAmount: string;
    total: string;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    paymentMethod: PaymentMethod;
    status: PaymentStatus;
    paymentDate: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

type ComputedLine = {
  membershipDiscount?: string;
  membershipUnits?: number;
  membershipBenefit?: boolean;
  itemType: BillItemType;
  serviceId: string | null;
  productId: string | null;
  description: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  lineNet: number;
  taxAmountNum: number;
};

type CatalogService = {
  id: string;
  salonId: string;
  name: string;
  price: Decimalish;
  taxRate: Decimalish;
  isActive: boolean;
};

type CatalogProduct = {
  id: string;
  salonId: string;
  name: string;
  sellingPrice: Decimalish;
  taxRate: Decimalish;
  isActive: boolean;
};

@Injectable()
export class BillsService {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly scope: ScopeService,
    private readonly audit: AuditService,
    private readonly businessTimezone: BusinessTimezoneService,
  ) {}

  async list(
    user: AuthenticatedUser,
    query: BillQueryDto,
  ): Promise<PaginatedResult<BillRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const timeZone = await this.businessTimezone.resolveForUser(user);
    const filters: Record<string, unknown>[] = [this.scope.salonScope(user)];

    if (user.role === RoleCode.CUSTOMER) {
      filters.push({ customerId: await this.scope.requireOwnCustomerId(user) });
    } else if (query.customerId) {
      filters.push({ customerId: query.customerId });
    }

    if (query.salonId) {
      if (user.role !== RoleCode.CUSTOMER) {
        await this.scope.assertSalonAccess(user, query.salonId);
      }
      filters.push({ salonId: query.salonId });
    }

    if (query.status) {
      filters.push({ status: query.status });
    }
    if (query.paymentStatus) {
      filters.push({ paymentStatus: query.paymentStatus });
    }

    if (query.dateFrom || query.dateTo) {
      try {
        const range = businessCalendarRangeToUtc(
          query.dateFrom,
          query.dateTo,
          timeZone,
        );
        filters.push({ billDate: range });
      } catch (error) {
        throw new BadRequestException(
          error instanceof Error ? error.message : 'Invalid date range',
        );
      }
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      filters.push({
        OR: [
          { billNumber: { contains: search } },
          { customer: { customerCode: { contains: search } } },
          { customer: { user: { firstName: { contains: search } } } },
          { customer: { user: { lastName: { contains: search } } } },
          { customer: { user: { phone: { contains: search } } } },
        ],
      });
    }

    const where = { AND: filters };

    const [rows, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        select: BILL_SELECT,
        orderBy: [{ billDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.bill.count({ where }),
    ]);

    return paginated(
      rows.map((row) => this.toResponse(row, timeZone)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<BillRecord> {
    const record = await this.requireBill(id);
    await this.assertBillAccess(user, record);
    const timeZone = await this.businessTimezone.resolveForUser(user);
    return this.toResponse(record, timeZone);
  }

  async validateCoupon(actor: AuthenticatedUser, dto: ValidateBillCouponDto) {
    await this.scope.assertSalonAccess(actor, dto.salonId);
    await this.scope.assertCustomerAccess(actor, dto.customerId);
    await this.requireActiveCustomer(dto.customerId);
    const coupon = await requireBillCoupon(this.prisma, dto);
    requireBenefitConfiguration(coupon);
    const usage = await this.prisma.membershipRedemption.aggregate({
      where: {
        membershipId: coupon.membershipId,
        benefitType: 'FREE_SERVICES',
      },
      _sum: { quantity: true },
    });
    const visits = await this.prisma.membershipRedemption.groupBy({
      by: ['billId'],
      where: { membershipId: coupon.membershipId },
    });
    const usedUnits = usage._sum.quantity ?? 0;
    return {
      couponUsageLimit: coupon.couponUsageLimit,
      usedVisits: visits.length,
      remainingVisits:
        coupon.couponUsageLimit == null
          ? null
          : Math.max(0, coupon.couponUsageLimit - visits.length),
      termsAndConditions: coupon.termsAndConditions,
      benefitType: coupon.benefitType,
      discountPercentage: coupon.discountPercentage,
      freeServiceLimit: coupon.freeServiceLimit,
      freeServicesPerVisit: coupon.freeServicesPerVisit,
      usedUnits,
      remainingUnits:
        coupon.benefitType === 'FREE_SERVICES' && !coupon.freeServicesPerVisit
          ? Math.max(0, (coupon.freeServiceLimit ?? 0) - usedUnits)
          : null,
      couponCode: coupon.couponCode,
      customer: coupon.customer,
      membershipName: coupon.membershipName,
      benefits: coupon.benefits,
      eligibleServices: coupon.eligibleServices,
      startDate: coupon.startDate,
      endDate: coupon.endDate,
    };
  }

  async membershipOffers(actor: AuthenticatedUser, dto: CreateBillDto) {
    assertPermission(actor, 'BillsController.membershipOffers');
    await this.scope.assertSalonAccess(actor, dto.salonId);
    const customerId = await this.resolveCustomerId(actor, dto.customerId);
    await this.scope.assertCustomerAccess(actor, customerId);
    const lines = await this.buildLines(dto.items, dto.salonId, actor);
    this.assertTotalOverrides(actor, dto, lines);
    return this.prisma.$transaction(
      async (tx) => {
        const priced = dto.couponCode
          ? await this.priceCoupon(
              tx,
              dto.couponCode,
              dto.salonId,
              customerId,
              lines,
            )
          : null;
        const totals = this.computeBillTotals(priced?.lines ?? lines, {
          discount: dto.discount,
        });
        const plans = await tx.membershipPlan.findMany({
          where: {
            salonId: dto.salonId,
            isActive: true,
            enrollmentThreshold: { not: null, lte: totals.total },
          },
          select: {
            id: true,
            name: true,
            price: true,
            durationDays: true,
            benefits: true,
            termsAndConditions: true,
            couponUsageLimit: true,
            eligibleServices: { select: { id: true, name: true } },
          },
          orderBy: [{ enrollmentThreshold: 'desc' }, { name: 'asc' }],
        });
        return {
          qualifyingAmount: totals.total,
          plans: plans.map((p) => ({ ...p, price: p.price.toString() })),
        };
      },
      { isolationLevel: 'ReadCommitted' },
    );
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateBillDto,
    ctx: RequestContext,
  ): Promise<BillRecord> {
    assertPermission(actor, 'BillsController.create');
    const idempotencyKey = requireRequestKey(dto.idempotencyKey);
    const requestHash = financialRequestHash({ actor: actor.userId, ...dto });
    const salonId = dto.salonId;
    const salonFranchiseId = await this.requireActiveSalon(salonId);
    await this.scope.assertSalonAccess(actor, salonId);

    const customerId = await this.resolveCustomerId(actor, dto.customerId);
    await this.requireActiveCustomer(customerId);
    await this.scope.assertCustomerAccess(actor, customerId);

    const timeZone = await this.businessTimezone.resolveForUser({
      ...actor,
      franchiseId: salonFranchiseId ?? actor.franchiseId,
    });
    const billDate = this.resolveBillDateInput(dto.billDate, timeZone);
    const previous = await this.prisma.bill.findFirst({
      where: { salonId, idempotencyKey },
      select: BILL_SELECT,
    });
    if (previous) {
      assertSameFinancialRequest(previous.requestHash, requestHash);
      return this.toResponse(previous, timeZone);
    }
    const salonCurrency = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { franchise: { select: { preferences: true } } },
    });
    const preferences = salonCurrency?.franchise?.preferences as Record<
      string,
      unknown
    > | null;
    const currency = requireCurrency(preferences?.currency);

    let lines = await this.buildLines(dto.items, salonId, actor);
    this.assertTotalOverrides(actor, dto, lines);
    let totals = this.computeBillTotals(lines, dto);

    try {
      const created = await measureBaseline('transaction:bill-create:ms', () =>
        this.prisma.$transaction(
          async (tx) => {
            const priced = dto.couponCode
              ? await this.priceCoupon(
                  tx,
                  dto.couponCode,
                  salonId,
                  customerId,
                  lines,
                )
              : null;
            const coupon = priced?.coupon ?? null;
            if (priced) {
              lines = priced.lines;
              totals = this.computeBillTotals(lines, {
                ...dto,
                tax: undefined,
              });
            }
            const selected = dto.enrollmentPlanId
              ? await requireEnrollmentPlan(
                  tx,
                  dto.enrollmentPlanId,
                  salonId,
                  totals.total,
                )
              : null;
            const enrollmentDetails = selected
              ? enrollmentConsent(dto.enrollmentDetails, selected)
              : undefined;
            const membershipFee = selected?.price.toString() ?? '0.00';
            totals.total = (
              Number(totals.total) + Number(membershipFee)
            ).toFixed(2);
            moneyCents(totals.total, 'bill total including membership');
            return tx.bill.create({
              data: {
                currency,
                idempotencyKey,
                requestHash,
                enrollmentPlanId: selected?.id ?? null,
                enrollmentDetails,
                membershipFee,
                enrollmentPlanName: selected?.name ?? null,
                salonId,
                customerId,
                appliedMembershipId: coupon?.membershipId ?? null,
                billNumber: dto.billNumber?.trim() || this.nextBillNumber(),
                billDate,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                roundOff: totals.roundOff,
                total: totals.total,
                paidAmount: '0.00',
                dueAmount: totals.total,
                status: BillStatus.DRAFT,
                paymentStatus: BillPaymentStatus.UNPAID,
                notes: trimOrNull(dto.notes) ?? null,
                createdBy: actor.userId,
                items: {
                  create: lines.map((line, linePosition) => ({
                    linePosition,
                    membershipDiscount: line.membershipDiscount ?? '0.00',
                    membershipUnits: line.membershipUnits ?? 0,
                    membershipBenefit: line.membershipBenefit ?? false,
                    itemType: line.itemType,
                    serviceId: line.serviceId,
                    productId: line.productId,
                    description: line.description,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    discount: line.discount,
                    taxRate: line.taxRate,
                    taxAmount: line.taxAmount,
                    total: line.total,
                  })),
                },
              },
              select: BILL_SELECT,
            });
          },
          { isolationLevel: 'ReadCommitted' },
        ),
      );

      await this.audit.record({
        userId: actor.userId,
        salonId: created.salonId,
        action: 'BILL_CREATED',
        entityType: 'Bill',
        entityId: created.id,
        newData: {
          billNumber: created.billNumber,
          customerId: created.customerId,
          salonId: created.salonId,
          total: this.decimalString(created.total),
          appliedMembershipId: created.appliedMembershipId ?? null,
          status: created.status,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created, timeZone);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        const previous = await this.prisma.bill.findFirst({
          where: { salonId, idempotencyKey },
          select: BILL_SELECT,
        });
        if (previous) {
          assertSameFinancialRequest(previous.requestHash, requestHash);
          return this.toResponse(previous, timeZone);
        }
        throw new ConflictException('Bill number already exists in this salon');
      }
      throw error;
    }
  }

  async update(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateBillDto,
    ctx: RequestContext,
  ): Promise<BillRecord> {
    assertPermission(actor, 'BillsController.update');
    const existing = await this.requireBill(id);
    await this.assertBillAccess(actor, existing);

    if ((existing.status as BillStatus) !== BillStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT bills can be updated');
    }

    if (dto.customerId !== undefined) {
      await this.requireActiveCustomer(dto.customerId);
      await this.scope.assertCustomerAccess(actor, dto.customerId);
    }

    if (
      dto.customerId &&
      dto.customerId !== existing.customerId &&
      existing.enrollmentPlanId &&
      dto.enrollmentPlanId !== null &&
      !dto.enrollmentDetails
    )
      throw new BadRequestException(
        'Confirm enrollment details for the new customer or remove enrollment',
      );
    const customerId = dto.customerId ?? existing.customerId;
    const salonId = existing.salonId;
    const timeZone = await this.businessTimezone.resolveForUser(actor);

    let lines: ComputedLine[];
    if (dto.items) {
      lines = await this.buildLines(dto.items, salonId, actor);
    } else {
      lines = this.unadjustedLines(existing.items);
    }

    this.assertTotalOverrides(actor, dto, lines, existing);
    let totals = this.computeBillTotals(lines, {
      discount:
        dto.discount !== undefined
          ? dto.discount
          : this.asNumber(existing.discount),
      tax: dto.tax ?? (dto.items ? undefined : this.asNumber(existing.tax)),
      roundOff:
        dto.roundOff !== undefined
          ? dto.roundOff
          : this.asNumber(existing.roundOff),
    });

    try {
      const updated = await measureBaseline('transaction:bill-update:ms', () =>
        this.prisma.$transaction(
          async (tx) => {
            await tx.$queryRaw`SELECT id FROM bills WHERE id = ${existing.id} FOR UPDATE`;
            const locked = await tx.bill.findUniqueOrThrow({
              where: { id: existing.id },
              select: BILL_SELECT,
            });
            if ((locked.status as BillStatus) !== BillStatus.DRAFT)
              throw new BadRequestException('Only DRAFT bills can be updated');
            if (locked.updatedAt.getTime() !== existing.updatedAt.getTime())
              throw new BadRequestException('Bill changed; reload and retry');
            const couponCode =
              dto.couponCode === undefined
                ? existing.appliedMembership?.couponCode
                : dto.couponCode;
            const priced = couponCode
              ? await this.priceCoupon(
                  tx,
                  couponCode,
                  salonId,
                  customerId,
                  lines,
                )
              : null;
            const coupon = priced?.coupon ?? null;
            if (priced) lines = priced.lines;
            totals = this.computeBillTotals(lines, {
              discount: dto.discount ?? this.asNumber(existing.discount),
              tax:
                couponCode || existing.appliedMembershipId
                  ? undefined
                  : (dto.tax ??
                    (dto.items ? undefined : this.asNumber(existing.tax))),
              roundOff: dto.roundOff ?? this.asNumber(existing.roundOff),
            });
            const enrollmentPlanId =
              dto.enrollmentPlanId !== undefined
                ? dto.enrollmentPlanId
                : existing.enrollmentPlanId;
            const selected = enrollmentPlanId
              ? await requireEnrollmentPlan(
                  tx,
                  enrollmentPlanId,
                  salonId,
                  totals.total,
                )
              : null;
            const details = dto.enrollmentDetails ?? existing.enrollmentDetails;
            const enrollmentDetails = selected
              ? enrollmentConsent(
                  details as unknown as import('./dto/create-bill.dto').BillEnrollmentDetailsDto,
                  selected,
                )
              : {};
            const membershipFee = selected?.price.toString() ?? '0.00';
            totals.total = (
              Number(totals.total) + Number(membershipFee)
            ).toFixed(2);
            moneyCents(totals.total, 'bill total including membership');
            if (dto.items || couponCode || existing.appliedMembershipId) {
              await tx.billItem.deleteMany({ where: { billId: existing.id } });
              await tx.billItem.createMany({
                data: lines.map((line, linePosition) => ({
                  linePosition,
                  billId: existing.id,
                  membershipDiscount: line.membershipDiscount ?? '0.00',
                  membershipUnits: line.membershipUnits ?? 0,
                  membershipBenefit: line.membershipBenefit ?? false,
                  itemType: line.itemType,
                  serviceId: line.serviceId,
                  productId: line.productId,
                  description: line.description,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  discount: line.discount,
                  taxRate: line.taxRate,
                  taxAmount: line.taxAmount,
                  total: line.total,
                })),
              });
            }

            if (Number(totals.total) < this.asNumber(existing.paidAmount))
              throw new BadRequestException(
                'Updated total is below collected payments',
              );
            return tx.bill.update({
              where: { id: existing.id },
              data: {
                enrollmentPlanId: selected?.id ?? null,
                enrollmentDetails,
                membershipFee,
                enrollmentPlanName: selected?.name ?? null,
                appliedMembershipId: coupon?.membershipId ?? null,
                customerId,
                billNumber:
                  dto.billNumber !== undefined
                    ? dto.billNumber.trim()
                    : existing.billNumber,
                billDate:
                  dto.billDate !== undefined
                    ? this.resolveBillDateInput(dto.billDate, timeZone)
                    : existing.billDate,
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax,
                roundOff: totals.roundOff,
                total: totals.total,
                dueAmount: this.roundMoney(
                  this.asNumber(totals.total) -
                    this.asNumber(existing.paidAmount),
                ),
                notes:
                  dto.notes !== undefined
                    ? (trimOrNull(dto.notes) ?? null)
                    : existing.notes,
              },
              select: BILL_SELECT,
            });
          },
          { isolationLevel: 'ReadCommitted' },
        ),
      );

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'BILL_UPDATED',
        entityType: 'Bill',
        entityId: updated.id,
        oldData: {
          billNumber: existing.billNumber,
          total: this.decimalString(existing.total),
          appliedMembershipId: existing.appliedMembershipId ?? null,
          customerId: existing.customerId,
        },
        newData: {
          billNumber: updated.billNumber,
          total: this.decimalString(updated.total),
          appliedMembershipId: updated.appliedMembershipId ?? null,
          customerId: updated.customerId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(updated, timeZone);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
        throw new ConflictException('Bill number already exists in this salon');
      }
      throw error;
    }
  }

  async updateStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateBillStatusDto,
    ctx: RequestContext,
  ): Promise<BillRecord> {
    assertPermission(actor, 'BillsController.updateStatus');
    const existing = await this.requireBill(id);
    await this.assertBillAccess(actor, existing);

    const current = existing.status as BillStatus;
    const next = dto.status;
    if (next === BillStatus.REFUNDED) assertFinancialAuthority(actor);

    if (current === next) {
      const timeZone = await this.businessTimezone.resolveForUser(actor);
      return this.toResponse(existing, timeZone);
    }

    const allowed = BILL_STATUS_TRANSITIONS[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot change bill status from ${current} to ${next}`,
      );
    }

    if (
      next === BillStatus.CANCELLED &&
      this.asNumber(existing.paidAmount) > 0
    ) {
      throw new BadRequestException(
        'Cannot cancel a bill that has payments; refund instead',
      );
    }

    const inventoryAudits: Array<{
      inventoryId: string;
      oldOnHand: number;
      oldAvailable: number;
      newOnHand: number;
      newAvailable: number;
    }> = [];

    let enrollment: Awaited<ReturnType<typeof completeChosenEnrollment>> = null;
    let statusChanged = false;
    const updated = await this.prisma.$transaction(
      async (tx) => {
        // Serialize status side effects for simultaneous completion of the same bill.
        await tx.$queryRaw`SELECT id FROM bills WHERE id = ${existing.id} FOR UPDATE`;
        let locked = await tx.bill.findUniqueOrThrow({
          where: { id: existing.id },
          select: BILL_SELECT,
        });
        if ((locked.status as BillStatus) === next) return locked;
        if ((locked.status as BillStatus) !== current)
          throw new BadRequestException(
            'Bill status changed; reload and retry',
          );
        if (
          next === BillStatus.CANCELLED &&
          this.asNumber(locked.paidAmount) > 0
        )
          throw new BadRequestException(
            'Cannot cancel a bill that has payments; refund instead',
          );
        if (next === BillStatus.COMPLETED) {
          if (locked.appliedMembership?.couponCode) {
            const baseLines = this.unadjustedLines(locked.items);
            const priced = await this.priceCoupon(
              tx,
              locked.appliedMembership.couponCode,
              locked.salonId,
              locked.customerId,
              baseLines,
            );
            const totals = this.computeBillTotals(priced.lines, {
              discount: this.asNumber(locked.discount),
              roundOff: this.asNumber(locked.roundOff),
              membershipFee: this.asNumber(locked.membershipFee ?? 0),
            });
            if (Number(totals.total) < this.asNumber(locked.paidAmount))
              throw new BadRequestException(
                'Membership price is below collected payments',
              );
            for (let i = 0; i < priced.lines.length; i++) {
              const line = priced.lines[i];
              const item = locked.items[i];
              await tx.billItem.update({
                where: { id: item.id },
                data: {
                  unitPrice: line.unitPrice,
                  membershipDiscount: line.membershipDiscount,
                  membershipUnits: line.membershipUnits,
                  membershipBenefit: line.membershipBenefit,
                  taxRate: line.taxRate,
                  taxAmount: line.taxAmount,
                  total: line.total,
                },
              });
              if (line.membershipUnits > 0 && line.serviceId) {
                await tx.membershipRedemption.create({
                  data: {
                    membershipPlanId: priced.coupon.membershipPlanId,
                    membershipId: priced.coupon.membershipId,
                    couponCode: priced.coupon.couponCode,
                    billItemId: item.id,
                    billId: locked.id,
                    salonId: locked.salonId,
                    serviceId: line.serviceId,
                    serviceName: priced.coupon.eligibleServices.find(
                      (s) => s.id === line.serviceId,
                    )!.name,
                    quantity: line.membershipUnits,
                    redeemedBy: actor.userId,
                    benefitType: priced.coupon.benefitType,
                    originalAmount: (
                      Number(line.unitPrice) * line.quantity
                    ).toFixed(2),
                    discountAmount: line.membershipDiscount,
                    finalAmount: line.lineNet.toFixed(2),
                  },
                });
              }
            }
            await tx.bill.update({ where: { id: locked.id }, data: totals });
            locked = await tx.bill.findUniqueOrThrow({
              where: { id: locked.id },
              select: BILL_SELECT,
            });
          }
          const adjustments = await this.deductProductStock(
            tx,
            locked,
            actor.userId,
          );
          inventoryAudits.push(...adjustments);
        }

        if (next === BillStatus.REFUNDED) {
          await tx.membership.updateMany({
            where: {
              qualifyingBillId: locked.id,
              status: { in: ['ACTIVE', 'PENDING'] },
            },
            data: { status: 'CANCELLED' },
          });
          // A full bill refund must remove its collections from payment-based revenue.
          await tx.payment.updateMany({
            where: { billId: locked.id, status: PaymentStatus.SUCCESS },
            data: { status: PaymentStatus.REFUNDED },
          });
          await tx.payment.updateMany({
            where: { billId: locked.id, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.CANCELLED },
          });
        }
        if (next === BillStatus.CANCELLED)
          await tx.payment.updateMany({
            where: { billId: locked.id, status: PaymentStatus.PENDING },
            data: { status: PaymentStatus.CANCELLED },
          });
        const paidAmount =
          next === BillStatus.REFUNDED ? 0 : this.asNumber(locked.paidAmount);
        const total = this.asNumber(locked.total);
        const dueAmount =
          next === BillStatus.REFUNDED
            ? 0
            : this.roundMoney(total - paidAmount);
        const paymentStatus = this.derivePaymentStatus(
          paidAmount,
          dueAmount,
          next,
        );

        const completed = await tx.bill.update({
          where: { id: existing.id },
          data: {
            status: next,
            paidAmount: this.decimalString(paidAmount),
            dueAmount: this.decimalString(dueAmount),
            paymentStatus,
          },
          select: BILL_SELECT,
        });
        if (next === BillStatus.COMPLETED)
          enrollment = await completeChosenEnrollment(tx, completed);
        statusChanged = true;
        return enrollment
          ? {
              ...completed,
              qualifyingMembership: {
                id: enrollment.id,
                couponCode: enrollment.couponCode,
              },
            }
          : completed;
      },
      { isolationLevel: 'ReadCommitted' },
    );

    if (!statusChanged)
      return this.toResponse(
        updated,
        await this.businessTimezone.resolveForUser(actor),
      );
    if (enrollment) {
      const issued = enrollment as NonNullable<
        Awaited<ReturnType<typeof completeChosenEnrollment>>
      >;
      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'MEMBERSHIP_CREATED',
        entityType: 'Membership',
        entityId: issued.id,
        newData: {
          customerId: issued.customerId,
          membershipPlanId: issued.membershipPlanId,
          qualifyingBillId: updated.id,
          couponCode: issued.couponCode,
          status: issued.status,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }

    for (const adj of inventoryAudits) {
      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'INVENTORY_ADJUSTED',
        entityType: 'Inventory',
        entityId: adj.inventoryId,
        oldData: {
          quantityOnHand: adj.oldOnHand,
          availableQuantity: adj.oldAvailable,
        },
        newData: {
          quantityOnHand: adj.newOnHand,
          availableQuantity: adj.newAvailable,
          reason: 'BILL_COMPLETED',
          billId: updated.id,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }

    await this.audit.record({
      userId: actor.userId,
      salonId: updated.salonId,
      action: 'BILL_STATUS_CHANGED',
      entityType: 'Bill',
      entityId: updated.id,
      oldData: { status: current },
      newData: { status: next },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(
      updated,
      await this.businessTimezone.resolveForUser(actor),
    );
  }

  private async deductProductStock(
    tx: TxClient,
    bill: BillRow,
    actorUserId: string,
  ): Promise<
    Array<{
      inventoryId: string;
      oldOnHand: number;
      oldAvailable: number;
      newOnHand: number;
      newAvailable: number;
    }>
  > {
    const adjustments: Array<{
      inventoryId: string;
      oldOnHand: number;
      oldAvailable: number;
      newOnHand: number;
      newAvailable: number;
    }> = [];

    const productLines = bill.items.filter(
      (item) =>
        (item.itemType as BillItemType) === BillItemType.PRODUCT &&
        item.productId != null,
    );

    for (const line of productLines) {
      const productId = line.productId as string;
      const qty = line.quantity;

      const inventory = await tx.inventory.findUnique({
        where: {
          salonId_productId: {
            salonId: bill.salonId,
            productId,
          },
        },
        select: {
          id: true,
          availableQuantity: true,
          quantityOnHand: true,
          averageCost: true,
        },
      });

      if (!inventory) {
        throw new BadRequestException(
          `No inventory record for product ${productId}`,
        );
      }

      if (inventory.availableQuantity < qty || inventory.quantityOnHand < qty) {
        throw new BadRequestException(
          `Insufficient stock for product ${productId}`,
        );
      }

      const newOnHand = inventory.quantityOnHand - qty;
      const newAvailable = inventory.availableQuantity - qty;

      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          quantityOnHand: newOnHand,
          availableQuantity: newAvailable,
        },
      });

      await tx.stockMovement.create({
        data: {
          salonId: bill.salonId,
          productId,
          movementType: 'SALE',
          quantity: qty,
          referenceType: 'BILL',
          referenceId: bill.id,
          unitCost: inventory.averageCost,
          balanceAfter: newOnHand,
          notes: `Sale for bill ${bill.billNumber}`,
          createdBy: actorUserId,
        },
      });

      adjustments.push({
        inventoryId: inventory.id,
        oldOnHand: inventory.quantityOnHand,
        oldAvailable: inventory.availableQuantity,
        newOnHand,
        newAvailable,
      });
    }

    return adjustments;
  }
  private async requireBill(id: string): Promise<BillRow> {
    const record = await this.prisma.bill.findUnique({
      where: { id },
      select: BILL_SELECT,
    });

    if (!record) {
      throw new NotFoundException('Bill not found');
    }

    return record;
  }

  private async assertBillAccess(
    user: AuthenticatedUser,
    record: Pick<BillRow, 'customerId' | 'salonId'>,
  ): Promise<void> {
    if (user.role === RoleCode.CUSTOMER) {
      await this.scope.assertOwnCustomerAccess(user, record.customerId);
      return;
    }

    await this.scope.assertSalonAccess(user, record.salonId);
  }

  private async resolveCustomerId(
    actor: AuthenticatedUser,
    requestedCustomerId?: string,
  ): Promise<string> {
    if (actor.role === RoleCode.CUSTOMER) {
      return this.scope.requireOwnCustomerId(actor);
    }

    if (!requestedCustomerId) {
      throw new BadRequestException('customerId is required');
    }

    return requestedCustomerId;
  }

  private async requireActiveSalon(
    salonId: string,
  ): Promise<string | undefined> {
    const salon = await this.prisma.salon.findUnique({
      where: { id: salonId },
      select: { id: true, isActive: true, franchiseId: true },
    });

    if (!salon) {
      throw new NotFoundException('Salon not found');
    }
    if (!salon.isActive) {
      throw new BadRequestException('Salon is inactive');
    }
    return salon.franchiseId;
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

  private unadjustedLines(items: BillItemRow[]): ComputedLine[] {
    return items.map((item) => {
      const lineNet = this.roundMoney(
        Number(item.unitPrice) * item.quantity - Number(item.discount),
      );
      const taxAmountNum = this.roundMoney(
        (lineNet * Number(item.taxRate)) / 100,
      );
      return {
        ...item,
        itemType: item.itemType as BillItemType,
        unitPrice: this.decimalString(item.unitPrice),
        discount: this.decimalString(item.discount),
        taxRate: this.decimalString(item.taxRate),
        membershipDiscount: '0.00',
        membershipUnits: 0,
        membershipBenefit: false,
        lineNet,
        taxAmountNum,
        taxAmount: taxAmountNum.toFixed(2),
        total: (lineNet + taxAmountNum).toFixed(2),
      };
    });
  }

  private async priceCoupon(
    tx: import('../generated/prisma/client').Prisma.TransactionClient,
    couponCode: string,
    salonId: string,
    customerId: string,
    lines: ComputedLine[],
  ) {
    // Lock before the first membership/usage read. All spenders serialize on this row.
    await tx.$queryRaw`SELECT m.id FROM memberships m JOIN membership_plans p ON p.id = m.membershipPlanId
      WHERE m.couponCode = ${couponCode.trim().toUpperCase()} AND m.customerId = ${customerId} AND p.salonId = ${salonId} FOR UPDATE`;
    const coupon = await requireBillCoupon(tx, {
      couponCode,
      salonId,
      customerId,
    });
    requireBenefitConfiguration(coupon);
    const usage = await tx.membershipRedemption.aggregate({
      where: {
        membershipId: coupon.membershipId,
        benefitType: 'FREE_SERVICES',
      },
      _sum: { quantity: true },
    });
    const visits = await tx.membershipRedemption.groupBy({
      by: ['billId'],
      where: { membershipId: coupon.membershipId },
    });
    const eligible = new Set(coupon.eligibleServices.map((s) => s.id));
    const ids = lines
      .filter(
        (l) =>
          l.itemType === BillItemType.SERVICE &&
          l.serviceId &&
          eligible.has(l.serviceId),
      )
      .map((l) => l.serviceId!);
    const services = ids.length
      ? await tx.service.findMany({
          where: { id: { in: ids }, salonId, isActive: true },
          select: { id: true, price: true, taxRate: true },
        })
      : [];
    const catalog = new Map(
      services.map((service) => [
        service.id,
        {
          unitPrice: service.price.toString(),
          taxRate: service.taxRate.toString(),
        },
      ]),
    );
    const authoritative = lines.map((line) => {
      if (!line.serviceId || !eligible.has(line.serviceId)) return line;
      const catalogPrice = catalog.get(line.serviceId);
      if (catalogPrice === undefined)
        throw new BadRequestException(
          'Membership service is inactive or outside the salon',
        );
      return { ...line, ...catalogPrice };
    });
    return {
      coupon,
      lines: priceMembershipLines(
        authoritative,
        coupon,
        usage._sum.quantity ?? 0,
        visits.length,
      ),
    };
  }

  private async buildLines(
    items: CreateBillItemDto[],
    salonId: string,
    actor: AuthenticatedUser,
  ): Promise<ComputedLine[]> {
    if (!Array.isArray(items) || items.length < 1 || items.length > 1000)
      throw new BadRequestException('Bills require between 1 and 1000 lines');
    const serviceIds = [
      ...new Set(
        items
          .filter((i) => i.itemType === BillItemType.SERVICE)
          .map((i) => i.serviceId)
          .filter((id): id is string => !!id),
      ),
    ];
    const productIds = [
      ...new Set(
        items
          .filter((i) => i.itemType === BillItemType.PRODUCT)
          .map((i) => i.productId)
          .filter((id): id is string => !!id),
      ),
    ];

    for (const item of items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 2_147_483_647
      )
        throw new BadRequestException(
          'Quantity must be a positive supported integer',
        );
      if (![BillItemType.SERVICE, BillItemType.PRODUCT].includes(item.itemType))
        throw new BadRequestException('Unsupported bill item type');
      if (item.itemType === BillItemType.SERVICE) {
        if (!item.serviceId || item.productId) {
          throw new BadRequestException(
            'SERVICE lines require serviceId and must not set productId',
          );
        }
      } else if (item.itemType === BillItemType.PRODUCT) {
        if (!item.productId || item.serviceId) {
          throw new BadRequestException(
            'PRODUCT lines require productId and must not set serviceId',
          );
        }
      }
    }

    const [services, products] = await Promise.all([
      serviceIds.length
        ? this.prisma.service.findMany({
            where: { id: { in: serviceIds } },
            select: {
              id: true,
              salonId: true,
              name: true,
              price: true,
              taxRate: true,
              isActive: true,
            },
          })
        : Promise.resolve([] as CatalogService[]),
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              salonId: true,
              name: true,
              sellingPrice: true,
              taxRate: true,
              isActive: true,
            },
          })
        : Promise.resolve([] as CatalogProduct[]),
    ]);

    if (services.length !== serviceIds.length) {
      throw new NotFoundException('Service not found');
    }
    if (products.length !== productIds.length) {
      throw new NotFoundException('Product not found');
    }

    const serviceMap = new Map(services.map((s) => [s.id, s]));
    const productMap = new Map(products.map((p) => [p.id, p]));

    const lines: ComputedLine[] = [];

    for (const item of items) {
      let unitPrice: number;
      let taxRate: number;
      let description: string | null = trimOrNull(item.description) ?? null;
      let serviceId: string | null = null;
      let productId: string | null = null;

      if (item.itemType === BillItemType.SERVICE) {
        const service = serviceMap.get(item.serviceId as string);
        if (!service) throw new NotFoundException('Service not found');
        if (service.salonId !== salonId) {
          throw new BadRequestException(
            'Service does not belong to the selected salon',
          );
        }
        if (!service.isActive) {
          throw new BadRequestException('Service is inactive');
        }
        serviceId = service.id;
        unitPrice =
          item.unitPrice !== undefined
            ? item.unitPrice
            : this.asNumber(service.price);
        taxRate =
          item.taxRate !== undefined
            ? item.taxRate
            : this.asNumber(service.taxRate);
        if (!description) description = service.name;
      } else {
        const product = productMap.get(item.productId as string);
        if (!product) throw new NotFoundException('Product not found');
        if (product.salonId !== salonId) {
          throw new BadRequestException(
            'Product does not belong to the selected salon',
          );
        }
        if (!product.isActive) {
          throw new BadRequestException('Product is inactive');
        }
        productId = product.id;
        unitPrice =
          item.unitPrice !== undefined
            ? item.unitPrice
            : this.asNumber(product.sellingPrice);
        taxRate =
          item.taxRate !== undefined
            ? item.taxRate
            : this.asNumber(product.taxRate);
        if (!description) description = product.name;
      }

      const catalog =
        item.itemType === BillItemType.SERVICE
          ? serviceMap.get(item.serviceId!)
          : productMap.get(item.productId!);
      const catalogPrice =
        item.itemType === BillItemType.SERVICE
          ? this.asNumber((catalog as CatalogService).price)
          : this.asNumber((catalog as CatalogProduct).sellingPrice);
      if (
        unitPrice !== catalogPrice ||
        taxRate !== this.asNumber(catalog!.taxRate) ||
        (item.discount ?? 0) !== 0
      ) {
        assertFinancialAuthority(actor);
      }
      const discount = item.discount ?? 0;
      const grossCents = moneyCents(unitPrice, 'unitPrice') * item.quantity;
      centsString(grossCents);
      const netCents = grossCents - moneyCents(discount, 'line discount');
      const lineNet = netCents / 100;
      if (lineNet < 0) {
        throw new BadRequestException('Line discount exceeds line amount');
      }
      const taxAmountNum = lineTaxCents(netCents, taxRate) / 100;
      const lineTotal = this.roundMoney(lineNet + taxAmountNum);
      centsString(netCents + moneyCents(taxAmountNum, 'line tax'));

      lines.push({
        itemType: item.itemType,
        serviceId,
        productId,
        description,
        quantity: item.quantity,
        unitPrice: this.decimalString(unitPrice),
        discount: this.decimalString(discount),
        taxRate: this.decimalString(taxRate),
        taxAmount: this.decimalString(taxAmountNum),
        total: this.decimalString(lineTotal),
        lineNet,
        taxAmountNum,
      });
    }

    return lines;
  }

  private assertTotalOverrides(
    actor: AuthenticatedUser,
    dto: {
      discount?: number;
      tax?: number;
      roundOff?: number;
      items?: unknown;
    },
    lines: ComputedLine[],
    existing?: BillRow,
  ) {
    const defaultTax = this.roundMoney(
      lines.reduce((sum, line) => sum + line.taxAmountNum, 0),
    );
    if (
      (dto.discount !== undefined &&
        dto.discount !== (existing ? this.asNumber(existing.discount) : 0)) ||
      (dto.tax !== undefined &&
        dto.tax !==
          (existing && !dto.items
            ? this.asNumber(existing.tax)
            : defaultTax)) ||
      (dto.roundOff !== undefined &&
        dto.roundOff !== (existing ? this.asNumber(existing.roundOff) : 0))
    ) {
      assertFinancialAuthority(actor);
    }
  }

  private computeBillTotals(
    lines: ComputedLine[],
    opts: {
      discount?: number;
      tax?: number;
      roundOff?: number;
      membershipFee?: number;
    },
  ): {
    subtotal: string;
    discount: string;
    tax: string;
    roundOff: string;
    total: string;
  } {
    const subtotalCents = lines.reduce(
      (sum, line) => sum + moneyCents(line.lineNet, 'line subtotal'),
      0,
    );
    const subtotalNum = Number(centsString(subtotalCents));
    const lineTaxSum = Number(
      centsString(
        lines.reduce(
          (sum, line) => sum + moneyCents(line.taxAmountNum, 'line tax'),
          0,
        ),
      ),
    );
    const discount = opts.discount ?? 0;
    const tax = opts.tax !== undefined ? opts.tax : lineTaxSum;
    const roundOff = opts.roundOff ?? 0;
    moneyCents(discount, 'bill discount');
    moneyCents(tax, 'bill tax');
    moneyCents(roundOff, 'roundOff', true);
    moneyCents(opts.membershipFee ?? 0, 'membershipFee');
    if (discount > subtotalNum)
      throw new BadRequestException('Bill discount exceeds eligible subtotal');
    if (Math.abs(roundOff) > 0.5)
      throw new BadRequestException(
        'Rounding adjustment must be within half a currency unit',
      );
    const total = Number(
      centsString(
        subtotalCents -
          moneyCents(discount, 'discount') +
          moneyCents(tax, 'tax') +
          moneyCents(roundOff, 'roundOff', true) +
          moneyCents(opts.membershipFee ?? 0, 'membershipFee'),
      ),
    );

    if (total < 0) {
      throw new BadRequestException('Bill total cannot be negative');
    }
    moneyCents(total, 'bill total');

    return {
      subtotal: this.decimalString(subtotalNum),
      discount: this.decimalString(discount),
      tax: this.decimalString(tax),
      roundOff: this.decimalString(roundOff),
      total: this.decimalString(total),
    };
  }

  private derivePaymentStatus(
    paidAmount: number,
    dueAmount: number,
    billStatus: BillStatus,
  ): BillPaymentStatus {
    if (billStatus === BillStatus.REFUNDED) {
      return BillPaymentStatus.REFUNDED;
    }
    if (billStatus === BillStatus.COMPLETED && dueAmount <= 0)
      return BillPaymentStatus.PAID;
    if (paidAmount <= 0) {
      return BillPaymentStatus.UNPAID;
    }
    if (dueAmount <= 0) {
      return BillPaymentStatus.PAID;
    }
    return BillPaymentStatus.PARTIAL;
  }

  private nextBillNumber(): string {
    return `BILL-${Date.now()}`;
  }

  private resolveBillDateInput(
    value: string | undefined,
    timeZone: string,
  ): Date {
    // billDate is a DATE_ONLY sentinel in DATETIME — store UTC midnight of the
    // calendar label (not an absolute instant). Historical rows are never rewritten.
    if (value === undefined || value === null || value === '') {
      return parseDateOnlyUtc(calendarDateInTimeZone(timeZone));
    }
    if (!isDateOnlyString(value)) {
      throw new BadRequestException('billDate must be YYYY-MM-DD');
    }
    return parseDateOnlyUtc(value);
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

  private toResponse(row: BillRow, timeZone: string): BillRecord {
    return {
      currency: requireCurrency(row.currency),
      enrolledCouponCode: row.qualifyingMembership?.couponCode ?? null,
      enrollmentPlanId: row.enrollmentPlanId ?? null,
      membershipFee: this.decimalString(row.membershipFee ?? 0),
      enrollmentPlanName: row.enrollmentPlanName ?? null,
      couponCode: row.appliedMembership?.couponCode ?? null,
      id: row.id,
      salonId: row.salonId,
      customerId: row.customerId,
      billNumber: row.billNumber,
      billDate: formatBillDateApi(row.billDate, timeZone),
      subtotal: this.decimalString(row.subtotal),
      discount: this.decimalString(row.discount),
      tax: this.decimalString(row.tax),
      roundOff: this.decimalString(row.roundOff),
      total: this.decimalString(row.total),
      paidAmount: this.decimalString(row.paidAmount),
      dueAmount: this.decimalString(row.dueAmount),
      status: row.status as BillStatus,
      paymentStatus: row.paymentStatus as BillPaymentStatus,
      notes: row.notes,
      createdBy: row.createdBy,
      salon: row.salon
        ? {
            id: row.salon.id,
            name: row.salon.name,
          }
        : undefined,
      customer: row.customer
        ? {
            id: row.customer.id,
            customerCode: row.customer.customerCode,
            firstName: row.customer.user?.firstName ?? null,
            lastName: row.customer.user?.lastName ?? null,
            phone: row.customer.user?.phone ?? null,
            email: row.customer.user?.email ?? null,
          }
        : undefined,
      items: row.items.map((item) => ({
        membershipDiscount: this.decimalString(item.membershipDiscount ?? 0),
        membershipUnits: item.membershipUnits ?? 0,
        membershipBenefit: item.membershipBenefit ?? false,
        id: item.id,
        itemType: item.itemType as BillItemType,
        serviceId: item.serviceId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: this.decimalString(item.unitPrice),
        discount: this.decimalString(item.discount),
        taxRate: this.decimalString(item.taxRate),
        taxAmount: this.decimalString(item.taxAmount),
        total: this.decimalString(item.total),
      })),
      payments: (row.payments ?? []).map((payment) => ({
        id: payment.id,
        amount: this.decimalString(payment.amount),
        paymentMethod: payment.paymentMethod as PaymentMethod,
        status: payment.status as PaymentStatus,
        paymentDate: payment.paymentDate,
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
