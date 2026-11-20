import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runCustomerIntegrationTest() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 11 (CUSTOMER CRM & CONVERSION) ===');
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
    console.log('1. Authenticating test personas across all panels...');
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' });
    const adminToken = adminLogin.body.accessToken;

    const rameshLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    const rameshToken = rameshLogin.body.accessToken;
    const rameshId = rameshLogin.body.user.id;

    const priyaLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'priya.sharma@melayurveda.com', password: 'PendingPassword2026!' });
    const priyaToken = priyaLogin.body.accessToken;

    const amitLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'amit.desai@melayurveda.com', password: 'ApprovalPassword2026!' });
    const amitToken = amitLogin.body.accessToken;

    const nehaLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'neha.mehta@melayurveda.com', password: 'MgmtPassword2026!' });
    const nehaToken = nehaLogin.body.accessToken;

    console.log(`- Authenticated: Admin, Ramesh (Sales), Priya (Pending), Amit (Approval), Neha (${nehaLogin.body.user.employeeCode} - Management)`);

    // 2. Create a test lead
    console.log('\n2. Creating a test patient lead assigned to Ramesh...');
    const phone = '99' + Math.floor(10000000 + Math.random() * 90000000);
    const leadRes = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Ghanshyamdas Agarwal',
        phoneNumber: phone,
        city: 'Udaipur',
        productInterest: 'Ayurvedic Heart & Vata Shanti Churna',
        assignToEmployeeId: rameshId,
      });
    const lead = leadRes.body;
    console.log(`- Created lead ${lead.leadCode} (${lead.id}) with initial status: ${lead.status}`);

    // 3. Pre-condition Test 1: Management attempts to convert UNAPPROVED lead
    console.log('\n3. Testing Pre-condition: Attempting to convert lead before medical/commercial approval...');
    const unapprovedConvertRes = await request(server)
      .post(`/api/v1/customers/convert/${lead.id}`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({ address: 'Test Address' });

    console.log(`- Unapproved conversion response: HTTP ${unapprovedConvertRes.status} (Expected 400 Bad Request)`);
    if (unapprovedConvertRes.status !== 400) {
      throw new Error(`Expected HTTP 400 for unapproved lead conversion, got ${unapprovedConvertRes.status}`);
    }

    // 4. Progress Lead through the complete verified workflow:
    // Calling -> Pending Review -> Final Approval
    console.log('\n4. Progressing Lead through Calling, Pending Review, and Final Approval...');
    // Log call: INTERESTED
    await request(server)
      .post('/api/v1/calling/logs')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: lead.id,
        callOutcome: 'INTERESTED',
        durationSeconds: 150,
        notes: 'Patient confirmed package and pricing.',
      });

    // Submit to Pending Review
    const submitRes = await request(server)
      .post('/api/v1/pending-reviews/submit')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: lead.id,
        reason: 'Clinical dosage review for cardiovascular herbs',
      });
    const revId = submitRes.body.review.id;

    // Priya approves in Panel 03
    const decidePendingRes = await request(server)
      .post(`/api/v1/pending-reviews/${revId}/decide`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({
        decision: 'APPROVE',
        reviewerNotes: 'Formulation safe. Forwarded for commercial sign-off.',
      });
    const apprReqId = decidePendingRes.body.approvalRequest.id;

    // Amit approves in Panel 04
    await request(server)
      .post(`/api/v1/approvals/${apprReqId}/decide`)
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        decision: 'APPROVE',
        officerNotes: 'Medical & commercial approval granted. Lead unlocked for Customer Onboarding.',
      });

    // Verify lead status is now APPROVED
    const verifyLeadRes = await request(server)
      .get(`/api/v1/leads/${lead.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`- Lead status verified: ${verifyLeadRes.body.status} (Expected APPROVED)`);
    if (verifyLeadRes.body.status !== 'APPROVED') {
      throw new Error(`Expected lead to be APPROVED, got ${verifyLeadRes.body.status}`);
    }

    // 5. Pre-condition Test 2: Salesperson attempts to convert lead (Forbidden)
    console.log('\n5. Testing RBAC: Salesperson attempting to convert lead...');
    const salesConvertRes = await request(server)
      .post(`/api/v1/customers/convert/${lead.id}`)
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({});

    console.log(`- Sales conversion response: HTTP ${salesConvertRes.status} (Expected 403 Forbidden)`);
    if (salesConvertRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for sales converting lead, got ${salesConvertRes.status}`);
    }

    // 6. Authorized Customer Conversion by Management
    console.log('\n6. Management (Neha Mehta) converts APPROVED lead to Customer...');
    const convertRes = await request(server)
      .post(`/api/v1/customers/convert/${lead.id}`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        address: 'B-104, Shreeram Complex, Court Road',
        city: 'Udaipur',
        state: 'Rajasthan',
        pincode: '313001',
        email: 'ghanshyam.agarwal@example.com',
      });

    console.log(`- Conversion response: HTTP ${convertRes.status}`);
    console.log(`- Generated Customer Code: ${convertRes.body.customer.customerCode}`);
    console.log(`- New Lead State: ${convertRes.body.leadStatus} (Expected CONVERTED)`);

    if (
      convertRes.status !== 201 ||
      !convertRes.body.customer.customerCode.startsWith('MEL-CUST-') ||
      convertRes.body.leadStatus !== 'CONVERTED'
    ) {
      throw new Error('Customer conversion verification failed');
    }
    const customerId = convertRes.body.customer.id;

    // 7. Duplicate Conversion Defense (Idempotency)
    console.log('\n7. Testing Duplicate Conversion Defense...');
    const duplicateConvertRes = await request(server)
      .post(`/api/v1/customers/convert/${lead.id}`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({});

    console.log(`- Duplicate Conversion Response: HTTP ${duplicateConvertRes.status} (Expected 409 Conflict)`);
    if (duplicateConvertRes.status !== 409) {
      throw new Error(`Expected HTTP 409 for duplicate conversion, got ${duplicateConvertRes.status}`);
    }

    // 8. Direct Walk-in Customer Creation
    console.log('\n8. Management directly registers walk-in clinic customer...');
    const directPhone = '99' + Math.floor(10000000 + Math.random() * 90000000);
    const directCustRes = await request(server)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        fullName: 'Bhavna Ben Dave',
        phoneNumber: directPhone,
        city: 'Vadodara',
        state: 'Gujarat',
        pincode: '390001',
      });

    console.log(`- Direct customer created: ${directCustRes.body.customerCode} (HTTP ${directCustRes.status})`);
    if (directCustRes.status !== 201 || !directCustRes.body.customerCode.startsWith('MEL-CUST-')) {
      throw new Error('Direct customer creation failed');
    }

    // 9. Query Customers List
    console.log('\n9. Management queries customer CRM table (/api/v1/customers)...');
    const listRes = await request(server)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${nehaToken}`);

    console.log(`- Total customers in CRM: ${listRes.body.meta.total}`);
    const foundCustomer = listRes.body.data.find((c: any) => c.id === customerId);
    if (!foundCustomer) {
      throw new Error('Converted customer not found in customer list');
    }
    console.log(`- Found customer: ${foundCustomer.fullName} (${foundCustomer.customerCode}), Converted from Lead: ${foundCustomer.convertedFrom?.leadCode}`);

    // 10. Query Single Customer CRM Profile
    console.log('\n10. Management inspects full Customer CRM profile...');
    const profileRes = await request(server)
      .get(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${nehaToken}`);

    console.log(`- CRM Profile returned: HTTP ${profileRes.status}`);
    console.log(`  Customer: ${profileRes.body.fullName} (${profileRes.body.customerCode})`);
    console.log(`  Address: ${profileRes.body.address}, ${profileRes.body.city}, ${profileRes.body.pincode}`);
    console.log(`  Origin Lead: ${profileRes.body.convertedFrom?.leadCode}, Assigned to: ${profileRes.body.convertedFrom?.assignedTo?.firstName}`);
    console.log(`  Origin Consultation Calls: ${profileRes.body.convertedFrom?.callLogs?.length}`);

    if (profileRes.status !== 200 || !profileRes.body.convertedFrom) {
      throw new Error('Customer CRM profile retrieval failed');
    }

    // 11. Update Customer Details
    console.log('\n11. Management updates customer delivery address and contact...');
    const updateRes = await request(server)
      .patch(`/api/v1/customers/${customerId}`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({
        address: 'B-105, Updated Residency, Main Court Road',
        alternatePhone: '9825123456',
      });

    console.log(`- Customer update response: HTTP ${updateRes.status}`);
    if (updateRes.status !== 200 || updateRes.body.alternatePhone !== '9825123456') {
      throw new Error('Customer update verification failed');
    }

    // 12. Query Customer Metrics
    console.log('\n12. Management queries customer CRM metrics (/api/v1/customers/metrics)...');
    const metricsRes = await request(server)
      .get('/api/v1/customers/metrics')
      .set('Authorization', `Bearer ${nehaToken}`);

    console.log('- Customer Metrics:', metricsRes.body);
    if (metricsRes.body.totalCustomers < 2 || metricsRes.body.convertedFromLeads < 1) {
      throw new Error('Customer metrics check failed');
    }

    console.log('\n=== ALL 12 BUNDLE 11 (CUSTOMER CRM & CONVERSION) INTEGRATION TESTS PASSED 100% ===');
  } finally {
    await app.close();
  }
}

runCustomerIntegrationTest().catch((err) => {
  console.error('FATAL INTEGRATION TEST ERROR:', err);
  process.exit(1);
});
