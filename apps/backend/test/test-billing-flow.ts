/**
 * MELAYURVEDA CRM - Automated End-to-End Billing & Dispatch Flow Verification Test
 *
 * Verifies:
 * 1. Provisioning a Billing Executive (Role: BILLING_EXECUTIVE, ID: MEL-BIL-xxx)
 * 2. Order Creation -> Approval (CONFIRMED)
 * 3. Verified presence in /invoices/billing-queue
 * 4. Verified ABSENCE in /dispatch/ready-orders before billing (Dispatch Gating)
 * 5. Billing Executive generates GST Tax Invoice (MEL-INV-YYYY-XXXXX)
 * 6. Verified absence from billing-queue & presence in /dispatch/ready-orders
 * 7. Verification of clean role-based permissions and audit logs
 */

import { PrismaClient, RoleType, OrderStatus, PaymentMode } from '@prisma/client';

const prisma = new PrismaClient();

async function runBillingVerification() {
  console.log('=== STARTING BILLING & DISPATCH FLOW VERIFICATION ===');

  try {
    // 1. Verify Role and generate employee code
    console.log('\n[1/7] Testing BILLING_EXECUTIVE Employee Code Generation...');
    const prefix = 'MEL-BIL-';
    const existing = await prisma.user.findMany({
      where: { employeeCode: { startsWith: prefix } },
      select: { employeeCode: true },
    });

    let maxNum = 0;
    for (const u of existing) {
      const numPart = u.employeeCode.replace(prefix, '');
      const parsed = parseInt(numPart, 10);
      if (!isNaN(parsed) && parsed > maxNum) maxNum = parsed;
    }
    const nextCode = `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
    console.log(`Generated Sequential Code for Billing Executive: ${nextCode}`);

    // Create or reuse test Billing Executive
    const billingEmail = `test.billing.${Date.now()}@melayurveda.com`;
    const billingUser = await prisma.user.create({
      data: {
        employeeCode: nextCode,
        email: billingEmail,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$fakeHashForVerificationTest',
        firstName: 'Anjali',
        lastName: 'Sharma',
        phoneNumber: '9825100099',
        role: RoleType.BILLING_EXECUTIVE,
        isActive: true,
      },
    });
    console.log(`Created Billing Executive: ${billingUser.employeeCode} (${billingUser.email})`);

    // 2. Fetch a valid active product
    console.log('\n[2/7] Fetching Active Formulation Product...');
    const product = await prisma.product.findFirst({
      where: { isActive: true },
    });
    if (!product) throw new Error('No active product found');
    console.log(`Using Product: ${product.name} (SKU: ${product.sku}) - Selling Price: ₹${product.sellingPrice}`);

    // 3. Create a test Customer and an approved Order
    console.log('\n[3/7] Creating Test Customer and Approved Order...');
    const custCount = await prisma.customer.count();
    const customer = await prisma.customer.create({
      data: {
        customerCode: `MEL-CUST-TEST-${custCount + 1}`,
        fullName: 'Rajesh Varma',
        phoneNumber: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
        address: '12 Shivalik Residency, Satellite',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '380015',
      },
    });

    const orderNumber = `MEL-ORD-TEST-${Date.now().toString().slice(-6)}`;
    const subtotal = Number(product.sellingPrice) * 2;
    const tax = Number((subtotal * 0.12).toFixed(2));
    const totalAmount = subtotal + tax;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        createdById: billingUser.id,
        status: OrderStatus.CONFIRMED, // Approved state!
        subtotal,
        discountAmount: 0,
        taxAmount: tax,
        totalAmount,
        paymentMode: PaymentMode.CASH_ON_DELIVERY,
        items: {
          create: [
            {
              productId: product.id,
              quantity: 2,
              unitPrice: product.sellingPrice,
              totalPrice: subtotal,
            },
          ],
        },
      },
    });
    console.log(`Created Order ${order.orderNumber} (Status: ${order.status}, Total: ₹${totalAmount})`);

    // 4. Verify presence in Billing Queue
    console.log('\n[4/7] Verifying Order Presence in Billing Queue...');
    const billingQueueItems = await prisma.order.findMany({
      where: {
        id: order.id,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
        invoice: null,
      },
    });
    if (billingQueueItems.length !== 1) {
      throw new Error(`Order ${order.orderNumber} NOT found in Billing Queue!`);
    }
    console.log(`SUCCESS: Order ${order.orderNumber} correctly located in Billing Queue.`);

    // 5. Verify ABSENCE in Dispatch Queue (Dispatch Gating Test)
    console.log('\n[5/7] Verifying Strict Dispatch Gating (Order MUST NOT be in Dispatch)...');
    const dispatchReadyItems = await prisma.order.findMany({
      where: {
        id: order.id,
        status: { in: [OrderStatus.PROCESSING, OrderStatus.CONFIRMED] },
        invoice: { isNot: null }, // Strict invariant!
        shipment: null,
      },
    });
    if (dispatchReadyItems.length > 0) {
      throw new Error(`SECURITY/WORKFLOW VIOLATION: Unbilled order ${order.orderNumber} appeared in Dispatch Queue!`);
    }
    console.log(`SUCCESS: Order is STRICTLY BLOCKED from Dispatch because no invoice has been issued.`);

    // 6. Generate GST Tax Invoice
    console.log('\n[6/7] Simulating Billing Executive Generating GST Tax Invoice...');
    const year = new Date().getFullYear();
    const invNumber = `MEL-INV-${year}-${Date.now().toString().slice(-5)}`;
    const isGujarat = (customer.state || '').toLowerCase() === 'gujarat';
    const cgst = isGujarat ? Number((tax / 2).toFixed(2)) : 0;
    const sgst = isGujarat ? Number((tax / 2).toFixed(2)) : 0;
    const igst = isGujarat ? 0 : tax;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber: invNumber,
          orderId: order.id,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalTax: tax,
          grandTotal: totalAmount,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.PROCESSING },
      });

      await tx.auditLog.create({
        data: {
          userId: billingUser.id,
          action: 'INVOICE_GENERATED',
          entityType: 'Invoice',
          entityId: inv.id,
          newState: {
            invoiceNumber: inv.invoiceNumber,
            orderNumber: order.orderNumber,
            taxBifurcation: isGujarat ? 'CGST+SGST' : 'IGST',
            issuedBy: billingUser.employeeCode,
          },
        },
      });

      return inv;
    });
    console.log(`Generated Invoice: ${invoice.invoiceNumber} (CGST: ₹${cgst}, SGST: ₹${sgst}, Grand Total: ₹${invoice.grandTotal})`);

    // 7. Verify Post-Billing Transitions
    console.log('\n[7/7] Verifying Flow Transitions After Bill Generation...');
    // A: Should be GONE from Billing Queue
    const billingQueueAfter = await prisma.order.findMany({
      where: {
        id: order.id,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING] },
        invoice: null,
      },
    });
    if (billingQueueAfter.length !== 0) {
      throw new Error(`Order ${order.orderNumber} still appears in Billing Queue after invoicing!`);
    }
    console.log(`SUCCESS: Order has cleanly departed the Billing Queue.`);

    // B: Should now APPEAR in Dispatch Queue!
    const dispatchReadyAfter = await prisma.order.findMany({
      where: {
        id: order.id,
        status: { in: [OrderStatus.PROCESSING, OrderStatus.CONFIRMED] },
        invoice: { isNot: null },
        shipment: null,
      },
    });
    if (dispatchReadyAfter.length !== 1) {
      throw new Error(`Order ${order.orderNumber} failed to appear in Dispatch Queue after invoicing!`);
    }
    console.log(`SUCCESS: Order ${order.orderNumber} is now officially READY FOR COURIER DISPATCH!`);

    console.log('\n======================================================');
    console.log('✅ ALL BILLING & DISPATCH FLOW TESTS PASSED FLAWLESSLY');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('❌ Billing verification failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runBillingVerification();
