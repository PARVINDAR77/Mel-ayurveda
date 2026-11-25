import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

const therapeuticDiseases = [
  {
    categoryName: 'Weight Gain Care',
    categoryDesc: 'Ayurvedic formulations for healthy weight gain, muscle building, and tissue nourishment (Brihmana / Karshya)',
    product: {
      sku: 'MEL-AYUR-WTG-01',
      name: 'Mel Brihat Poshak Rasayan & Ashwagandha Churna',
      targetDisease: 'Weight Gain',
      dosageForm: 'Powder / Churna',
      mrpPrice: 2200.0,
      sellingPrice: 1750.0,
      gstRate: 12.0,
      description: 'Herbal muscle nourishment and healthy weight gain formulation with Ashwagandha, Shatavari, and Safed Musli.',
      dosageInstructions: 'Take 5g churna twice daily with warm full-cream milk after meals.',
      ingredients: 'Ashwagandha, Shatavari, Safed Musli, Gokshura, Vidarikand, Yashtimadhu',
      imageUrl: '/images/products/weight-gain.jpg',
    },
  },
  {
    categoryName: 'Weight Loss Care',
    categoryDesc: 'Natural Ayurvedic fat-metabolizing and lipid-regulating rasayanas (Sthaulya / Medoroga)',
    product: {
      sku: 'MEL-AYUR-WTL-01',
      name: 'Mel Medoroga Mukti Rasayan & Triphala Guggulu Kit',
      targetDisease: 'Weight Loss',
      dosageForm: 'Tablets & Decoction',
      mrpPrice: 2600.0,
      sellingPrice: 1999.0,
      gstRate: 12.0,
      description: 'Synergistic herbal kit to stimulate agni, clear toxins, and burn excess meda (adipose tissue).',
      dosageInstructions: 'Take 2 tablets twice daily with warm water 30 minutes before meals.',
      ingredients: 'Medohar Guggulu, Vrikshamla (Garcinia), Triphala, Shuddha Shilajit, Green Tea Extract',
      imageUrl: '/images/products/weight-loss.jpg',
    },
  },
  {
    categoryName: 'Piles & Anorectal Care',
    categoryDesc: 'Comprehensive herbal management for piles, fissures, and chronic constipation (Arsha)',
    product: {
      sku: 'MEL-AYUR-PLS-01',
      name: 'Mel Arshahar Vati & Kankayan Gutika Kit',
      targetDisease: 'Piles',
      dosageForm: 'Herbal Tablets Kit',
      mrpPrice: 2400.0,
      sellingPrice: 1850.0,
      gstRate: 12.0,
      description: 'Potent classical hemorrhoid care formula that shrinks pile masses and alleviates burning pain and bleeding.',
      dosageInstructions: 'Take 2 tablets twice daily with lukewarm water or takra (buttermilk) after lunch and dinner.',
      ingredients: 'Surana Kanda, Triphala, Haritaki, Neem, Nagkesar, Shuddha Guggulu',
      imageUrl: '/images/products/piles.jpg',
    },
  },
  {
    categoryName: 'Joint & Bone Care',
    categoryDesc: 'Restorative oils, kwath, and rasayanas for joint pain, arthritis, and stiffness (Sandhivata)',
    product: {
      sku: 'MEL-AYUR-JNT-01',
      name: 'Mel Sandhivata Shanti Kwath + Asthi Oil 100ml',
      targetDisease: 'Joint Pain',
      dosageForm: 'Decoction & Oil Kit',
      mrpPrice: 2400.0,
      sellingPrice: 1850.0,
      gstRate: 12.0,
      description: 'Complete 30-day arthritic and joint mobility course. Rapid relief from stiffness, swelling, and joint degeneration.',
      dosageInstructions: 'Drink 15ml kwath with warm water twice daily. Gently massage Asthi Oil onto affected joints twice daily.',
      ingredients: 'Shallaki, Rasna, Nirgundi, Dashamoola, Gandhapura, Mahanarayan Taila',
      imageUrl: '/images/products/joint-pain.jpg',
    },
  },
  {
    categoryName: 'Kidney & Renal Care',
    categoryDesc: 'Herbal formulations for renal calculi dissolution and urinary tract health (Ashmari)',
    product: {
      sku: 'MEL-AYUR-KDN-01',
      name: 'Mel Ashmari Bhedan Kwath & Gokshuradi Guggulu Kit',
      targetDisease: 'Kidney Stone',
      dosageForm: 'Syrup & Tablets',
      mrpPrice: 2500.0,
      sellingPrice: 1950.0,
      gstRate: 12.0,
      description: 'Classical stone-dissolving and diuretic herbal formulation for renal stones and burning micturition.',
      dosageInstructions: 'Take 20ml syrup with a glass of water twice daily; 2 tablets Gokshuradi Guggulu after meals.',
      ingredients: 'Pashanbheda, Varuna Chal, Gokshura, Kulattha, Punarnava, Shuddha Shilajit',
      imageUrl: '/images/products/kidney-stone.jpg',
    },
  },
  {
    categoryName: 'De-addiction & Liver Detox',
    categoryDesc: 'Holistic Ayurvedic support to reduce cravings and rejuvenate the liver (Madatyaya / Vyasana Mukti)',
    product: {
      sku: 'MEL-AYUR-ALC-01',
      name: 'Mel Madatyaya Mukti Drops & Yakrit Shuddhi Kalpa',
      targetDisease: 'Alcohol De-addiction',
      dosageForm: 'Sublingual Drops & Kalpa',
      mrpPrice: 2800.0,
      sellingPrice: 2100.0,
      gstRate: 12.0,
      description: 'Zero-taste natural herbal drops to curb alcohol dependence and flush hepatic toxins.',
      dosageInstructions: 'Mix 10-15 drops in any beverage or water twice daily. Take 1 spoon Kalpa at bedtime.',
      ingredients: 'Bhumyamalaki, Kalmegh, Shankhpushpi, Jyotishmati, Brahmi, Katuki',
      imageUrl: '/images/products/alcohol.jpg',
    },
  },
  {
    categoryName: 'Skin & Dermatology Care',
    categoryDesc: 'Ayurvedic blood purifiers and therapeutic oils for psoriasis, eczema, acne, and skin glow (Twak Roga)',
    product: {
      sku: 'MEL-AYUR-SKN-01',
      name: 'Mel Twak Shanti Taila + Maha Manjisthadi Kwath',
      targetDisease: 'Skin Care',
      dosageForm: 'Oil & Decoction',
      mrpPrice: 2300.0,
      sellingPrice: 1800.0,
      gstRate: 12.0,
      description: 'Deep blood purifying and cooling Ayurvedic therapy for chronic skin conditions, itching, and pigmentation.',
      dosageInstructions: '15ml kwath with equal parts warm water after meals. Apply Twak Shanti Taila gently over skin lesions.',
      ingredients: 'Manjistha, Khadira, Neem, Sariva, Bakuchi, Haridra, Chandana',
      imageUrl: '/images/products/skin-care.jpg',
    },
  },
];

async function seedDiseasesAndProducts() {
  console.log('Seeding 7 Core Ayurvedic Disease Categories & Formulations...');

  for (const item of therapeuticDiseases) {
    // 1. Upsert Category
    const category = await prisma.productCategory.upsert({
      where: { name: item.categoryName },
      update: { description: item.categoryDesc },
      create: {
        name: item.categoryName,
        description: item.categoryDesc,
        isActive: true,
      },
    });

    // 2. Upsert Product
    await prisma.product.upsert({
      where: { sku: item.product.sku },
      update: {
        name: item.product.name,
        targetDisease: item.product.targetDisease,
        dosageForm: item.product.dosageForm,
        mrpPrice: item.product.mrpPrice,
        sellingPrice: item.product.sellingPrice,
        gstRate: item.product.gstRate,
        description: item.product.description,
        dosageInstructions: item.product.dosageInstructions,
        ingredients: item.product.ingredients,
        imageUrl: item.product.imageUrl,
        categoryId: category.id,
        isActive: true,
      },
      create: {
        ...item.product,
        categoryId: category.id,
      },
    });

    console.log(`✓ Seeded Disease & Product: ${item.product.targetDisease} -> ${item.product.name}`);
  }

  console.log('Successfully seeded all 7 Disease Categories & Products!');
}

seedDiseasesAndProducts()
  .catch((e) => {
    console.error('Error seeding diseases:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
