import { BadRequestException } from '@nestjs/common';
import { RequestValidationPipe } from '../common/security/request-validation.pipe';
import { ProductRecipeDto } from '../services/dto/product-recipe.dto';
import {
  readRecipe,
  snapshotProductUsage,
  consumeServiceProducts,
  syncLowStock,
} from './product-usage';
import type { Prisma } from '../generated/prisma/client';

const containing = (value: Record<string, unknown>): unknown =>
  expect.objectContaining(value);
const recipe = [
  {
    productId: '11111111-1111-4111-8111-111111111111',
    mode: 'PERCENT' as const,
    value: 5,
  },
];
const product = {
  id: recipe[0].productId,
  name: 'XYZ shampoo',
  measurementUnit: 'ML',
  packageSize: '1000',
};
const db = { product: { findMany: jest.fn() } };
const stock = {
  id: 'stock',
  salonId: 'salon',
  productId: product.id,
  quantityOnHand: '5',
  availableQuantity: '5',
  averageCost: '200',
  lowStockNotified: false,
  product: { ...product, reorderLevel: 1 },
  salon: { name: 'Shop', franchiseId: 'franchise' },
};
const tx = {
  $queryRaw: jest.fn(),
  inventory: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  stockMovement: { findUnique: jest.fn(), create: jest.fn() },
  user: { findMany: jest.fn() },
  notification: { createMany: jest.fn() },
};
const client = tx as unknown as Prisma.TransactionClient;
beforeEach(() => {
  jest.resetAllMocks();
  db.product.findMany.mockResolvedValue([product]);
  tx.inventory.findUnique.mockResolvedValue(stock);
  tx.inventory.findUniqueOrThrow.mockResolvedValue(stock);
  tx.inventory.update.mockResolvedValue({ ...stock, quantityOnHand: '4.85' });
  tx.stockMovement.findUnique.mockResolvedValue(null);
  tx.user.findMany.mockResolvedValue([{ id: 'manager' }, { id: 'owner' }]);
});

describe('Service product usage', () => {
  it('uses a full package as percentage denominator regardless of current stock', async () => {
    const result = await snapshotProductUsage(db as never, 'salon', recipe);
    expect(result[0]).toMatchObject({
      packageSize: 1000,
      packagesPerService: 0.05,
      value: 5,
    });
    await consumeServiceProducts(
      client,
      {
        id: 'bill',
        salonId: 'salon',
        billNumber: 'BILL',
        items: [
          {
            id: 'line',
            serviceId: 'hairwash',
            quantity: 3,
            productUsage: result,
          },
        ],
      },
      'manager',
    );
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { id: 'stock' },
      data: {
        quantityOnHand: { decrement: '0.150000' },
        availableQuantity: { decrement: '0.150000' },
      },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith(
      containing({
        data: containing({
          movementType: 'CONSUMPTION',
          quantity: '0.150000',
          eventKey: `consumption:bill:${product.id}`,
          consumptionDetails: [
            containing({
              packagesUsed: 0.15,
              serviceQuantity: 3,
              packageSize: 1000,
            }),
          ],
        }),
      }),
    );
  });
  it('converts fixed ml and gram usage to packages', async () => {
    expect(
      (
        await snapshotProductUsage(db as never, 'salon', [
          { ...recipe[0], mode: 'FIXED', value: 25 },
        ])
      )[0].packagesPerService,
    ).toBe(0.025);
    db.product.findMany.mockResolvedValue([
      { ...product, measurementUnit: 'G', packageSize: '500' },
    ]);
    expect(
      (
        await snapshotProductUsage(db as never, 'salon', [
          { ...recipe[0], mode: 'FIXED', value: 25 },
        ])
      )[0].packagesPerService,
    ).toBe(0.05);
  });
  it('rejects fractional pieces', async () => {
    db.product.findMany.mockResolvedValue([
      { ...product, measurementUnit: 'PCS', packageSize: '1' },
    ]);
    await expect(
      snapshotProductUsage(db as never, 'salon', recipe),
    ).rejects.toThrow('whole pieces');
  });
  it('rejects piece conversions that would make a full package impossible to exhaust exactly', async () => {
    db.product.findMany.mockResolvedValue([
      { ...product, measurementUnit: 'PCS', packageSize: '3' },
    ]);
    await expect(
      snapshotProductUsage(db as never, 'salon', [
        { ...recipe[0], mode: 'FIXED', value: 1 },
      ]),
    ).rejects.toThrow('per piece');
  });
  it('rejects fixed usage when package rounding would substantially over-deduct stock', async () => {
    db.product.findMany.mockResolvedValue([
      { ...product, packageSize: '1000000' },
    ]);
    await expect(
      snapshotProductUsage(db as never, 'salon', [
        { ...recipe[0], mode: 'FIXED', value: 0.0001 },
      ]),
    ).rejects.toThrow('too small');
  });
  it('rejects inactive or foreign products and scopes catalog lookup before snapshotting', async () => {
    db.product.findMany.mockResolvedValue([]);
    await expect(
      snapshotProductUsage(db as never, 'salon', recipe),
    ).rejects.toThrow('another salon');
    expect(db.product.findMany).toHaveBeenCalledWith(
      containing({
        where: { id: { in: [product.id] }, salonId: 'salon', isActive: true },
      }),
    );
  });
  it.each([0, -1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid percentage %s',
    (value) => {
      expect(() => readRecipe([{ ...recipe[0], value }])).toThrow(
        BadRequestException,
      );
    },
  );
  it('rejects duplicate recipe products and more than 30 entries', () => {
    expect(() => readRecipe([...recipe, ...recipe])).toThrow();
    expect(() => readRecipe(Array(31).fill(recipe[0]))).toThrow();
  });
  it('aggregates multiple lines before checking stock', async () => {
    const usage = await snapshotProductUsage(db as never, 'salon', recipe);
    tx.inventory.findUnique.mockResolvedValue({
      ...stock,
      availableQuantity: '0.08',
    });
    await expect(
      consumeServiceProducts(
        client,
        {
          id: 'bill',
          salonId: 'salon',
          billNumber: 'BILL',
          items: [
            { id: 'a', serviceId: 'service', quantity: 1, productUsage: usage },
            { id: 'b', serviceId: 'service', quantity: 1, productUsage: usage },
          ],
        },
        'manager',
      ),
    ).rejects.toThrow('Insufficient stock');
    expect(tx.inventory.update).not.toHaveBeenCalled();
  });
  it('skips a previously recorded event on retry', async () => {
    tx.stockMovement.findUnique.mockResolvedValue({ id: 'existing' });
    await consumeServiceProducts(
      client,
      {
        id: 'bill',
        salonId: 'salon',
        billNumber: 'BILL',
        items: [
          {
            id: 'line',
            serviceId: 'service',
            quantity: 1,
            productUsage: await snapshotProductUsage(
              db as never,
              'salon',
              recipe,
            ),
          },
        ],
      },
      'manager',
    );
    expect(tx.inventory.update).not.toHaveBeenCalled();
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
  it('validates nested usage fields without accepting injected properties', async () => {
    const pipe = new RequestValidationPipe();
    await expect(
      pipe.transform(recipe[0], { type: 'body', metatype: ProductRecipeDto }),
    ).resolves.toMatchObject(recipe[0]);
    await expect(
      pipe.transform(
        { ...recipe[0], salonId: 'foreign' },
        { type: 'body', metatype: ProductRecipeDto },
      ),
    ).rejects.toThrow();
  });
});

describe('Low stock alert cycle', () => {
  it('notifies managers and franchise owners once when reaching the threshold', async () => {
    tx.inventory.findUniqueOrThrow.mockResolvedValue({
      ...stock,
      quantityOnHand: '1',
    });
    await syncLowStock(client, stock.id);
    expect(tx.notification.createMany).toHaveBeenCalledWith(
      containing({
        data: [
          containing({
            userId: 'manager',
            channel: 'IN_APP',
            notificationType: 'LOW_STOCK',
            status: 'DELIVERED',
          }),
          containing({ userId: 'owner', channel: 'IN_APP' }),
        ],
      }),
    );
    expect(tx.user.findMany).toHaveBeenCalledWith(
      containing({
        where: containing({
          OR: [
            { salonId: 'salon', role: { code: 'MANAGER' } },
            { franchiseId: 'franchise', role: { code: 'ADMIN' } },
          ],
        }),
      }),
    );
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { id: stock.id },
      data: { lowStockNotified: true },
    });
  });
  it('does not spam already-low inventory', async () => {
    tx.inventory.findUniqueOrThrow.mockResolvedValue({
      ...stock,
      quantityOnHand: '0.5',
      lowStockNotified: true,
    });
    await syncLowStock(client, stock.id);
    expect(tx.notification.createMany).not.toHaveBeenCalled();
  });
  it('resets the alert after replenishment', async () => {
    tx.inventory.findUniqueOrThrow.mockResolvedValue({
      ...stock,
      lowStockNotified: true,
    });
    await syncLowStock(client, stock.id);
    expect(tx.inventory.update).toHaveBeenCalledWith({
      where: { id: stock.id },
      data: { lowStockNotified: false },
    });
  });
});
