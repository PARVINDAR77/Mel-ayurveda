import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runLeadIntegrationTest() {
  console.log('--- STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLES 04 & 05 ---');
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
    // 1. Authenticate Admin
    console.log('1. Authenticating as Super Admin...');
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' });
    const adminToken = adminLogin.body.accessToken;

    // 2. Authenticate Salesperson 1 (Ramesh Patel)
    console.log('2. Authenticating as Salesperson Ramesh Patel (MEL-SAL-001)...');
    const salesLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    const salesToken = salesLogin.body.accessToken;
    const salesId = salesLogin.body.user.id;
    console.log('Salesperson authenticated. ID:', salesId);

    // 3. Security Test: Salesperson forbidden from /api/v1/lead-sources
    console.log('\n3. Testing Security Invariant: Salesperson querying Lead Sources...');
    const forbiddenSources = await request(server)
      .get('/api/v1/lead-sources')
      .set('Authorization', `Bearer ${salesToken}`);
    console.log('Status:', forbiddenSources.status, forbiddenSources.status === 403 ? '(CORRECT 403 Forbidden)' : '(FAILED)');
    if (forbiddenSources.status !== 403) {
      throw new Error(`Expected 403, got ${forbiddenSources.status}`);
    }

    // 4. Admin querying Lead Sources (Allowed)
    console.log('\n4. Admin querying Lead Sources...');
    const adminSources = await request(server)
      .get('/api/v1/lead-sources')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log('Status:', adminSources.status, 'Sources Count:', adminSources.body.length);
    if (adminSources.status !== 200 || adminSources.body.length === 0) {
      throw new Error('Failed to retrieve lead sources as Admin');
    }

    // 5. Create Manual Lead 1: Assigned immediately to Ramesh Patel
    console.log('\n5. Creating Manual Lead 1 (Assigned to Ramesh Patel)...');
    const lead1Res = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Rajesh Patel',
        phoneNumber: '9876543210',
        city: 'Ahmedabad',
        state: 'Gujarat',
        address: 'Satellite Road',
        productInterest: 'Joint Care Oil & Tablets',
        customerRequirements: 'Knee inflammation for 2 years',
        priority: 'HIGH',
        assignToEmployeeId: salesId,
      });
    console.log('Status:', lead1Res.status);
    console.log('Lead Code:', lead1Res.body.leadCode);
    console.log('Status:', lead1Res.body.status);
    if (lead1Res.status !== 201 || lead1Res.body.leadCode !== 'MEL-LEAD-000101' || lead1Res.body.status !== 'ASSIGNED') {
      throw new Error(`Expected 201 with code MEL-LEAD-000101 and ASSIGNED status, got ${lead1Res.status}`);
    }

    // 6. Create Manual Lead 2: Unassigned
    console.log('\n6. Creating Manual Lead 2 (Unassigned)...');
    const lead2Res = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Meena Shah',
        phoneNumber: '9821234567',
        city: 'Surat',
        state: 'Gujarat',
        productInterest: 'Immunity Booster',
        priority: 'NORMAL',
      });
    console.log('Status:', lead2Res.status);
    console.log('Lead Code:', lead2Res.body.leadCode);
    console.log('Status:', lead2Res.body.status);
    if (lead2Res.status !== 201 || lead2Res.body.leadCode !== 'MEL-LEAD-000102' || lead2Res.body.status !== 'NEW') {
      throw new Error(`Expected MEL-LEAD-000102 with NEW status, got ${lead2Res.body.leadCode}`);
    }

    // 7. Test Lead Source Privacy on Salesperson List Query
    console.log('\n7. Testing Lead Source Privacy on GET /api/v1/leads for Salesperson...');
    const salesLeads = await request(server)
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${salesToken}`);
    console.log('Status:', salesLeads.status);
    console.log('Total Leads Returned to Salesperson:', salesLeads.body.data.length);
    if (salesLeads.body.data.length !== 1 || salesLeads.body.data[0].leadCode !== 'MEL-LEAD-000101') {
      throw new Error('Salesperson was returned leads not assigned to them');
    }

    // Verify source fields are completely omitted from response
    const firstLead = salesLeads.body.data[0];
    const sourceLeaked = 'sourceType' in firstLead || 'sourceId' in firstLead || 'campaignName' in firstLead;
    console.log('Are source attributes quarantined?:', !sourceLeaked ? 'YES (100% Privacy Enforced)' : 'LEAK DETECTED!');
    if (sourceLeaked) {
      throw new Error('CRITICAL SECURITY VIOLATION: Lead source metadata leaked to salesperson!');
    }

    // 8. Test Anti-IDOR Protection: Salesperson viewing unassigned lead
    console.log('\n8. Testing Anti-IDOR: Salesperson attempting to view unassigned lead MEL-LEAD-000102...');
    const idorRes = await request(server)
      .get(`/api/v1/leads/${lead2Res.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`);
    console.log('Status:', idorRes.status, idorRes.status === 403 ? '(CORRECT 403 Forbidden Anti-IDOR)' : '(FAILED)');
    if (idorRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for IDOR attack, got ${idorRes.status}`);
    }

    // 9. Test Duplicate Phone Lookup
    console.log('\n9. Testing Duplicate Lead Detection for 9876543210...');
    const dupRes = await request(server)
      .get('/api/v1/leads/check-duplicate?phone=9876543210')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log('Status:', dupRes.status);
    console.log('Is Duplicate:', dupRes.body.isDuplicate);
    console.log('Matched Existing Lead:', dupRes.body.existingLead?.leadCode);
    if (dupRes.status !== 200 || !dupRes.body.isDuplicate || dupRes.body.existingLead?.leadCode !== 'MEL-LEAD-000101') {
      throw new Error('Duplicate lead detection failed');
    }

    // 10. Update Lead Notes by Salesperson on their assigned lead
    console.log('\n10. Updating Lead Notes by Assigned Salesperson...');
    const updateRes = await request(server)
      .patch(`/api/v1/leads/${lead1Res.body.id}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        notes: 'Consultation completed. Patient agreed to 3-month course.',
      });
    console.log('Status:', updateRes.status);
    console.log('Updated Notes:', updateRes.body.notes);
    if (updateRes.status !== 200 || !updateRes.body.notes.includes('3-month course')) {
      throw new Error('Failed to update lead');
    }

    console.log('\n✅ ALL BUNDLE 04 & 05 LIVE INTEGRATION TESTS PASSED 100%!');
  } finally {
    await app.close();
  }
}

runLeadIntegrationTest().catch((err) => {
  console.error('Lead integration test failed:', err);
  process.exit(1);
});
