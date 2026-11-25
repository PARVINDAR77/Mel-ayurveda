import { PrismaClient, RoleType, InventoryTxType } from '@prisma/client';

const prisma = new PrismaClient();

async function runStockManagementVerification() {
  console.log('=== STARTING STOCK MANAGEMENT (ADD / REMOVE / ADJUST) TEST ===');

  try {
    // 1. Fetch active product
    const product = await prisma.product.findFirst({
      where: { isActive: true },
      include: { inventory: true },
    });
    if (!product) throw new Error('No active product found');

    let inv = product.inventory;
    if (!inv) {
      inv = await prisma.inventory.create({
        data: {
          productId: product.id,
          availableQuantity: 100,
          reservedQuantity: 0,
          lowStockThreshold: 20,
        },
      });
    }

    const initialStock = inv.availableQuantity;
    console.log(`[1/4] Target SKU: ${product.sku} (${product.name}) - Initial Available: ${initialStock} units`);

    // 2. Test ADD Stock
    console.log('\n[2/4] Testing ADD Stock (+50 units)...');
    const addedUnits = 50;
    const stockAfterAdd = initialStock + addedUnits;

    const addInv = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id: inv.id },
        data: { availableQuantity: stockAfterAdd },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: InventoryTxType.RESTOCK,
          quantity: addedUnits,
          balanceAfter: stockAfterAdd,
          notes: '+50 Units Factory Restock Batch Test',
        },
      });
      return updated;
    });

    if (addInv.availableQuantity !== stockAfterAdd) {
      throw new Error(`Failed to add stock: expected ${stockAfterAdd}, got ${addInv.availableQuantity}`);
    }
    console.log(`SUCCESS: Stock increased from ${initialStock} ➔ ${addInv.availableQuantity} units.`);

    // 3. Test REMOVE Stock
    console.log('\n[3/4] Testing REMOVE Stock (-10 units for Damaged Packaging)...');
    const removedUnits = 10;
    const stockAfterRemove = stockAfterAdd - removedUnits;

    const removeInv = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id: inv.id },
        data: { availableQuantity: stockAfterRemove },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: InventoryTxType.ADJUSTMENT,
          quantity: -removedUnits,
          balanceAfter: stockAfterRemove,
          notes: '-10 Units Damaged Packaging Write-off Test',
        },
      });
      return updated;
    });

    if (removeInv.availableQuantity !== stockAfterRemove) {
      throw new Error(`Failed to remove stock: expected ${stockAfterRemove}, got ${removeInv.availableQuantity}`);
    }
    console.log(`SUCCESS: Stock decreased from ${stockAfterAdd} ➔ ${removeInv.availableQuantity} units.`);

    // 4. Test SET_COUNT (Calibration)
    console.log('\n[4/4] Testing SET_COUNT (Calibrating exact warehouse physical count)...');
    const calibratedCount = 200;

    const calibratedInv = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id: inv.id },
        data: { availableQuantity: calibratedCount },
      });
      await tx.inventoryTransaction.create({
        data: {
          inventoryId: inv.id,
          type: InventoryTxType.ADJUSTMENT,
          quantity: calibratedCount - stockAfterRemove,
          balanceAfter: calibratedCount,
          notes: `Calibrated to ${calibratedCount} units during audit test`,
        },
      });
      return updated;
    });

    if (calibratedInv.availableQuantity !== calibratedCount) {
      throw new Error(`Failed to calibrate count: expected ${calibratedCount}, got ${calibratedInv.availableQuantity}`);
    }
    console.log(`SUCCESS: Stock successfully calibrated to ${calibratedInv.availableQuantity} units.`);

    // 5. Verify transaction history
    const transactions = await prisma.inventoryTransaction.findMany({
      where: { inventoryId: inv.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    console.log(`\nVerified ${transactions.length} recent audit transactions recorded for SKU ${product.sku}.`);

    console.log('\n======================================================');
    console.log('✅ ALL STOCK MANAGEMENT (ADD / REMOVE / ADJUST) TESTS PASSED');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('❌ Stock verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runStockManagementVerification();
