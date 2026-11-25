import { PrismaClient, InventoryTxType } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

interface ProductDef {
  name: string;
  sku: string;
  categoryName: string;
  targetDisease: string;
  dosageForm: string;
  mrpPrice: number;
  sellingPrice: number;
  description: string;
  ingredients: string;
  dosageInstructions: string;
  initialStock: number;
}

const OFFICIAL_CATALOG: ProductDef[] = [
  // -------------------------------------------------------------
  // 1. Skin Care Products
  // -------------------------------------------------------------
  {
    name: 'Netex Malam',
    sku: 'MEL-SKN-NETEX-01',
    categoryName: 'Skin care',
    targetDisease: 'Skin Care',
    dosageForm: 'Ointment / Malam (50g)',
    mrpPrice: 650.0,
    sellingPrice: 499.0,
    description: 'Classical Ayurvedic soothing malam for eczema, psoriasis patches, ringworm and itchy fungal skin lesions.',
    ingredients: 'Gandhak, Shuddha Tankan, Yashad Bhasma, Neem Taila, Karanja Taila, Camphor',
    dosageInstructions: 'Clean the affected skin area and apply gently 2 to 3 times daily.',
    initialStock: 150,
  },
  {
    name: 'Sariva Tablet',
    sku: 'MEL-SKN-SARIVA-02',
    categoryName: 'Skin care',
    targetDisease: 'Skin Care',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 850.0,
    sellingPrice: 650.0,
    description: 'Potent Ayurvedic Rakta Shodhaka (blood purifier) that pacifies Pitta dosha and clears chronic skin toxins.',
    ingredients: 'Shuddha Sariva (Anantamool), Manjistha, Khadira, Neem, Chandana',
    dosageInstructions: 'Take 2 tablets twice daily with water after meals.',
    initialStock: 200,
  },
  {
    name: 'Sorsiz Cream',
    sku: 'MEL-SKN-SORCR-03',
    categoryName: 'Skin care',
    targetDisease: 'Skin Care',
    dosageForm: 'Topical Cream (50g)',
    mrpPrice: 750.0,
    sellingPrice: 580.0,
    description: 'Therapeutic anti-scaling herbal cream specifically formulated for plaque psoriasis and dry cracked skin.',
    ingredients: 'Wrightia Tinctoria (Stree Kutaja), Aloe Vera, Bakuchi, Haridra, Coconut Oil',
    dosageInstructions: 'Apply topically on lesions twice daily after bath.',
    initialStock: 180,
  },
  {
    name: 'Sorsiz Tablet',
    sku: 'MEL-SKN-SORTB-04',
    categoryName: 'Skin care',
    targetDisease: 'Skin Care',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 950.0,
    sellingPrice: 750.0,
    description: 'Internal cellular detoxifier and immune-modulator that curbs autoimmune skin flare-ups and scaling.',
    ingredients: 'Khadirarishta Ghan, Manjisthadi Kwath Ghan, Guduchi, Triphala, Kaishore Guggulu',
    dosageInstructions: 'Take 1 to 2 tablets twice daily with lukewarm water.',
    initialStock: 200,
  },
  {
    name: 'Darmacare Syrup',
    sku: 'MEL-SKN-DARMA-05',
    categoryName: 'Skin care',
    targetDisease: 'Skin Care',
    dosageForm: 'Herbal Syrup (200ml)',
    mrpPrice: 600.0,
    sellingPrice: 450.0,
    description: 'Synergistic herbal blood-purifying tonic that clears pimples, allergic dermatitis and imparts a natural glow.',
    ingredients: 'Neem, Chirata, Kalmegh, Haritaki, Bibhitaki, Amalaki, Khadira',
    dosageInstructions: 'Take 15ml syrup with equal parts water twice daily after meals.',
    initialStock: 160,
  },
  {
    name: 'Panchtrit Ghee',
    sku: 'MEL-SKN-PANCH-06',
    categoryName: 'Skin care',
    targetDisease: 'Skin Care',
    dosageForm: 'Medicinal Ghee / Ghrita (100g)',
    mrpPrice: 1100.0,
    sellingPrice: 850.0,
    description: 'Panchatikta Ghrita — Classical Ayurvedic medicated cow ghee prepared with five bitter roots for deep tissue detoxification.',
    ingredients: 'Nimba, Patola, Kantakari, Guduchi, Vasa, Shuddha Ghritham (Pure Cow Ghee)',
    dosageInstructions: 'Take 5g with warm water or milk on an empty stomach in the morning.',
    initialStock: 120,
  },

  // -------------------------------------------------------------
  // 2. Weight Gain Product
  // -------------------------------------------------------------
  {
    name: 'Enerjeet Powder',
    sku: 'MEL-WTG-ENERP-01',
    categoryName: 'Weight Gain',
    targetDisease: 'Weight Gain',
    dosageForm: 'Powder / Churna (200g)',
    mrpPrice: 1450.0,
    sellingPrice: 1150.0,
    description: 'Natural herbal weight and muscle builder rich in adaptogens to increase nutrient absorption and lean mass.',
    ingredients: 'Ashwagandha, Shatavari, Safed Musli, Vidarikand, Gokshura, Yashtimadhu',
    dosageInstructions: 'Mix 1 scoop (10g) in warm full-cream milk twice daily after meals.',
    initialStock: 220,
  },
  {
    name: 'Enerjeet Tablets',
    sku: 'MEL-WTG-ENERT-02',
    categoryName: 'Weight Gain',
    targetDisease: 'Weight Gain',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 900.0,
    sellingPrice: 699.0,
    description: 'Dhatu-nourishing herbal tablets that stimulate Agni (digestive fire) and accelerate healthy weight gain.',
    ingredients: 'Swarna Bhasma, Shuddha Shilajit, Ashwagandha Ghan, Pippali, Chitrak',
    dosageInstructions: 'Take 2 tablets twice daily with milk or water.',
    initialStock: 190,
  },
  {
    name: 'Cal-Vcare Avaleh',
    sku: 'MEL-WTG-CALVC-03',
    categoryName: 'Weight Gain',
    targetDisease: 'Weight Gain',
    dosageForm: 'Avaleh / Herbal Paste (250g)',
    mrpPrice: 1250.0,
    sellingPrice: 950.0,
    description: 'Nutritive rasayana avaleh enriched with natural calcium and organic minerals for bone density and muscle stamina.',
    ingredients: 'Praval Pishti, Mukta Shukti, Shankh Bhasma, Amla Murabba, Draksha, Kesar, Honey',
    dosageInstructions: 'Consume 1 to 2 teaspoons twice daily followed by a glass of lukewarm milk.',
    initialStock: 140,
  },

  // -------------------------------------------------------------
  // 3. Joint Pain Care
  // -------------------------------------------------------------
  {
    name: 'Arthex Oil',
    sku: 'MEL-JNT-ARTHX-01',
    categoryName: 'Joint Pain',
    targetDisease: 'Joint Pain',
    dosageForm: 'Therapeutic Oil (100ml)',
    mrpPrice: 850.0,
    sellingPrice: 650.0,
    description: 'Deep-penetrating pain-relieving Ayurvedic taila that alleviates joint stiffness, knee inflammation and arthritis pain.',
    ingredients: 'Mahanarayan Taila, Gandhapura Taila, Nilgiri, Shallaki, Nirgundi, Camphor',
    dosageInstructions: 'Gently massage 5 to 10ml warm oil over affected joints twice daily.',
    initialStock: 250,
  },
  {
    name: 'Artho Amrit Tablets',
    sku: 'MEL-JNT-AMRIT-02',
    categoryName: 'Joint Pain',
    targetDisease: 'Joint Pain',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1100.0,
    sellingPrice: 850.0,
    description: 'Restores synovial joint fluid, protects cartilage from degeneration, and reduces uric acid buildup in joints.',
    ingredients: 'Boswellia Serrata (Shallaki), Yograj Guggulu, Rasna, Ashwagandha, Shuddha Guggulu',
    dosageInstructions: 'Take 2 tablets twice daily with warm water after food.',
    initialStock: 220,
  },

  // -------------------------------------------------------------
  // 4. Men’s Wellness & Vitality
  // -------------------------------------------------------------
  {
    name: 'Amrit Plus Tablets',
    sku: 'MEL-MNW-AMRIT-01',
    categoryName: 'Men’s wellness',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1650.0,
    sellingPrice: 1250.0,
    description: 'Premium Ayurvedic vitality tonic for male energy, reproductive stamina, vigor and physical performance.',
    ingredients: 'Shuddha Shilajit, Safed Musli, Kaunch Beej, Ashwagandha, Swarna Vanga, Gokshura',
    dosageInstructions: 'Take 1 to 2 tablets twice daily with warm milk at bedtime.',
    initialStock: 180,
  },
  {
    name: 'ling Taila',
    sku: 'MEL-MNW-LINGT-02',
    categoryName: 'Men’s wellness',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Therapeutic Taila (50ml)',
    mrpPrice: 1200.0,
    sellingPrice: 899.0,
    description: 'Traditional Ayurvedic local vitality massage oil formulated with warming herbs to enhance blood circulation.',
    ingredients: 'Jyotishmati, Ashwagandha Taila, Bala, Malkangani, Jaiphal, Til Taila',
    dosageInstructions: 'Apply 4 to 5 drops and massage gently once daily before sleeping.',
    initialStock: 150,
  },
  {
    name: 'Shilajit',
    sku: 'MEL-MNW-SHILA-03',
    categoryName: 'Men’s wellness',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Pure Resin / Drops (20g)',
    mrpPrice: 1800.0,
    sellingPrice: 1399.0,
    description: '100% Himalayan Shuddha Shilajit containing over 80 trace minerals and 75% Fulvic Acid for supreme cellular stamina.',
    ingredients: 'Purified Himalayan Asphaltum (Shuddha Shilajit)',
    dosageInstructions: 'Dissolve pea-sized resin (300-500mg) in warm water or milk once daily in the morning.',
    initialStock: 210,
  },
  {
    name: 'Inforsiz Tablets',
    sku: 'MEL-MNW-INFOR-04',
    categoryName: 'Men’s wellness',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1400.0,
    sellingPrice: 1050.0,
    description: 'Potent Rasayana formula that boosts free testosterone, balances endocrine health, and combats chronic lethargy.',
    ingredients: 'Tribulus Terrestris (Gokshura), Tongkat Ali, Vidarikand, Akarkara, Kesar',
    dosageInstructions: 'Take 1 tablet twice daily with water or milk after meals.',
    initialStock: 170,
  },
  {
    name: 'Amrit Prash Avaleh',
    sku: 'MEL-MNW-PRASH-05',
    categoryName: 'Men’s wellness',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Avaleh / Paste (250g)',
    mrpPrice: 1350.0,
    sellingPrice: 999.0,
    description: 'Ojas-enhancing Ayurvedic Chyawan-style formulation tailored for male physical endurance and rejuvenation.',
    ingredients: 'Amla Pulp, Kesar, Ashwagandha, Shatavari, Pipramul, Pure Cow Ghee, Wild Honey',
    dosageInstructions: 'Take 1 spoon (10g) in the morning and evening with warm milk.',
    initialStock: 160,
  },
  {
    name: 'H.M Horse Taila',
    sku: 'MEL-MNW-HORSE-06',
    categoryName: 'Men’s wellness',
    targetDisease: 'Men’s Wellness',
    dosageForm: 'Therapeutic Taila (50ml)',
    mrpPrice: 1300.0,
    sellingPrice: 950.0,
    description: 'High-potency muscular toning herbal oil enriched with classical Vajikaran herbs and neuro-stimulant oils.',
    ingredients: 'Ashwagandha, Bala, Kesar, Akarkara, Lavanga Taila, Til Taila base',
    dosageInstructions: 'Apply a few drops and massage gently as directed by your Ayurvedic consultant.',
    initialStock: 140,
  },

  // -------------------------------------------------------------
  // 5. Weight Loss Products
  // -------------------------------------------------------------
  {
    name: 'Fibrolax Pawder',
    sku: 'MEL-WTL-FIBRO-01',
    categoryName: 'Weight Loss',
    targetDisease: 'Weight Loss',
    dosageForm: 'Powder / Churna (100g)',
    mrpPrice: 650.0,
    sellingPrice: 480.0,
    description: 'High-fiber digestive detoxifier that flushes visceral fat toxins and curbs midnight overeating.',
    ingredients: 'Isabgol Husk, Triphala, Senna Leaves, Yashtimadhu, Saunf, Ajwain',
    dosageInstructions: 'Mix 1 teaspoon with warm water at bedtime.',
    initialStock: 200,
  },
  {
    name: 'Smartlook Powder',
    sku: 'MEL-WTL-SMART-02',
    categoryName: 'Weight Loss',
    targetDisease: 'Weight Loss',
    dosageForm: 'Slimming Powder (200g)',
    mrpPrice: 1550.0,
    sellingPrice: 1199.0,
    description: 'Metabolic accelerator that burns stubborn abdominal adipose tissue and naturally suppresses sugar cravings.',
    ingredients: 'Garcinia Cambogia (Vrikshamla), Green Coffee Bean, Guggulu, Mustak, Shunti',
    dosageInstructions: 'Take 1 spoon in a glass of warm water 30 minutes before breakfast and dinner.',
    initialStock: 180,
  },
  {
    name: 'Obenew Tablet',
    sku: 'MEL-WTL-OBENE-03',
    categoryName: 'Weight Loss',
    targetDisease: 'Weight Loss',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 1200.0,
    sellingPrice: 899.0,
    description: 'Medohar rasayana tablets that break down lipid accumulations, improve sluggish thyroid metabolism and tone the body.',
    ingredients: 'Medohar Guggulu, Triphala Ghan, Vrikshamla, Pippali, Chitrakmool',
    dosageInstructions: 'Take 2 tablets twice daily with warm water 30 minutes before meals.',
    initialStock: 210,
  },

  // -------------------------------------------------------------
  // 6. Piles / Gas & Acidity Products
  // -------------------------------------------------------------
  {
    name: 'Suruchi Powder',
    sku: 'MEL-PLS-SURUC-01',
    categoryName: 'Piles',
    targetDisease: 'Piles / Gas & Acidity',
    dosageForm: 'Churna / Powder (100g)',
    mrpPrice: 550.0,
    sellingPrice: 399.0,
    description: 'Instant digestive and antacid churna that relieves chronic hyperacidity, gas bloating, constipation and indigestion.',
    ingredients: 'Hingvashtak Churna, Avipattikar Churna, Kala Namak, Jeera, Ajwain, Saunf, Pudina',
    dosageInstructions: 'Take 1 teaspoon with warm water after lunch and dinner.',
    initialStock: 240,
  },
  {
    name: 'Arsh Amrit tablet',
    sku: 'MEL-PLS-ARSHM-02',
    categoryName: 'Piles',
    targetDisease: 'Piles / Gas & Acidity',
    dosageForm: 'Tablets (60 Tabs)',
    mrpPrice: 950.0,
    sellingPrice: 720.0,
    description: 'Potent classical anorectal healer that shrinks internal and external pile masses, stops bleeding and relieves rectal pain.',
    ingredients: 'Arshoghni Vati, Suran (Jimikand), Kankayan Gutika, Triphala, Nagkesar, Neem Seed',
    dosageInstructions: 'Take 2 tablets twice daily with buttermilk or lukewarm water after food.',
    initialStock: 250,
  },
  {
    name: 'Jatyadi Malam',
    sku: 'MEL-PLS-JATYA-03',
    categoryName: 'Piles',
    targetDisease: 'Piles / Gas & Acidity',
    dosageForm: 'Healing Ointment / Malam (50g)',
    mrpPrice: 500.0,
    sellingPrice: 380.0,
    description: 'Classical Jatyadi healing ointment that provides rapid soothing relief from burning sensations, fissure tears and wounds.',
    ingredients: 'Jati Patra, Neem Patra, Patol, Karanj Beej, Yashtimadhu, Haridra, Shuddha Tuttha, Sesame Oil',
    dosageInstructions: 'Apply locally in the affected anal area before and after bowel movements.',
    initialStock: 260,
  },
];

async function seedOfficialCatalog() {
  console.log('Seeding Official 23 Melayurveda Formulations across 6 Therapeutic Categories...');

  for (const item of OFFICIAL_CATALOG) {
    // 1. Ensure Category exists
    const category = await prisma.productCategory.upsert({
      where: { name: item.categoryName },
      update: { isActive: true },
      create: {
        name: item.categoryName,
        description: `Therapeutic category for ${item.targetDisease}`,
        isActive: true,
      },
    });

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
          notes: `Official product launch catalog inventory for ${item.name}`,
        },
      });
    }

    console.log(`✓ Seeded: [${item.targetDisease}] ${item.name} (${item.sku}) - ${item.initialStock} Units`);
  }

  const count = await prisma.product.count();
  console.log(`\n🎉 Successfully verified catalog! Total products in database: ${count}`);
}

seedOfficialCatalog()
  .catch((e) => {
    console.error('Error seeding official catalog:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
