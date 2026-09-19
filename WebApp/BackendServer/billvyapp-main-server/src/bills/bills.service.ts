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
    orderBy: { createdAt: 'asc' as const },
    select: BILL_ITEM_SELECT,
  },
  payments: {
    orderBy: { paymentDate: 'desc' as const },
    select: BILL_PAYMENT_SUMMARY_SELECT,
  },
} as const;

type Decimalish = { toString(): string } | string | number;

type BillItemRow = {
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
  ) {}

  async list(
    user: AuthenticatedUser,
    query: BillQueryDto,
  ): Promise<PaginatedResult<BillRecord>> {
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
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

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (query.dateFrom) dateFilter.gte = this.parseDateOnly(query.dateFrom);
    if (query.dateTo) {
      dateFilter.lte = this.endOfUtcDay(this.parseDateOnly(query.dateTo));
    }
    if (dateFilter.gte || dateFilter.lte) {
      filters.push({ billDate: dateFilter });
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

    const [rows, total] = await this.prisma.$transaction([
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
      rows.map((row) => this.toResponse(row)),
      total,
      page,
      limit,
    );
  }

  async findOne(user: AuthenticatedUser, id: string): Promise<BillRecord> {
    const record = await this.requireBill(id);
    await this.assertBillAccess(user, record);
    return this.toResponse(record);
  }

  async create(
    actor: AuthenticatedUser,
    dto: CreateBillDto,
    ctx: RequestContext,
  ): Promise<BillRecord> {
    const salonId = dto.salonId;
    await this.requireActiveSalon(salonId);
    await this.scope.assertSalonAccess(actor, salonId);

    const customerId = await this.resolveCustomerId(actor, dto.customerId);
    await this.requireActiveCustomer(customerId);
    await this.scope.assertCustomerAccess(actor, customerId);

    const lines = await this.buildLines(dto.items, salonId);
    const totals = this.computeBillTotals(lines, dto);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        return tx.bill.create({
          data: {
            salonId,
            customerId,
            billNumber: dto.billNumber?.trim() || this.nextBillNumber(),
            billDate: dto.billDate
              ? this.parseDateOnly(dto.billDate)
              : new Date(),
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
              create: lines.map((line) => ({
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
      });

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
          status: created.status,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(created);
    } catch (error) {
      if (isPrismaUniqueError(error)) {
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
    const existing = await this.requireBill(id);
    await this.assertBillAccess(actor, existing);

    if ((existing.status as BillStatus) !== BillStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT bills can be updated');
    }

    if (dto.customerId !== undefined) {
      await this.requireActiveCustomer(dto.customerId);
      await this.scope.assertCustomerAccess(actor, dto.customerId);
    }

    const customerId = dto.customerId ?? existing.customerId;
    const salonId = existing.salonId;

    let lines: ComputedLine[];
    if (dto.items) {
      lines = await this.buildLines(dto.items, salonId);
    } else {
      lines = existing.items.map((item) => {
        const lineNet =
          this.asNumber(item.quantity) * this.asNumber(item.unitPrice) -
          this.asNumber(item.discount);
        return {
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
          lineNet,
          taxAmountNum: this.asNumber(item.taxAmount),
        };
      });
    }

    const totals = this.computeBillTotals(lines, {
      discount:
        dto.discount !== undefined
          ? dto.discount
          : this.asNumber(existing.discount),
      tax: dto.tax !== undefined ? dto.tax : this.asNumber(existing.tax),
      roundOff:
        dto.roundOff !== undefined
          ? dto.roundOff
          : this.asNumber(existing.roundOff),
    });

    try {
      const updated = await this.prisma.$transaction(async (tx) => {
        if (dto.items) {
          await tx.billItem.deleteMany({ where: { billId: existing.id } });
          await tx.billItem.createMany({
            data: lines.map((line) => ({
              billId: existing.id,
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

        return tx.bill.update({
          where: { id: existing.id },
          data: {
            customerId,
            billNumber:
              dto.billNumber !== undefined
                ? dto.billNumber.trim()
                : existing.billNumber,
            billDate:
              dto.billDate !== undefined
                ? this.parseDateOnly(dto.billDate)
                : existing.billDate,
            subtotal: totals.subtotal,
            discount: totals.discount,
            tax: totals.tax,
            roundOff: totals.roundOff,
            total: totals.total,
            dueAmount: this.roundMoney(
              this.asNumber(totals.total) - this.asNumber(existing.paidAmount),
            ),
            notes:
              dto.notes !== undefined
                ? (trimOrNull(dto.notes) ?? null)
                : existing.notes,
          },
          select: BILL_SELECT,
        });
      });

      await this.audit.record({
        userId: actor.userId,
        salonId: updated.salonId,
        action: 'BILL_UPDATED',
        entityType: 'Bill',
        entityId: updated.id,
        oldData: {
          billNumber: existing.billNumber,
          total: this.decimalString(existing.total),
          customerId: existing.customerId,
        },
        newData: {
          billNumber: updated.billNumber,
          total: this.decimalString(updated.total),
          customerId: updated.customerId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return this.toResponse(updated);
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
    const existing = await this.requireBill(id);
    await this.assertBillAccess(actor, existing);

    const current = existing.status as BillStatus;
    const next = dto.status;

    if (current === next) {
      return this.toResponse(existing);
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

    const updated = await this.prisma.$transaction(async (tx) => {
      if (next === BillStatus.COMPLETED) {
        const adjustments = await this.deductProductStock(
          tx,
          existing,
          actor.userId,
        );
        inventoryAudits.push(...adjustments);
      }

      const paidAmount = this.asNumber(existing.paidAmount);
      const total = this.asNumber(existing.total);
      const dueAmount = this.roundMoney(total - paidAmount);
      const paymentStatus = this.derivePaymentStatus(
        paidAmount,
        dueAmount,
        next,
      );

      return tx.bill.update({
        where: { id: existing.id },
        data: {
          status: next,
          dueAmount: this.decimalString(dueAmount),
          paymentStatus,
        },
        select: BILL_SELECT,
      });
    });

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

    return this.toResponse(updated);
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

  private async buildLines(
    items: CreateBillItemDto[],
    salonId: string,
  ): Promise<ComputedLine[]> {
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

      const discount = item.discount ?? 0;
      const lineNet = this.roundMoney(item.quantity * unitPrice - discount);
      if (lineNet < 0) {
        throw new BadRequestException('Line discount exceeds line amount');
      }
      const taxAmountNum = this.roundMoney((lineNet * taxRate) / 100);
      const lineTotal = this.roundMoney(lineNet + taxAmountNum);

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

  private computeBillTotals(
    lines: ComputedLine[],
    opts: { discount?: number; tax?: number; roundOff?: number },
  ): {
    subtotal: string;
    discount: string;
    tax: string;
    roundOff: string;
    total: string;
  } {
    const subtotalNum = this.roundMoney(
      lines.reduce((sum, line) => sum + line.lineNet, 0),
    );
    const lineTaxSum = this.roundMoney(
      lines.reduce((sum, line) => sum + line.taxAmountNum, 0),
    );
    const discount = opts.discount ?? 0;
    const tax = opts.tax !== undefined ? opts.tax : lineTaxSum;
    const roundOff = opts.roundOff ?? 0;
    const total = this.roundMoney(subtotalNum - discount + tax + roundOff);

    if (total < 0) {
      throw new BadRequestException('Bill total cannot be negative');
    }

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

  private formatDateOnly(value: Date): string {
    return value.toISOString().slice(0, 10);
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

  private toResponse(row: BillRow): BillRecord {
    return {
      id: row.id,
      salonId: row.salonId,
      customerId: row.customerId,
      billNumber: row.billNumber,
      billDate: this.formatDateOnly(row.billDate),
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
