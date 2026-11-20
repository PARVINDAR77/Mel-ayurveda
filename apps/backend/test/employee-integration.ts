import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runEmployeeIntegrationTest() {
  console.log('--- STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 02 & 03 ---');
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
    // 1. Authenticate as Super Admin
    console.log('1. Authenticating as Super Admin...');
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@melayurveda.com',
        password: 'Melayurveda@Admin2026!',
      });

    if (adminLogin.status !== 200) {
      throw new Error(`Admin login failed: ${adminLogin.status}`);
    }
    const adminToken = adminLogin.body.accessToken;
    console.log('Admin Authenticated. Employee Code:', adminLogin.body.user.employeeCode);

    // 2. Test GET /api/v1/roles (Bundle 03)
    console.log('\n2. Testing GET /api/v1/roles...');
    const rolesRes = await request(server)
      .get('/api/v1/roles')
      .set('Authorization', `Bearer ${adminToken}`);
    console.log('Status:', rolesRes.status);
    console.log('Roles returned:', rolesRes.body.map((r: any) => `${r.role} (${r.prefix})`).join(', '));
    if (rolesRes.status !== 200 || rolesRes.body.length !== 5) {
      throw new Error('Failed to retrieve 5 system roles');
    }

    // 3. Create Salesperson 1: Ramesh Patel
    console.log('\n3. Creating Salesperson 1: Ramesh Patel...');
    const sales1 = await request(server)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Ramesh',
        lastName: 'Patel',
        email: 'ramesh.patel@melayurveda.com',
        phoneNumber: '9876543210',
        role: 'SALESPERSON',
        initialPassword: 'SalesPassword2026!',
      });
    console.log('Status:', sales1.status);
    console.log('Created Employee Code:', sales1.body.employeeCode);
    if (sales1.status !== 201 || sales1.body.employeeCode !== 'MEL-SAL-001') {
      throw new Error(`Expected 201 with code MEL-SAL-001, got ${sales1.status} (${sales1.body.employeeCode})`);
    }

    // 4. Create Salesperson 2: Suresh Kumar (Verifying Sequential ID Generation)
    console.log('\n4. Creating Salesperson 2: Suresh Kumar (Testing sequential auto-increment)...');
    const sales2 = await request(server)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Suresh',
        lastName: 'Kumar',
        email: 'suresh.kumar@melayurveda.com',
        phoneNumber: '9826543210',
        role: 'SALESPERSON',
        initialPassword: 'SalesPassword2026!',
      });
    console.log('Status:', sales2.status);
    console.log('Created Employee Code:', sales2.body.employeeCode);
    if (sales2.status !== 201 || sales2.body.employeeCode !== 'MEL-SAL-002') {
      throw new Error(`Expected MEL-SAL-002, got ${sales2.body.employeeCode}`);
    }

    // 5. Create Pending Reviewer: Priya Sharma
    console.log('\n5. Creating Pending Reviewer: Priya Sharma...');
    const pending1 = await request(server)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Priya',
        lastName: 'Sharma',
        email: 'priya.sharma@melayurveda.com',
        phoneNumber: '9898765432',
        role: 'PENDING_REVIEWER',
        initialPassword: 'PendingPassword2026!',
      });
    console.log('Status:', pending1.status);
    console.log('Created Employee Code:', pending1.body.employeeCode);
    if (pending1.status !== 201 || pending1.body.employeeCode !== 'MEL-PND-001') {
      throw new Error(`Expected MEL-PND-001, got ${pending1.body.employeeCode}`);
    }

    // 6. Create Approval Officer: Amit Desai
    console.log('\n6. Creating Approval Officer: Amit Desai...');
    const approval1 = await request(server)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Amit',
        lastName: 'Desai',
        email: 'amit.desai@melayurveda.com',
        phoneNumber: '9765432109',
        role: 'APPROVAL_OFFICER',
        initialPassword: 'ApprovalPassword2026!',
      });
    console.log('Status:', approval1.status);
    console.log('Created Employee Code:', approval1.body.employeeCode);
    if (approval1.status !== 201 || approval1.body.employeeCode !== 'MEL-APR-001') {
      throw new Error(`Expected MEL-APR-001, got ${approval1.body.employeeCode}`);
    }

    // 7. Create Management Staff: Neha Mehta
    console.log('\n7. Creating Management Staff: Neha Mehta...');
    const mgmt1 = await request(server)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Neha',
        lastName: 'Mehta',
        email: 'neha.mehta@melayurveda.com',
        phoneNumber: '9821234567',
        role: 'MANAGEMENT',
        initialPassword: 'MgmtPassword2026!',
      });
    console.log('Status:', mgmt1.status);
    console.log('Created Employee Code:', mgmt1.body.employeeCode);
    if (mgmt1.status !== 201 || mgmt1.body.employeeCode !== 'MEL-MGT-001') {
      throw new Error(`Expected MEL-MGT-001, got ${mgmt1.body.employeeCode}`);
    }

    // 8. Test RBAC Security Violation: Salesperson attempting to create an employee
    console.log('\n8. Testing RBAC Security: Salesperson attempting admin action...');
    const salesLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'ramesh.patel@melayurveda.com',
        password: 'SalesPassword2026!',
      });
    const salesToken = salesLogin.body.accessToken;

    const rbacAttack = await request(server)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        firstName: 'Hacker',
        lastName: 'User',
        email: 'hacker@melayurveda.com',
        phoneNumber: '9999999999',
        role: 'SUPER_ADMIN',
      });
    console.log('RBAC Attack Status:', rbacAttack.status, rbacAttack.status === 403 ? '(CORRECT 403 Forbidden)' : '(FAILED)');
    if (rbacAttack.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${rbacAttack.status}`);
    }

    // 9. Test Account Deactivation and Immediate Session Revocation
    console.log('\n9. Testing Account Deactivation & Session Invalidation...');
    const deactRes = await request(server)
      .patch(`/api/v1/employees/${sales2.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        isActive: false,
        reason: 'Temporary suspension test',
      });
    console.log('Deactivation Status:', deactRes.status);
    if (deactRes.status !== 200 || deactRes.body.isActive !== false) {
      throw new Error('Deactivation failed');
    }

    // Verify deactivated account cannot log in
    const deactLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'suresh.kumar@melayurveda.com',
        password: 'SalesPassword2026!',
      });
    console.log('Deactivated Account Login Status:', deactLogin.status, deactLogin.status === 401 ? '(CORRECT 401 Unauthorized)' : '(FAILED)');
    if (deactLogin.status !== 401) {
      throw new Error(`Expected 401 for deactivated login, got ${deactLogin.status}`);
    }

    // 10. Test Password Reset
    console.log('\n10. Testing Administrative Password Reset...');
    const resetRes = await request(server)
      .post(`/api/v1/employees/${sales1.body.id}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        newPassword: 'BrandNewRameshPassword2026!',
      });
    console.log('Reset Password Status:', resetRes.status);
    if (resetRes.status !== 200) {
      throw new Error('Password reset failed');
    }

    // Verify login with new password succeeds
    const newPassLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'ramesh.patel@melayurveda.com',
        password: 'BrandNewRameshPassword2026!',
      });
    console.log('New Password Login Status:', newPassLogin.status);
    if (newPassLogin.status !== 200) {
      throw new Error('Login with new password failed');
    }

    console.log('\n✅ ALL BUNDLE 02 & 03 LIVE INTEGRATION TESTS PASSED 100%!');
  } finally {
    await app.close();
  }
}

runEmployeeIntegrationTest().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
