import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runProductOrderIntegrationTest() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 12 (PRODUCTS & ORDERS) ===');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  const server = app.getHttpServer();

  try {
    // 1. Authenticate personas
    console.log('1. Authenticating personas (Admin, Sales, Management)...');
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' });
    const adminToken = adminLogin.body.accessToken;

    const rameshLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    const rameshToken = rameshLogin.body.accessToken;

    const nehaLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'neha.mehta@melayurveda.com', password: 'MgmtPassword2026!' });
    const nehaToken = nehaLogin.body.accessToken;

    console.log('- Personas authenticated: Admin, Ramesh, Neha (Management)');

    // 2. Fetch therapeutic categories
    console.log('\n2. Fetching therapeutic disease categories (/api/v1/products/categories)...');
    const catRes = await request(server)
      .get('/api/v1/products/categories')
      .set('Authorization', `Bearer ${rameshToken}`);

    console.log(`- Retrieved ${catRes.body.length} categories:`, catRes.body.map((c: any) => c.name).join(', '));
    if (catRes.body.length === 0) {
      throw new Error('Expected at least 1 product category');
    }
    const jointCategory = catRes.body.find((c: any) => c.name.includes('Joint')) || catRes.body[0];

    // 3. Register a new Ayurvedic formulation
    console.log(`\n3. Registering formulation in "${jointCategory.name}"...`);
    const sku = 'MEL-SKU-' + Math.floor(1000 + Math.random() * 9000);
    const prodRes = await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        sku,
        name: 'Shallaki Nirgundi Joint Care Tablets',
        categoryId: jointCategory.id,
        description: 'Classical Ayurvedic tablets for osteoarthritis and mobility',
        mrpPrice: 899,
        sellingPrice: 699,
        gstRate: 12.0,
        initialStock: 100,
      });

    console.log(`- Product created: ${prodRes.body.name} (SKU: ${prodRes.body.sku})`);
    console.log(`  Initial Inventory Available: ${prodRes.body.inventory.availableQuantity}`);
    if (prodRes.status !== 201 || prodRes.body.inventory.availableQuantity !== 100) {
      throw new Error('Product creation failed');
    }
    const productId = prodRes.body.id;

    // 4. Duplicate SKU Rejection Test
    console.log('\n4. Testing Duplicate SKU Rejection...');
    const duplicateSkuRes = await request(server)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        sku,
        name: 'Duplicate SKU product',
        categoryId: jointCategory.id,
        mrpPrice: 500,
        sellingPrice: 400,
      });

    console.log(`- Duplicate SKU response: HTTP ${duplicateSkuRes.status} (Expected 409 Conflict)`);
    if (duplicateSkuRes.status !== 409) {
      throw new Error(`Expected HTTP 409 for duplicate SKU, got ${duplicateSkuRes.status}`);
    }

    // 5. Create a customer for order placement
    console.log('\n5. Creating verified customer for order placement...');
    const custPhone = '95' + Math.floor(10000000 + Math.random() * 90000000);
    const custRes = await request(server)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        fullName: 'Rajesh Bhai Vora',
        phoneNumber: custPhone,
        city: 'Surat',
        state: 'Gujarat',
        pincode: '395001',
      });
    const customer = custRes.body;
    console.log(`- Customer created: ${customer.fullName} (${customer.customerCode})`);

    // 6. Salesperson creates draft order
    console.log('\n6. Ramesh drafts an order for customer (2 units of tablets)...');
    const draftRes = await request(server)
      .post('/api/v1/orders/draft')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        customerId: customer.id,
        items: [
          { productId, quantity: 2 },
        ],
        discountAmount: 100,
        notes: '2-month supply. Take 1 tablet morning and evening with warm water.',
      });

    console.log(`- Draft Order Created: ${draftRes.body.orderNumber} (HTTP ${draftRes.status})`);
    console.log(`  Subtotal: ₹${draftRes.body.subtotal}, Tax: ₹${draftRes.body.taxAmount}, Total: ₹${draftRes.body.totalAmount}`);
    console.log(`  Status: ${draftRes.body.status} (Expected DRAFT)`);

    if (draftRes.status !== 201 || draftRes.body.status !== 'DRAFT') {
      throw new Error('Draft order creation failed');
    }
    const orderId = draftRes.body.id;

    // 7. Insufficient Inventory Defense
    console.log('\n7. Testing Insufficient Stock Rejection (Attempting to order 500 units)...');
    const excessDraftRes = await request(server)
      .post('/api/v1/orders/draft')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        customerId: customer.id,
        items: [
          { productId, quantity: 500 }, // Only 100 available!
        ],
      });
    const excessOrderId = excessDraftRes.body.id;

    const excessConfirmRes = await request(server)
      .post(`/api/v1/orders/${excessOrderId}/confirm`)
      .set('Authorization', `Bearer ${nehaToken}`);

    console.log(`- Insufficient Stock Confirm response: HTTP ${excessConfirmRes.status} (Expected 400 Bad Request)`);
    if (excessConfirmRes.status !== 400) {
      throw new Error(`Expected HTTP 400 for insufficient stock confirmation, got ${excessConfirmRes.status}`);
    }

    // 8. Successful Order Confirmation & Atomic Stock Reservation
    console.log('\n8. Management confirms 2-unit order with atomic inventory reservation...');
    const confirmRes = await request(server)
      .post(`/api/v1/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${nehaToken}`);

    console.log(`- Confirm response: HTTP ${confirmRes.status}, Status: ${confirmRes.body.status}`);
    if (confirmRes.status !== 200 && confirmRes.status !== 201 || confirmRes.body.status !== 'CONFIRMED') {
      throw new Error(`Order confirmation failed: status=${confirmRes.status}`);
    }

    // 9. Verify Inventory levels (Available should be 98, Reserved should be 2)
    console.log('\n9. Verifying updated warehouse stock levels...');
    const checkProdRes = await request(server)
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${nehaToken}`);

    const inv = checkProdRes.body.inventory;
    console.log(`- Stock after confirmation -> Available: ${inv.availableQuantity} (Expected 98), Reserved: ${inv.reservedQuantity} (Expected 2)`);
    if (inv.availableQuantity !== 98 || inv.reservedQuantity !== 2) {
      throw new Error(`Expected available=98 and reserved=2, got available=${inv.availableQuantity}, reserved=${inv.reservedQuantity}`);
    }

    // 10. Query Orders List and Metrics
    console.log('\n10. Querying Orders and Operations Metrics...');
    const ordersListRes = await request(server)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${nehaToken}`);
    console.log(`- Total orders retrieved: ${ordersListRes.body.meta.total}`);

    const metricsRes = await request(server)
      .get('/api/v1/orders/metrics')
      .set('Authorization', `Bearer ${nehaToken}`);
    console.log('- Orders Metrics:', metricsRes.body);
    if (metricsRes.body.confirmedCount < 1) {
      throw new Error('Expected at least 1 confirmed order');
    }

    // 11. Order Cancellation & Stock Release
    console.log('\n11. Cancelling order and verifying atomic stock release back to available pool...');
    const cancelRes = await request(server)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({ reason: 'Customer changed mind prior to dispatch' });

    console.log(`- Order Cancel response: HTTP ${cancelRes.status}, Status: ${cancelRes.body.status}`);
    if (cancelRes.body.status !== 'CANCELLED') {
      throw new Error('Order cancellation failed');
    }

    // Verify stock returned to available: Available=100, Reserved=0
    const recheckProdRes = await request(server)
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${nehaToken}`);

    const restoredInv = recheckProdRes.body.inventory;
    console.log(`- Stock after cancellation -> Available: ${restoredInv.availableQuantity} (Expected 100), Reserved: ${restoredInv.reservedQuantity} (Expected 0)`);
    if (restoredInv.availableQuantity !== 100 || restoredInv.reservedQuantity !== 0) {
      throw new Error(`Stock release failed: available=${restoredInv.availableQuantity}, reserved=${restoredInv.reservedQuantity}`);
    }

    console.log('\n=== ALL 11 BUNDLE 12 (PRODUCTS, CATEGORIES & ORDERS) INTEGRATION TESTS PASSED 100% ===');
  } finally {
    await app.close();
  }
}

runProductOrderIntegrationTest().catch((err) => {
  console.error('FATAL INTEGRATION TEST ERROR:', err);
  process.exit(1);
});
