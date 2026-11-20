import { PrismaClient, RoleType } from '@prisma/client';
import * as argon2 from 'argon2';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function hashPassword(plainText: string): Promise<string> {
  return argon2.hash(plainText, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 4,
  });
}

async function main() {
  console.log('Seeding initial Melayurveda database...');

  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@melayurveda.com').toLowerCase();
  const rawAdminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Melayurveda@Admin2026!';
  const hashedPassword = await hashPassword(rawAdminPassword);

  // 1. Seed Initial Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashedPassword,
      isActive: true,
    },
    create: {
      employeeCode: 'MEL-ADM-001',
      email: adminEmail,
      passwordHash: hashedPassword,
      firstName: process.env.INITIAL_ADMIN_FIRST_NAME || 'Super',
      lastName: process.env.INITIAL_ADMIN_LAST_NAME || 'Admin',
      phoneNumber: process.env.INITIAL_ADMIN_PHONE || '9876543210',
      role: RoleType.SUPER_ADMIN,
      isActive: true,
      isAcceptingLeads: true,
    },
  });

  console.log(`Initial Super Admin verified: ${adminUser.employeeCode} (${adminUser.email})`);

  // 2. Seed Therapeutic Product Categories
  const categories = [
    { name: 'Joint & Bone Health', description: 'Ayurvedic formulations for arthritis, joint mobility, and bone density' },
    { name: 'Digestive & Metabolism', description: 'Classical herbal churna and syrups for gut health and metabolism' },
    { name: 'Immunity & Rejuvenation', description: 'Rasayana preparations, Chyawanprash, and herbal vitality boosters' },
    { name: 'Skin & Hair Wellness', description: 'Pure herbal oils, elixirs, and therapeutic skin treatments' },
    { name: 'Diabetic & Metabolic Balance', description: 'Herbal extracts supporting healthy glycemic regulation' },
  ];

  for (const cat of categories) {
    await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: cat,
    });
  }

  console.log(`Seeded ${categories.length} therapeutic product categories.`);

  // 3. Seed Lead Sources (Core Channels)
  const leadSources = [
    { name: 'Facebook Ads', sourceType: 'FACEBOOK_ADS' as any, description: 'Meta Facebook Lead Generation Ads' },
    { name: 'Instagram Ads', sourceType: 'INSTAGRAM_ADS' as any, description: 'Instagram Sponsored Lead Form Inquiries' },
    { name: 'Google Ads', sourceType: 'GOOGLE_ADS' as any, description: 'Google Search & PMax Inquiries' },
    { name: 'Website Portal', sourceType: 'WEBSITE' as any, description: 'Official Melayurveda Consultation Forms' },
    { name: 'WhatsApp Business', sourceType: 'WHATSAPP' as any, description: 'Direct Inbound WhatsApp Consultations' },
    { name: 'Manual Entry', sourceType: 'MANUAL' as any, description: 'In-clinic and offline executive entries' },
  ];

  for (const src of leadSources) {
    await prisma.leadSource.upsert({
      where: { name: src.name },
      update: { description: src.description },
      create: src,
    });
  }

  console.log(`Seeded ${leadSources.length} standard lead sources.`);
  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
