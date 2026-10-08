import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { RoleCode } from '../common/enums/role.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import type { RequestContext } from '../common/http/request-context';
import {
  normalizePagination,
  paginated,
} from '../common/pagination/pagination';
import { isDateOnlyString } from '../common/datetime/datetime';
import { trimOrNull } from '../common/strings';
import { isPrismaUniqueError } from '../common/prisma/prisma-errors';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseQueryDto,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
  ExpenseCategoryQueryDto,
} from './dto/expense.dto';

const EXPENSE_INCLUDE = {
  business: { select: { id: true, name: true, code: true } },
  branch: { select: { id: true, name: true, code: true } },
  category: { select: { id: true, name: true, parentId: true } },
  createdByUser: { select: { id: true, firstName: true, lastName: true } },
} as const;
type ExpenseRow = Prisma.ExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;
type Tx = Prisma.TransactionClient;

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  private assertWrite(user: AuthenticatedUser, category = false) {
    if (
      user.role === RoleCode.ADMIN ||
      (!category && user.role === RoleCode.MANAGER)
    )
      return;
    throw new ForbiddenException('Your account has read-only expense access');
  }

  /** Identity is freshly loaded by JwtStrategy; branch/business pairing is also verified here. */
  private async access(
    user: AuthenticatedUser,
  ): Promise<{ businessId?: string; branchId?: string }> {
    if (user.role === RoleCode.SUPER_ADMIN) return {};
    if (user.role === RoleCode.ADMIN && user.franchiseId)
      return { businessId: user.franchiseId };
    if (user.role === RoleCode.MANAGER && user.salonId && user.franchiseId) {
      const branch = await this.prisma.salon.findUnique({
        where: { id: user.salonId },
        select: { franchiseId: true },
      });
      if (branch?.franchiseId === user.franchiseId)
        return { businessId: branch.franchiseId, branchId: user.salonId };
    }
    throw new ForbiddenException('Expenses are outside your account scope');
  }

  private async expenseWhere(
    user: AuthenticatedUser,
    query: ExpenseQueryDto,
  ): Promise<Prisma.ExpenseWhereInput> {
    const access = await this.access(user);
    if (
      access.businessId &&
      query.businessId &&
      access.businessId !== query.businessId
    )
      throw new ForbiddenException('Business outside your scope');
    if (query.branchId)
      await this.scope.assertSalonAccess(user, query.branchId);
    const from = query.dateFrom ? this.date(query.dateFrom) : undefined;
    const to = query.dateTo ? this.date(query.dateTo) : undefined;
    if (from && to && from > to)
      throw new BadRequestException('dateFrom must not be after dateTo');
    return {
      businessId: access.businessId ?? query.businessId,
      branchId: access.branchId ?? query.branchId,
      categoryId: query.categoryId,
      createdBy: query.createdBy,
      paymentMethod: query.paymentMethod,
      ...(from || to ? { expenseDate: { gte: from, lte: to } } : {}),
      ...(query.search?.trim()
        ? {
            OR: [
              { expenseNumber: { contains: query.search.trim() } },
              { vendorName: { contains: query.search.trim() } },
              { description: { contains: query.search.trim() } },
            ],
          }
        : {}),
    };
  }

  async list(user: AuthenticatedUser, query: ExpenseQueryDto) {
    const where = await this.expenseWhere(user, query);
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: EXPENSE_INCLUDE,
        orderBy: [
          { expenseDate: 'desc' },
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where }),
    ]);
    return paginated(
      rows.map((row) => this.response(row)),
      total,
      page,
      limit,
    );
  }

  async summary(user: AuthenticatedUser, query: ExpenseQueryDto) {
    const where = await this.expenseWhere(user, query);
    const totalsQuery = this.prisma.expense.aggregate({
      where,
      _count: { _all: true },
      _sum: { amount: true },
    });
    const categoriesQuery = this.prisma.expense.groupBy({
      by: ['categoryId'],
      orderBy: { categoryId: 'asc' },
      where,
      _count: { _all: true },
      _sum: { amount: true },
    });
    const methodsQuery = this.prisma.expense.groupBy({
      by: ['paymentMethod'],
      orderBy: { paymentMethod: 'asc' },
      where,
      _count: { _all: true },
      _sum: { amount: true },
    });
    const [totals, categories, methods] = await this.prisma.$transaction([
      totalsQuery,
      categoriesQuery,
      methodsQuery,
    ]);
    return {
      count: totals._count._all,
      amount: totals._sum.amount?.toFixed(2) ?? '0.00',
      byCategory: categories.map((row) => ({
        categoryId: row.categoryId,
        count: row._count._all,
        amount: row._sum.amount?.toFixed(2) ?? '0.00',
      })),
      byPaymentMethod: methods.map((row) => ({
        paymentMethod: row.paymentMethod,
        count: row._count._all,
        amount: row._sum.amount?.toFixed(2) ?? '0.00',
      })),
    };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const access = await this.access(user);
    const row = await this.prisma.expense.findFirst({
      where: { id, ...access },
      include: EXPENSE_INCLUDE,
    });
    if (!row) throw new NotFoundException('Expense not found');
    return this.response(row);
  }

  async create(
    user: AuthenticatedUser,
    dto: CreateExpenseDto,
    ctx: RequestContext,
  ) {
    this.assertWrite(user);
    const access = await this.access(user);
    const branchId = dto.branchId ?? access.branchId;
    if (!branchId) throw new BadRequestException('branchId is required');
    await this.scope.assertSalonAccess(user, branchId);
    const branch = await this.prisma.salon.findUnique({
      where: { id: branchId },
      select: {
        franchiseId: true,
        isActive: true,
        franchise: { select: { isActive: true } },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    if (access.businessId && branch.franchiseId !== access.businessId)
      throw new ForbiddenException('Business outside your scope');
    if (dto.businessId && dto.businessId !== branch.franchiseId)
      throw new BadRequestException(
        'businessId must match the branch business',
      );
    if (!branch.isActive || !branch.franchise.isActive)
      throw new BadRequestException('Business and branch must be active');
    const expenseDate = this.date(dto.expenseDate);
    const amount = this.money(dto.amount);
    const receiptUrl = this.receipt(dto.receiptUrl) ?? null;
    return this.prisma.$transaction(
      async (tx) => {
        // One existing franchise row acts as a database mutex. No sequence table,
        // counter field or business data is added/changed. Unique index is the final guard.
        await tx.$queryRaw`SELECT id FROM franchises ORDER BY id LIMIT 1 FOR UPDATE`;
        await this.lockBusiness(tx, branch.franchiseId);
        await this.requireCategory(tx, dto.categoryId, branch.franchiseId);
        const prefix = `EXP-${dto.expenseDate.slice(0, 4)}-`;
        const last = await tx.expense.findFirst({
          where: { expenseNumber: { startsWith: prefix } },
          orderBy: { expenseNumber: 'desc' },
          select: { expenseNumber: true },
        });
        const next = last
          ? Number(last.expenseNumber.slice(prefix.length)) + 1
          : 1;
        if (!Number.isSafeInteger(next) || next > 999999)
          throw new ConflictException(
            'Expense number range exhausted for this year',
          );
        const created = await tx.expense.create({
          data: {
            businessId: branch.franchiseId,
            branchId,
            categoryId: dto.categoryId,
            expenseNumber: `${prefix}${String(next).padStart(6, '0')}`,
            amount,
            expenseDate,
            paymentMethod: dto.paymentMethod,
            vendorName: trimOrNull(dto.vendorName) ?? null,
            description: trimOrNull(dto.description) ?? null,
            receiptUrl,
            createdBy: user.userId,
          },
          include: EXPENSE_INCLUDE,
        });
        await this.audit(
          tx,
          user,
          ctx,
          'EXPENSE_CREATED',
          'Expense',
          created.id,
          branchId,
          {
            expenseNumber: created.expenseNumber,
            amount: created.amount.toFixed(2),
          },
        );
        return this.response(created);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async update(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateExpenseDto,
    ctx: RequestContext,
  ) {
    this.assertWrite(user);
    const access = await this.access(user);
    return this.prisma.$transaction(
      async (tx) => {
        const initial = await tx.expense.findFirst({
          where: { id, ...access },
        });
        if (!initial) throw new NotFoundException('Expense not found');
        await this.lockBusiness(tx, initial.businessId);
        const found = await tx.expense.findFirst({ where: { id, ...access } });
        if (!found) throw new NotFoundException('Expense not found');
        const categoryId = dto.categoryId ?? found.categoryId;
        if (dto.categoryId !== undefined)
          await this.requireCategory(tx, categoryId, found.businessId);
        const updated = await tx.expense.update({
          where: { id },
          data: {
            ...(dto.categoryId !== undefined ? { categoryId } : {}),
            ...(dto.amount !== undefined
              ? { amount: this.money(dto.amount) }
              : {}),
            ...(dto.expenseDate !== undefined
              ? { expenseDate: this.date(dto.expenseDate) }
              : {}),
            ...(dto.paymentMethod !== undefined
              ? { paymentMethod: dto.paymentMethod }
              : {}),
            ...(dto.vendorName !== undefined
              ? { vendorName: trimOrNull(dto.vendorName) ?? null }
              : {}),
            ...(dto.description !== undefined
              ? { description: trimOrNull(dto.description) ?? null }
              : {}),
            ...(dto.receiptUrl !== undefined
              ? { receiptUrl: this.receipt(dto.receiptUrl) ?? null }
              : {}),
          },
          include: EXPENSE_INCLUDE,
        });
        await this.audit(
          tx,
          user,
          ctx,
          'EXPENSE_UPDATED',
          'Expense',
          id,
          found.branchId,
          { amount: updated.amount.toFixed(2), categoryId: updated.categoryId },
          { amount: found.amount.toFixed(2), categoryId: found.categoryId },
        );
        return this.response(updated);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }

  async listCategories(
    user: AuthenticatedUser,
    query: ExpenseCategoryQueryDto,
  ) {
    const access = await this.access(user);
    if (
      access.businessId &&
      query.businessId &&
      access.businessId !== query.businessId
    )
      throw new ForbiddenException('Business outside your scope');
    if (query.rootsOnly && query.parentId)
      throw new BadRequestException('Use rootsOnly or parentId, not both');
    const { page, limit, skip } = normalizePagination(query.page, query.limit);
    const where: Prisma.ExpenseCategoryWhereInput = {
      businessId: access.businessId ?? query.businessId,
      parentId: query.rootsOnly ? null : query.parentId,
      isActive: query.isActive,
      ...(query.search?.trim()
        ? { name: { contains: query.search.trim() } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.expenseCategory.findMany({
        where,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: limit,
        skip,
      }),
      this.prisma.expenseCategory.count({ where }),
    ]);
    return paginated(rows, total, page, limit);
  }

  async findCategory(user: AuthenticatedUser, id: string) {
    const access = await this.access(user);
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id, businessId: access.businessId },
    });
    if (!category) throw new NotFoundException('Expense category not found');
    return category;
  }

  async createCategory(
    user: AuthenticatedUser,
    dto: CreateExpenseCategoryDto,
    ctx: RequestContext,
  ) {
    this.assertWrite(user, true);
    const businessId = dto.businessId ?? user.franchiseId;
    if (!businessId) throw new BadRequestException('businessId is required');
    this.scope.assertFranchiseAccess(user, businessId);
    return this.categoryWrite(async (tx) => {
      await this.lockBusiness(tx, businessId);
      if (dto.parentId)
        await this.requireCategory(tx, dto.parentId, businessId);
      const name = this.name(dto.name);
      await this.uniqueCategory(tx, businessId, dto.parentId ?? null, name);
      const created = await tx.expenseCategory.create({
        data: {
          businessId,
          parentId: dto.parentId ?? null,
          name,
          description: trimOrNull(dto.description) ?? null,
        },
      });
      await this.audit(
        tx,
        user,
        ctx,
        'EXPENSE_CATEGORY_CREATED',
        'ExpenseCategory',
        created.id,
        null,
        { name },
      );
      return created;
    });
  }

  async updateCategory(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateExpenseCategoryDto,
    ctx: RequestContext,
  ) {
    this.assertWrite(user, true);
    const existing = await this.findCategory(user, id);
    this.scope.assertFranchiseAccess(user, existing.businessId);
    return this.categoryWrite(async (tx) => {
      await this.lockBusiness(tx, existing.businessId);
      const current = await tx.expenseCategory.findUniqueOrThrow({
        where: { id },
      });
      const parentId =
        dto.parentId !== undefined ? dto.parentId : current.parentId;
      if (parentId)
        await this.requireCategory(tx, parentId, current.businessId, id);
      const name = dto.name !== undefined ? this.name(dto.name) : current.name;
      await this.uniqueCategory(tx, current.businessId, parentId, name, id);
      const updated = await tx.expenseCategory.update({
        where: { id },
        data: {
          name,
          parentId,
          ...(dto.description !== undefined
            ? { description: trimOrNull(dto.description) ?? null }
            : {}),
        },
      });
      await this.audit(
        tx,
        user,
        ctx,
        'EXPENSE_CATEGORY_UPDATED',
        'ExpenseCategory',
        id,
        null,
        { name, parentId },
        { name: current.name, parentId: current.parentId },
      );
      return updated;
    });
  }

  async categoryStatus(
    user: AuthenticatedUser,
    id: string,
    isActive: boolean,
    ctx: RequestContext,
  ) {
    this.assertWrite(user, true);
    const existing = await this.findCategory(user, id);
    this.scope.assertFranchiseAccess(user, existing.businessId);
    return this.categoryWrite(async (tx) => {
      await this.lockBusiness(tx, existing.businessId);
      const updated = await tx.expenseCategory.update({
        where: { id },
        data: { isActive },
      });
      await this.audit(
        tx,
        user,
        ctx,
        'EXPENSE_CATEGORY_STATUS_CHANGED',
        'ExpenseCategory',
        id,
        null,
        { isActive },
      );
      return updated;
    });
  }

  private async categoryWrite<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      if (isPrismaUniqueError(error))
        throw new ConflictException(
          'A category with this name already exists under this parent',
        );
      throw error;
    }
  }

  private async lockBusiness(tx: Tx, id: string) {
    const rows = await tx.$queryRaw<
      { id: string; isActive: boolean }[]
    >`SELECT id, isActive FROM franchises WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException('Business not found');
  }

  private async requireCategory(
    tx: Tx,
    id: string,
    businessId: string,
    forbiddenAncestor?: string,
  ) {
    const visited = new Set<string>();
    let current: string | null = id;
    while (current) {
      if (current === forbiddenAncestor || visited.has(current))
        throw new BadRequestException(
          'Category hierarchy cannot contain a cycle',
        );
      visited.add(current);
      const category: { parentId: string | null; isActive: boolean } | null =
        await tx.expenseCategory.findFirst({
          where: { id: current, businessId },
          select: { parentId: true, isActive: true },
        });
      if (!category)
        throw new BadRequestException(
          'Category must belong to the expense business',
        );
      if (!category.isActive)
        throw new BadRequestException(
          'Category and its parents must be active',
        );
      current = category.parentId;
    }
  }

  private async uniqueCategory(
    tx: Tx,
    businessId: string,
    parentId: string | null,
    name: string,
    except?: string,
  ) {
    const duplicate = await tx.expenseCategory.findFirst({
      where: {
        businessId,
        parentId,
        name,
        ...(except ? { id: { not: except } } : {}),
      },
    });
    if (duplicate)
      throw new ConflictException(
        'A category with this name already exists under this parent',
      );
  }

  private name(value: string) {
    const name = value.trim();
    if (!name) throw new BadRequestException('Category name must not be blank');
    return name;
  }

  private date(value: string): Date {
    if (!isDateOnlyString(value))
      throw new BadRequestException('Enter a valid calendar date (YYYY-MM-DD)');
    return new Date(`${value}T00:00:00.000Z`);
  }

  private money(value: number): Prisma.Decimal {
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 9999999999.99 ||
      !new Prisma.Decimal(value).equals(
        new Prisma.Decimal(value).toDecimalPlaces(2),
      )
    )
      throw new BadRequestException(
        'amount must be positive and have at most two decimal places',
      );
    return new Prisma.Decimal(value);
  }

  private receipt(value?: string | null) {
    const receipt = trimOrNull(value);
    if (!receipt) return receipt;
    if (
      !/\.(pdf|jpe?g|png)(?:[?#].*)?$/i.test(receipt) ||
      receipt.startsWith('//') ||
      /(?:^|\/)\.\.(?:\/|$)/.test(receipt)
    )
      throw new BadRequestException(
        'Receipt must be a PDF, JPG, JPEG or PNG URL/path',
      );
    if (/^[a-z][a-z0-9+.-]*:/i.test(receipt)) {
      let url: URL;
      try {
        url = new URL(receipt);
      } catch {
        throw new BadRequestException('Invalid receipt URL');
      }
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new BadRequestException('Receipt URL must use HTTP(S)');
    }
    return receipt;
  }

  private response(row: ExpenseRow) {
    return {
      ...row,
      amount: row.amount.toFixed(2),
      expenseDate: row.expenseDate.toISOString().slice(0, 10),
    };
  }

  private audit(
    tx: Tx,
    user: AuthenticatedUser,
    ctx: RequestContext,
    action: string,
    entityType: string,
    entityId: string,
    salonId: string | null,
    newData: Prisma.InputJsonObject,
    oldData?: Prisma.InputJsonObject,
  ) {
    return tx.auditLog.create({
      data: {
        userId: user.userId,
        salonId,
        action,
        entityType,
        entityId,
        newData,
        ...(oldData ? { oldData } : {}),
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      },
    });
  }
}
