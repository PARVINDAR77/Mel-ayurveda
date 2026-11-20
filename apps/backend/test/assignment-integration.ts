import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runAssignmentIntegrationTest() {
  console.log('--- STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 06 ---');
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

    // 2. Fetch Salespeople
    console.log('2. Fetching active salespeople...');
    const empRes = await request(server)
      .get('/api/v1/employees?role=SALESPERSON')
      .set('Authorization', `Bearer ${adminToken}`);

    const salespeople = empRes.body.data;
    console.log(`Found ${salespeople.length} salespeople:`, salespeople.map((s: any) => `${s.employeeCode} (${s.firstName})`).join(', '));
    const ramesh = salespeople.find((s: any) => s.employeeCode === 'MEL-SAL-001');
    const suresh = salespeople.find((s: any) => s.employeeCode === 'MEL-SAL-002');

    // Ensure Suresh is active
    if (!suresh.isActive) {
      console.log('Re-activating Suresh Kumar for round-robin testing...');
      await request(server)
        .patch(`/api/v1/employees/${suresh.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: true });
    }

    // 3. Create 3 Fresh Unassigned Leads
    console.log('\n3. Creating 3 unassigned manual leads...');
    const leadA = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerName: 'Dinesh Kumar', phoneNumber: '9723456789', city: 'Vadodara', productInterest: 'Immunity' });

    const leadB = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerName: 'Neha Desai', phoneNumber: '9898765432', city: 'Rajkot', productInterest: 'Joint Care' });

    const leadC = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ customerName: 'Kavita Sharma', phoneNumber: '9826543210', city: 'Surat', productInterest: 'Digestive' });

    console.log('Created leads:', leadA.body.leadCode, leadB.body.leadCode, leadC.body.leadCode);

    // 4. View Unassigned Queue
    console.log('\n4. Viewing unassigned lead intake queue...');
    const unassignedRes = await request(server)
      .get('/api/v1/lead-assignments/unassigned')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log('Unassigned leads count in queue:', unassignedRes.body.length);
    if (unassignedRes.body.length < 3) {
      throw new Error('Unassigned queue count mismatch');
    }

    // 5. Test Manual Single Assignment: Assign Lead A to Ramesh Patel
    console.log(`\n5. Assigning single lead ${leadA.body.leadCode} to Ramesh Patel (${ramesh.employeeCode})...`);
    const assignRes = await request(server)
      .post('/api/v1/lead-assignments/assign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        leadId: leadA.body.id,
        assignedToId: ramesh.id,
        reason: 'Manual test assignment by Super Admin',
      });
    console.log('Status:', assignRes.status);
    console.log('Assigned To:', assignRes.body.lead?.assignedTo?.employeeCode);
    if (assignRes.status !== 201 && assignRes.status !== 200) {
      throw new Error(`Assignment failed: ${assignRes.status}`);
    }

    // 6. Test Reassignment: Reassign Lead A to Suresh Kumar with mandatory reason
    console.log(`\n6. Reassigning lead ${leadA.body.leadCode} from Ramesh to Suresh (${suresh.employeeCode})...`);
    const reassignRes = await request(server)
      .post('/api/v1/lead-assignments/reassign')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        leadId: leadA.body.id,
        newAssignedToId: suresh.id,
        reason: 'Workload balancing shift to Suresh',
      });
    console.log('Status:', reassignRes.status);
    console.log('New Assignee:', reassignRes.body.lead?.assignedTo?.employeeCode);
    if (reassignRes.body.lead?.assignedTo?.employeeCode !== 'MEL-SAL-002') {
      throw new Error('Reassignment failed');
    }

    // 7. Verify Historical Assignment Audit Trail
    console.log(`\n7. Checking assignment history audit trail for ${leadA.body.leadCode}...`);
    const historyRes = await request(server)
      .get(`/api/v1/lead-assignments/lead/${leadA.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    console.log('Assignment History Rows:', historyRes.body.history.length);
    console.log('Timeline:');
    historyRes.body.history.forEach((h: any, i: number) => {
      console.log(`  [${i + 1}] Assigned to: ${h.assignedTo.employeeCode} | Active: ${h.isActive} | Reason: ${h.reassignmentReason}`);
    });
    if (historyRes.body.history.length < 2) {
      throw new Error('Historical assignment records were not preserved!');
    }

    // 8. Test Automated Round-Robin Distribution for remaining unassigned leads
    console.log('\n8. Triggering Automated Round-Robin Lead Distribution...');
    const rrRes = await request(server)
      .post('/api/v1/lead-assignments/distribute/round-robin')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log('Status:', rrRes.status);
    console.log('Distributed Count:', rrRes.body.distributedCount);
    console.log('Distribution Map:', rrRes.body.assignments);
    if (rrRes.status !== 200 || rrRes.body.distributedCount < 2) {
      throw new Error('Round-robin distribution failed');
    }

    // 9. Verify RBAC Security: Salesperson attempting to assign leads
    console.log('\n9. Testing RBAC Security: Salesperson attempting lead assignment...');
    const salesLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    const salesToken = salesLogin.body.accessToken;

    const rbacAttack = await request(server)
      .post('/api/v1/lead-assignments/assign')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        leadId: leadB.body.id,
        assignedToId: ramesh.id,
      });
    console.log('Status:', rbacAttack.status, rbacAttack.status === 403 ? '(CORRECT 403 Forbidden)' : '(FAILED)');
    if (rbacAttack.status !== 403) {
      throw new Error(`Expected 403, got ${rbacAttack.status}`);
    }

    console.log('\n✅ ALL BUNDLE 06 LIVE INTEGRATION TESTS PASSED 100%!');
  } finally {
    await app.close();
  }
}

runAssignmentIntegrationTest().catch((err) => {
  console.error('Assignment integration test failed:', err);
  process.exit(1);
});
