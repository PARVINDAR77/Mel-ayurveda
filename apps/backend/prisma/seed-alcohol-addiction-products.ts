import { PrismaClient, InventoryTxType } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const ALCOHOL_ADDICTION_PRODUCTS = [
  {
    name: 'No More Granules',
    sku: 'MEL-ALC-NOMORE-01',
    categoryName: 'Alcohol Addiction',
    targetDisease: 'Alcohol Addiction',
    dosageForm: 'Herbal Granules (100g)',
    mrpPrice: 1250.0,
    sellingPrice: 950.0,
    description: 'Natural Ayurvedic anti-craving herbal granules formulated to suppress alcoholic urges, detoxify brain neurotransmitters, and establish natural sobriety without side effects.',
    ingredients: 'Kudzu root (Vidarikand), Shankhpushpi, Brahmi, Ashwagandha, Jyotishmati, Yashtimadhu, Tulsi',
    dosageInstructions: 'Take 5g granules twice daily with water or mixed in food/milk.',
    initialStock: 200,
  },
  {
    name: 'Hepcure Tablet',
    sku: 'MEL-ALC-HEPCUR-02',
    categoryName: 'Alcohol Addiction',
    targetDisease: 'Alcohol Addiction',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1100.0,
    sellingPrice: 850.0,
    description: 'High-potency hepato-protective Ayurvedic formulation to repair liver damage, cleanse alcohol toxins, stimulate bile secretion, and restore healthy liver function.',
    ingredients: 'Bhumi Amla, Kalmegh, Punarnava, Kutki, Kasani, Bhringraj, Giloy, Sharpunkha',
    dosageInstructions: 'Take 1 to 2 tablets twice daily after meals with water.',
    initialStock: 200,
  },
  {
    name: 'Red & White Tablet',
    sku: 'MEL-ALC-REDWHT-03',
    categoryName: 'Alcohol Addiction',
    targetDisease: 'Alcohol Addiction',
    dosageForm: 'Tablets (60 Tabs / Day-Night Combo)',
    mrpPrice: 1450.0,
    sellingPrice: 1150.0,
    description: 'Synergistic dual-tablet Ayurvedic regimen. Red tablet calms morning alcohol withdrawal anxiety and cravings; White tablet soothes the nervous system, prevents nighttime restlessness, and induces restorative sleep.',
    ingredients: 'Sarpagandha, Jatamansi, Tagara, Vacha, Shuddha Shilajit, Mukta Bhasma, Brahmi, Shankhpushpi',
    dosageInstructions: 'Take 1 Red Tablet in the morning after breakfast and 1 White Tablet at night before sleep with water or milk.',
    initialStock: 200,
  },
];

async function seedAlcoholProducts() {
  console.log('Seeding Alcohol Addiction Products into Melayurveda CRM...');

  // 1. Upsert Category
  const category = await prisma.productCategory.upsert({
    where: { name: 'Alcohol Addiction' },
    update: {
      isActive: true,
      description: 'Ayurvedic formulations for alcohol de-addiction, anti-craving, and liver detoxification (Madatyaya / Vyasana Mukti)',
    },
    create: {
      name: 'Alcohol Addiction',
      description: 'Ayurvedic formulations for alcohol de-addiction, anti-craving, and liver detoxification (Madatyaya / Vyasana Mukti)',
      isActive: true,
    },
  });
  console.log(`✓ Category ready: ${category.name} (${category.id})`);

  for (const item of ALCOHOL_ADDICTION_PRODUCTS) {
    // 2. Upsert Product
    const product = await prisma.product.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        targetDisease: item.targetDisease,
        dosageForm: item.dosageForm,
        mrpPrice: item.mrpPrice,
        sellingPrice: item.sellingPrice,
        gstRate: 12.0,
        description: item.description,
        ingredients: item.ingredients,
        dosageInstructions: item.dosageInstructions,
        categoryId: category.id,
        isActive: true,
      },
      create: {
        sku: item.sku,
        name: item.name,
        targetDisease: item.targetDisease,
        dosageForm: item.dosageForm,
        mrpPrice: item.mrpPrice,
        sellingPrice: item.sellingPrice,
        gstRate: 12.0,
        description: item.description,
        ingredients: item.ingredients,
        dosageInstructions: item.dosageInstructions,
        categoryId: category.id,
        isActive: true,
      },
    });
    console.log(`✓ Product ready: ${product.name} [SKU: ${product.sku}]`);

    // 3. Upsert Inventory
    const inventory = await prisma.inventory.upsert({
      where: { productId: product.id },
      update: {
        availableQuantity: item.initialStock,
      },
      create: {
        productId: product.id,
        availableQuantity: item.initialStock,
        reservedQuantity: 0,
        lowStockThreshold: 20,
      },
    });

    // 4. Initial Restock Tx
    const existingTx = await prisma.inventoryTransaction.findFirst({
      where: { inventoryId: inventory.id },
    });

    if (!existingTx) {
      await prisma.inventoryTransaction.create({
        data: {
          inventoryId: inventory.id,
          type: InventoryTxType.RESTOCK,
          quantity: item.initialStock,
          balanceAfter: item.initialStock,
          notes: `Initial stock for ${product.name} (${product.sku})`,
        },
      });
    }

    console.log(`✓ Inventory stock verified: ${inventory.availableQuantity} units available.`);
  }

  console.log('\n🎉 Successfully seeded all Alcohol Addiction Products into database!');
}

seedAlcoholProducts()
  .catch((e) => {
    console.error('Failed to seed alcohol addiction products:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
