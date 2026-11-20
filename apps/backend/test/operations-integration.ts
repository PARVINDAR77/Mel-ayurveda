import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runOperationsIntegrationTest() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 13 (OPERATIONS, INVOICES, INVENTORY, DISPATCH) ===');
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
    // 1. Authenticate Management Persona
    console.log('1. Authenticating Operations Manager (Neha Mehta)...');
    const nehaLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'neha.mehta@melayurveda.com', password: 'MgmtPassword2026!' });
    const nehaToken = nehaLogin.body.accessToken;

    console.log(`- Authenticated as ${nehaLogin.body.user.employeeCode} (${nehaLogin.body.user.firstName})`);

    // 2. Fetch existing products
    const prodRes = await request(server)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${nehaToken}`);
    const product = prodRes.body.data[0];
    console.log(`- Using product: ${product.name} (SKU: ${product.sku})`);

    // 3. Test Warehouse Restock
    console.log('\n3. Testing Warehouse Restock (/api/v1/inventory/restock)...');
    const restockRes = await request(server)
      .post('/api/v1/inventory/restock')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        productId: product.id,
        quantity: 50,
        batchNumber: 'BATCH-2026-NOV-TEST',
        notes: 'Factory restock from Bharuch plant',
      });

    console.log(`- Restock response: HTTP ${restockRes.status}, New Available: ${restockRes.body.inventory.availableQuantity}`);
    if (restockRes.status !== 201) {
      throw new Error(`Restock failed: status=${restockRes.status}`);
    }

    // 4. Query Warehouse Stock Levels
    console.log('\n4. Querying warehouse inventory levels (/api/v1/inventory)...');
    const invLevelsRes = await request(server)
      .get('/api/v1/inventory')
      .set('Authorization', `Bearer ${nehaToken}`);
    console.log(`- Retrieved stock for ${invLevelsRes.body.length} products`);

    // 5. Create Customer A (Gujarat - Intra-state) and Customer B (Rajasthan - Inter-state)
    console.log('\n5. Creating Customer A (Gujarat) and Customer B (Rajasthan)...');
    const phoneA = '94' + Math.floor(10000000 + Math.random() * 90000000);
    const phoneB = '94' + Math.floor(10000000 + Math.random() * 90000000);

    const custARes = await request(server)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        fullName: 'Manish Bhai Shah',
        phoneNumber: phoneA,
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380009',
      });
    const customerA = custARes.body;

    const custBRes = await request(server)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        fullName: 'Vikram Singh Rathore',
        phoneNumber: phoneB,
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      });
    const customerB = custBRes.body;

    console.log(`- Customer A: ${customerA.fullName} (${customerA.state}) - ${customerA.customerCode}`);
    console.log(`- Customer B: ${customerB.fullName} (${customerB.state}) - ${customerB.customerCode}`);

    // 6. Create & Confirm Order A (Intra-state)
    console.log('\n6. Creating and confirming Order A for Customer A (Gujarat)...');
    const orderARes = await request(server)
      .post('/api/v1/orders/draft')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        customerId: customerA.id,
        items: [{ productId: product.id, quantity: 2 }],
      });
    const orderA = orderARes.body;

    await request(server)
      .post(`/api/v1/orders/${orderA.id}/confirm`)
      .set('Authorization', `Bearer ${nehaToken}`);

    // 7. Generate Invoice A (Intra-state: CGST 50% + SGST 50%)
    console.log('\n7. Generating GST Invoice for Order A (Intra-State: Gujarat)...');
    const invoiceARes = await request(server)
      .post(`/api/v1/invoices/generate/${orderA.id}`)
      .set('Authorization', `Bearer ${nehaToken}`);

    const invA = invoiceARes.body;
    console.log(`- Invoice A: ${invA.invoiceNumber} (HTTP ${invoiceARes.status})`);
    console.log(`  Tax Bifurcation -> CGST: ₹${invA.cgstAmount}, SGST: ₹${invA.sgstAmount}, IGST: ₹${invA.igstAmount}`);

    if (
      invoiceARes.status !== 201 ||
      Number(invA.cgstAmount) <= 0 ||
      Number(invA.sgstAmount) <= 0 ||
      Number(invA.igstAmount) !== 0
    ) {
      throw new Error('Intra-state GST tax bifurcation failed');
    }

    // 8. Create & Confirm Order B (Inter-state)
    console.log('\n8. Creating and confirming Order B for Customer B (Rajasthan)...');
    const orderBRes = await request(server)
      .post('/api/v1/orders/draft')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        customerId: customerB.id,
        items: [{ productId: product.id, quantity: 1 }],
      });
    const orderB = orderBRes.body;

    await request(server)
      .post(`/api/v1/orders/${orderB.id}/confirm`)
      .set('Authorization', `Bearer ${nehaToken}`);

    // 9. Generate Invoice B (Inter-state: IGST 100%)
    console.log('\n9. Generating GST Invoice for Order B (Inter-State: Rajasthan)...');
    const invoiceBRes = await request(server)
      .post(`/api/v1/invoices/generate/${orderB.id}`)
      .set('Authorization', `Bearer ${nehaToken}`);

    const invB = invoiceBRes.body;
    console.log(`- Invoice B: ${invB.invoiceNumber} (HTTP ${invoiceBRes.status})`);
    console.log(`  Tax Bifurcation -> CGST: ₹${invB.cgstAmount}, SGST: ₹${invB.sgstAmount}, IGST: ₹${invB.igstAmount}`);

    if (
      invoiceBRes.status !== 201 ||
      Number(invB.cgstAmount) !== 0 ||
      Number(invB.sgstAmount) !== 0 ||
      Number(invB.igstAmount) <= 0
    ) {
      throw new Error('Inter-state IGST tax bifurcation failed');
    }

    // 10. Duplicate Invoice Generation Defense
    console.log('\n10. Testing Duplicate Invoice Defense...');
    const duplicateInvRes = await request(server)
      .post(`/api/v1/invoices/generate/${orderA.id}`)
      .set('Authorization', `Bearer ${nehaToken}`);

    console.log(`- Duplicate invoice response: HTTP ${duplicateInvRes.status} (Expected 409 Conflict)`);
    if (duplicateInvRes.status !== 409) {
      throw new Error(`Expected HTTP 409 for duplicate invoice, got ${duplicateInvRes.status}`);
    }

    // 11. Courier Dispatch Test for Order A
    console.log('\n11. Dispatching Order A with Courier Partner & AWB...');
    const awb = 'DELHI-' + Math.floor(10000000 + Math.random() * 90000000);
    const dispatchRes = await request(server)
      .post(`/api/v1/dispatch/${orderA.id}`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        courierPartner: 'Delhivery Surface Express',
        trackingAwb: awb,
        trackingUrl: `https://www.delhivery.com/track/package/${awb}`,
      });

    console.log(`- Dispatch response: HTTP ${dispatchRes.status}, Status: ${dispatchRes.body.status}, AWB: ${dispatchRes.body.trackingAwb}`);
    if (dispatchRes.status !== 201 || dispatchRes.body.status !== 'MANIFESTED') {
      throw new Error('Dispatch manifest creation failed');
    }
    const shipmentId = dispatchRes.body.id;

    // Verify order status is now SHIPPED
    const checkOrderARes = await request(server)
      .get(`/api/v1/orders/${orderA.id}`)
      .set('Authorization', `Bearer ${nehaToken}`);
    console.log(`- Order A status after dispatch: ${checkOrderARes.body.status} (Expected SHIPPED)`);
    if (checkOrderARes.body.status !== 'SHIPPED') {
      throw new Error(`Expected order status SHIPPED, got ${checkOrderARes.body.status}`);
    }

    // 12. Update Shipment Status to DELIVERED (Order Fulfillment)
    console.log('\n12. Updating shipment transit status to DELIVERED...');
    const deliverRes = await request(server)
      .patch(`/api/v1/dispatch/${shipmentId}/status`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({ status: 'DELIVERED' });

    console.log(`- Delivery update response: HTTP ${deliverRes.status}, Status: ${deliverRes.body.status}`);
    if (deliverRes.status !== 200 || deliverRes.body.status !== 'DELIVERED') {
      throw new Error('Delivery status update failed');
    }

    // Verify order is now DELIVERED and COD is marked PAID
    const deliveredOrderRes = await request(server)
      .get(`/api/v1/orders/${orderA.id}`)
      .set('Authorization', `Bearer ${nehaToken}`);
    console.log(`- Order status: ${deliveredOrderRes.body.status}, Payment Status: ${deliveredOrderRes.body.paymentStatus}`);
    if (
      deliveredOrderRes.body.status !== 'DELIVERED' ||
      deliveredOrderRes.body.paymentStatus !== 'PAID'
    ) {
      throw new Error('Order delivery fulfillment verification failed');
    }

    // 13. Query Consignment Tracking by Order ID
    console.log('\n13. Querying tracking details for Order A (/api/v1/dispatch/order/:orderId)...');
    const trackRes = await request(server)
      .get(`/api/v1/dispatch/order/${orderA.id}`)
      .set('Authorization', `Bearer ${nehaToken}`);

    console.log(`- Tracking found: Courier: ${trackRes.body.courierPartner}, AWB: ${trackRes.body.trackingAwb}, Status: ${trackRes.body.status}`);
    if (trackRes.status !== 200 || trackRes.body.trackingAwb !== awb) {
      throw new Error('Shipment tracking lookup failed');
    }

    console.log('\n=== ALL 13 BUNDLE 13 (OPERATIONS, INVOICES, INVENTORY, DISPATCH) INTEGRATION TESTS PASSED 100% ===');
  } finally {
    await app.close();
  }
}

runOperationsIntegrationTest().catch((err) => {
  console.error('FATAL INTEGRATION TEST ERROR:', err);
  process.exit(1);
});
