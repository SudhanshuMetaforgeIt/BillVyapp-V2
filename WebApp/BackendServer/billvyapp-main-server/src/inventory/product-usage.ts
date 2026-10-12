import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

export type ProductRecipe = {
  productId: string;
  mode: 'PERCENT' | 'FIXED';
  value: number;
};
export type ProductUsage = ProductRecipe & {
  productName: string;
  measurementUnit: string;
  packageSize: number;
  packagesPerService: number;
};

export function readRecipe(value: unknown): ProductRecipe[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 30)
    throw new BadRequestException(
      'At most 30 products may be used by a service',
    );
  const ids = new Set<string>();
  return value.map((row: ProductRecipe) => {
    if (
      !row ||
      typeof row.productId !== 'string' ||
      !['PERCENT', 'FIXED'].includes(row.mode) ||
      !Number.isFinite(row.value) ||
      row.value <= 0 ||
      row.value > (row.mode === 'PERCENT' ? 100 : 1000000) ||
      ids.has(row.productId)
    )
      throw new BadRequestException(
        'Invalid or duplicate service product usage',
      );
    ids.add(row.productId);
    return { productId: row.productId, mode: row.mode, value: row.value };
  });
}

export async function snapshotProductUsage(
  db: Pick<Prisma.TransactionClient, 'product'>,
  salonId: string,
  value: unknown,
): Promise<ProductUsage[]> {
  const recipe = readRecipe(value);
  if (!recipe.length) return [];
  const products = await db.product.findMany({
    where: {
      id: { in: recipe.map((row) => row.productId) },
      salonId,
      isActive: true,
    },
    select: { id: true, name: true, measurementUnit: true, packageSize: true },
  });
  return materializeProductUsage(recipe, products);
}

export function materializeProductUsage(
  recipe: ProductRecipe[],
  products: Array<{
    id: string;
    name: string;
    measurementUnit: string;
    packageSize: { toString(): string } | number;
  }>,
): ProductUsage[] {
  return recipe.map((row) => {
    const product = products.find((p) => p.id === row.productId);
    if (!product)
      throw new BadRequestException(
        'Recipe product is inactive or belongs to another salon',
      );
    const packageSize = Number(product.packageSize);
    const units =
      row.mode === 'PERCENT' ? (packageSize * row.value) / 100 : row.value;
    if (
      product.measurementUnit === 'PCS' &&
      Math.abs(units - Math.round(units)) > 0.0000001
    )
      throw new BadRequestException(
        'Piece-based products must use whole pieces',
      );
    const packagesPerService =
      Math.ceil(
        (row.mode === 'PERCENT' ? row.value / 100 : row.value / packageSize) *
          1000000 -
          0.0000001,
      ) / 1000000;
    if (
      !Number.isFinite(packagesPerService) ||
      packagesPerService <= 0 ||
      packagesPerService > 1000000
    )
      throw new BadRequestException(
        'Product usage exceeds the supported range',
      );
    const measuredUsage = packagesPerService * packageSize;
    if (
      product.measurementUnit === 'PCS' &&
      Math.abs(measuredUsage - Math.round(measuredUsage)) > 0.0000001
    )
      throw new BadRequestException(
        'Piece usage must fit the package precision. Track this product per piece instead.',
      );
    if ((measuredUsage - units) / units > 0.001)
      throw new BadRequestException(
        'Usage is too small for this package precision. Choose a larger usage amount or a smaller package.',
      );
    return {
      ...row,
      productName: product.name,
      measurementUnit: product.measurementUnit,
      packageSize,
      packagesPerService,
    };
  });
}

/** Called under the inventory lock. Alert + latch are committed with the stock update. */
export async function syncLowStock(
  tx: Prisma.TransactionClient,
  inventoryId: string,
) {
  const stock = await tx.inventory.findUniqueOrThrow({
    where: { id: inventoryId },
    include: {
      product: true,
      salon: { select: { franchiseId: true, name: true } },
    },
  });
  const low = Number(stock.quantityOnHand) <= stock.product.reorderLevel;
  if (!low) {
    if (stock.lowStockNotified)
      await tx.inventory.update({
        where: { id: inventoryId },
        data: { lowStockNotified: false },
      });
    return;
  }
  if (stock.lowStockNotified) return;
  const recipients = await tx.user.findMany({
    where: {
      isActive: true,
      OR: [
        { salonId: stock.salonId, role: { code: 'MANAGER' } },
        { franchiseId: stock.salon.franchiseId, role: { code: 'ADMIN' } },
      ],
    },
    select: { id: true },
  });
  if (recipients.length)
    await tx.notification.createMany({
      data: recipients.map((recipient) => ({
        salonId: stock.salonId,
        userId: recipient.id,
        channel: 'IN_APP' as const,
        notificationType: 'LOW_STOCK',
        recipient: recipient.id,
        subject: `Low stock: ${stock.product.name}`,
        message: `${stock.salon.name}: ${stock.product.name} has ${Number(stock.quantityOnHand)} packages remaining (${Number(stock.quantityOnHand) * Number(stock.product.packageSize)} ${stock.product.measurementUnit}). Reorder level: ${stock.product.reorderLevel} packages.`,
        status: 'DELIVERED' as const,
        deliveredAt: new Date(),
      })),
    });
  await tx.inventory.update({
    where: { id: inventoryId },
    data: { lowStockNotified: true },
  });
}

export async function consumeServiceProducts(
  tx: Prisma.TransactionClient,
  bill: {
    id: string;
    salonId: string;
    billNumber: string;
    items: Array<{
      id: string;
      serviceId: string | null;
      quantity: number;
      description?: string | null;
      productUsage?: unknown;
    }>;
  },
  actorUserId: string,
) {
  const products = new Map<
    string,
    { microPackages: number; details: Array<Record<string, string | number>> }
  >();
  for (const item of bill.items) {
    if (!item.serviceId || item.productUsage == null) continue;
    if (!Array.isArray(item.productUsage))
      throw new BadRequestException('Invalid saved product recipe');
    for (const usage of item.productUsage as ProductUsage[]) {
      const microPackages =
        Math.round(usage.packagesPerService * 1000000) * item.quantity;
      if (
        !Number.isSafeInteger(microPackages) ||
        microPackages <= 0 ||
        microPackages > 1000000000000
      )
        throw new BadRequestException(
          'Service consumption exceeds supported quantity',
        );
      const current = products.get(usage.productId) ?? {
        microPackages: 0,
        details: [],
      };
      current.microPackages += microPackages;
      if (
        !Number.isSafeInteger(current.microPackages) ||
        current.microPackages > 1000000000000
      )
        throw new BadRequestException('Consumption exceeds supported quantity');
      current.details.push({
        billItemId: item.id,
        serviceId: item.serviceId,
        serviceQuantity: item.quantity,
        serviceName: item.description ?? 'Service',
        productName: usage.productName,
        measurementUnit: usage.measurementUnit,
        packageSize: usage.packageSize,
        packagesUsed: microPackages / 1000000,
        mode: usage.mode,
        value: usage.value,
      });
      products.set(usage.productId, current);
    }
  }
  for (const [productId, usage] of [...products].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    await tx.$queryRaw`SELECT id FROM inventory WHERE salonId = ${bill.salonId} AND productId = ${productId} FOR UPDATE`;
    const stock = await tx.inventory.findUnique({
      where: { salonId_productId: { salonId: bill.salonId, productId } },
    });
    const eventKey = `consumption:${bill.id}:${productId}`;
    if (await tx.stockMovement.findUnique({ where: { eventKey } })) continue;
    const used = usage.microPackages / 1000000;
    if (
      !stock ||
      Number(stock.availableQuantity) + 0.0000001 < used ||
      Number(stock.quantityOnHand) + 0.0000001 < used
    )
      throw new BadRequestException(
        `Insufficient stock for ${usage.details[0].productName}`,
      );
    const updated = await tx.inventory.update({
      where: { id: stock.id },
      data: {
        quantityOnHand: { decrement: used.toFixed(6) },
        availableQuantity: { decrement: used.toFixed(6) },
      },
    });
    await tx.stockMovement.create({
      data: {
        salonId: bill.salonId,
        productId,
        movementType: 'CONSUMPTION',
        quantity: used.toFixed(6),
        balanceAfter: updated.quantityOnHand,
        unitCost: stock.averageCost,
        referenceType: 'BILL',
        referenceId: bill.id,
        eventKey,
        consumptionDetails: usage.details,
        createdBy: actorUserId,
        notes: `Service usage for bill ${bill.billNumber}`,
      },
    });
    await syncLowStock(tx, stock.id);
  }
}
