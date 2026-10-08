import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/scope/scope.service';
import { RoleCode } from '../common/enums/role.enum';
import { Prisma } from '../generated/prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  UpdateExpenseCategoryDto,
} from './dto/expense.dto';

const manager: AuthenticatedUser = {
  userId: 'user',
  email: 'test@example.com',
  role: RoleCode.MANAGER,
  franchiseId: 'business',
  salonId: 'branch',
  sessionId: null,
};
const admin = { ...manager, role: RoleCode.ADMIN, salonId: null };
const input: CreateExpenseDto = {
  categoryId: 'category',
  amount: 25000,
  expenseDate: '2026-10-08',
  paymentMethod: 'BANK_TRANSFER',
};

describe('ExpensesService tenant and financial rules', () => {
  const expense = {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  };
  const category = {
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const salon = { findUnique: jest.fn() };
  const tx = {
    expense,
    expenseCategory: category,
    auditLog: { create: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const prisma = { ...tx, salon, $transaction: jest.fn() };
  let service: ExpensesService;

  beforeEach(() => {
    jest.resetAllMocks();
    salon.findUnique.mockResolvedValue({
      franchiseId: 'business',
      isActive: true,
      franchise: { isActive: true },
    });
    tx.$queryRaw.mockResolvedValue([{ id: 'business', isActive: true }]);
    category.findFirst.mockResolvedValue({ parentId: null, isActive: true });
    expense.findFirst.mockResolvedValue(null);
    expense.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ ...data, id: 'expense' }),
    );
    prisma.$transaction.mockImplementation((work: unknown) =>
      typeof work === 'function'
        ? (work as (client: typeof tx) => Promise<unknown>)(tx)
        : Promise.all(work as Promise<unknown>[]),
    );
    service = new ExpensesService(
      prisma as unknown as PrismaService,
      new ScopeService(prisma as unknown as PrismaService),
    );
  });

  it('derives business, branch, creator and sequential number from trusted data', async () => {
    expense.findFirst.mockResolvedValue({ expenseNumber: 'EXP-2026-000041' });
    const result = await service.create(manager, input, {});
    expect(result).toMatchObject({
      businessId: 'business',
      branchId: 'branch',
      createdBy: 'user',
      expenseNumber: 'EXP-2026-000042',
      amount: '25000.00',
      expenseDate: '2026-10-08',
    });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'EXPENSE_CREATED',
          entityId: 'expense',
        }) as unknown,
      }),
    );
  });

  it('rejects a manager changing branches', async () => {
    await expect(
      service.create(manager, { ...input, branchId: 'other' }, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(expense.create).not.toHaveBeenCalled();
  });
  it('rejects every Super Admin mutation before accessing any records', async () => {
    const superAdmin = {
      ...admin,
      role: RoleCode.SUPER_ADMIN,
      franchiseId: null,
    };
    await expect(service.create(superAdmin, input, {})).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      service.update(superAdmin, 'expense', { amount: 1 }, {}),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.createCategory(superAdmin, { name: 'New' }, {}),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.updateCategory(superAdmin, 'category', { name: 'New' }, {}),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.categoryStatus(superAdmin, 'category', false, {}),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(expense.create).not.toHaveBeenCalled();
    expect(category.update).not.toHaveBeenCalled();
  });
  it('keeps Super Admin franchise and salon read filters', async () => {
    expense.findMany.mockResolvedValue([]);
    expense.count.mockResolvedValue(0);
    await service.list(
      { ...admin, role: RoleCode.SUPER_ADMIN, franchiseId: null },
      { businessId: 'selected-franchise', branchId: 'selected-salon' },
    );
    expect(expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'selected-franchise',
          branchId: 'selected-salon',
        }) as unknown,
      }),
    );
  });
  it('rejects a forged business even on an authorized branch', async () => {
    await expect(
      service.create(manager, { ...input, businessId: 'other' }, {}),
    ).rejects.toThrow(BadRequestException);
  });
  it('rejects an inconsistent authenticated manager branch/business pair', async () => {
    salon.findUnique.mockResolvedValue({ franchiseId: 'other' });
    await expect(service.list(manager, {})).rejects.toThrow(ForbiddenException);
  });
  it('requires an administrator to choose a branch', async () => {
    await expect(service.create(admin, input, {})).rejects.toThrow(
      'branchId is required',
    );
  });
  it('hides expense IDs outside the administrator business', async () => {
    await expect(service.findOne(admin, 'foreign')).rejects.toThrow(
      NotFoundException,
    );
    expect(expense.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign', businessId: 'business' },
      }),
    );
  });
  it('refuses a foreign business filter', async () => {
    await expect(
      service.summary(admin, { businessId: 'foreign' }),
    ).rejects.toThrow(ForbiddenException);
    expect(expense.aggregate).not.toHaveBeenCalled();
  });
  it('calculates summaries with the same manager scope and date filters', async () => {
    expense.aggregate.mockResolvedValue({
      _count: { _all: 1 },
      _sum: { amount: new Prisma.Decimal('12.30') },
    });
    expense.groupBy.mockResolvedValue([]);
    expect(
      await service.summary(manager, {
        dateFrom: '2026-10-01',
        dateTo: '2026-10-08',
      }),
    ).toMatchObject({ count: 1, amount: '12.30' });
    expect(expense.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: 'business',
          branchId: 'branch',
          expenseDate: {
            gte: new Date('2026-10-01T00:00:00Z'),
            lte: new Date('2026-10-08T00:00:00Z'),
          },
        }) as unknown,
      }),
    );
  });
  it.each([0, -1, 1.234, 10000000000, NaN])(
    'rejects invalid money %s',
    async (amount) => {
      await expect(
        service.create(manager, { ...input, amount }, {}),
      ).rejects.toThrow(BadRequestException);
      expect(expense.create).not.toHaveBeenCalled();
    },
  );
  it.each(['2026-02-30', '2025-02-29', '2026-13-01'])(
    'rejects impossible calendar date %s',
    async (expenseDate) => {
      await expect(
        service.create(manager, { ...input, expenseDate }, {}),
      ).rejects.toThrow(BadRequestException);
    },
  );
  it('rejects inverted report date ranges', async () => {
    await expect(
      service.summary(admin, { dateFrom: '2026-10-08', dateTo: '2026-10-01' }),
    ).rejects.toThrow(BadRequestException);
  });
  it.each([
    'https://example.com/receipt.exe',
    'javascript:receipt.png',
    '../secret.pdf',
    '//example.com/receipt.pdf',
  ])('rejects unsafe/unsupported receipt %s', async (receiptUrl) => {
    await expect(
      service.create(manager, { ...input, receiptUrl }, {}),
    ).rejects.toThrow(BadRequestException);
  });
  it('rejects categories from a different business', async () => {
    category.findFirst.mockResolvedValue(null);
    await expect(service.create(manager, input, {})).rejects.toThrow(
      'Category must belong',
    );
  });
  it('rejects an inactive ancestor even when the selected child is active', async () => {
    category.findFirst
      .mockResolvedValueOnce({ parentId: 'parent', isActive: true })
      .mockResolvedValueOnce({ parentId: null, isActive: false });
    await expect(service.create(manager, input, {})).rejects.toThrow(
      'must be active',
    );
  });
  it('prevents category cycles during reparenting', async () => {
    category.findFirst
      .mockResolvedValueOnce({ id: 'root', businessId: 'business' })
      .mockResolvedValueOnce({ parentId: 'root', isActive: true });
    category.findUniqueOrThrow.mockResolvedValue({
      id: 'root',
      businessId: 'business',
      parentId: null,
      name: 'Root',
    });
    await expect(
      service.updateCategory(admin, 'root', { parentId: 'child' }, {}),
    ).rejects.toThrow('cannot contain a cycle');
  });
  it('prevents duplicate root categories despite nullable parent uniqueness in MySQL', async () => {
    category.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.createCategory(admin, { name: 'Utilities' }, {}),
    ).rejects.toThrow(ConflictException);
    expect(category.create).not.toHaveBeenCalled();
  });
  it('prevents managers from changing category definitions', async () => {
    await expect(
      service.createCategory(manager, { name: 'New' }, {}),
    ).rejects.toThrow(ForbiddenException);
  });
  it('rejects exhausted numbering instead of generating duplicates', async () => {
    expense.findFirst.mockResolvedValue({ expenseNumber: 'EXP-2026-999999' });
    await expect(service.create(manager, input, {})).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('Expense API input contract', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
  const valid = {
    ...input,
    categoryId: '00000000-0000-4000-8000-000000000001',
  };
  it.each(['createdBy', 'expenseNumber', 'status'])(
    'rejects client-controlled %s',
    async (field) => {
      await expect(
        pipe.transform(
          { ...valid, [field]: 'forged' },
          { type: 'body', metatype: CreateExpenseDto },
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );
  it.each(['businessId', 'branchId', 'createdBy', 'expenseNumber'])(
    'keeps %s immutable in PATCH',
    async (field) => {
      await expect(
        pipe.transform(
          { [field]: 'forged' },
          { type: 'body', metatype: UpdateExpenseDto },
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );
  it.each(['amount', 'categoryId', 'expenseDate', 'paymentMethod'])(
    'rejects null for required %s in PATCH',
    async (field) => {
      await expect(
        pipe.transform(
          { [field]: null },
          { type: 'body', metatype: UpdateExpenseDto },
        ),
      ).rejects.toThrow(BadRequestException);
    },
  );
  it('allows clearing nullable expense fields and category parent', async () => {
    expect(
      await pipe.transform(
        { receiptUrl: null, vendorName: null },
        { type: 'body', metatype: UpdateExpenseDto },
      ),
    ).toMatchObject({ receiptUrl: null, vendorName: null });
    expect(
      await pipe.transform(
        { parentId: null },
        { type: 'body', metatype: UpdateExpenseCategoryDto },
      ),
    ).toMatchObject({ parentId: null });
  });
});
