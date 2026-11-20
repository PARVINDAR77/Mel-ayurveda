import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

async function runLiveNotificationsAndAuditTests() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 15 (NOTIFICATIONS & ENTERPRISE AUDIT) ===');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleRef.createNestApplication();
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
    // 1. Authenticate Admin and Salesperson
    console.log('1. Authenticating Admin and Salesperson...');
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' });
    const adminToken = adminLogin.body.accessToken;
    const adminUser = adminLogin.body.user;

    const salesLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    const salesToken = salesLogin.body.accessToken;
    const salesUser = salesLogin.body.user;

    console.log(`- Admin authenticated: ${adminUser.employeeCode}`);
    console.log(`- Salesperson authenticated: ${salesUser.employeeCode}`);

    // 2. Dispatch a Notification to Salesperson
    console.log('\n2. Dispatching notification to Salesperson (POST /api/v1/notifications)...');
    const dispatchRes = await request(server)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: salesUser.id,
        title: 'New High Priority Lead Assigned',
        message: 'Lead MEL-LEAD-00100 has been assigned to your calling queue.',
        type: 'LEAD_ASSIGNED',
        link: '/sales/leads/MEL-LEAD-00100',
      });

    if (dispatchRes.status !== 201) {
      throw new Error(`Dispatch failed: ${dispatchRes.status} ${JSON.stringify(dispatchRes.body)}`);
    }
    const notifId = dispatchRes.body.id;
    console.log(`- Notification dispatched: ${notifId} (HTTP 201)`);

    // 3. Query Notifications as Salesperson
    console.log('\n3. Querying notifications as Salesperson (GET /api/v1/notifications)...');
    const listRes = await request(server)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${salesToken}`);

    if (listRes.status !== 200) {
      throw new Error(`List notifications failed: ${listRes.status}`);
    }
    console.log(`- Notifications retrieved: Total=${listRes.body.meta.total}, Unread=${listRes.body.meta.unreadCount}`);

    // 4. Test Anti-IDOR on Mark as Read
    console.log('\n4. Testing Anti-IDOR Protection (Admin trying to mark Salesperson notification as read)...');
    const idorRes = await request(server)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (idorRes.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for cross-user notification read, got ${idorRes.status}`);
    }
    console.log('- Anti-IDOR Guard: HTTP 403 Forbidden (PASS)');

    // 5. Mark as Read by Owner
    console.log('\n5. Marking notification as read by legitimate owner (PATCH /api/v1/notifications/:id/read)...');
    const readRes = await request(server)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${salesToken}`);

    if (readRes.status !== 200 || !readRes.body.isRead) {
      throw new Error(`Mark as read failed: ${readRes.status}`);
    }
    console.log(`- Notification marked read: isRead=${readRes.body.isRead}, readAt=${readRes.body.readAt}`);

    // 6. Test Mark All as Read
    console.log('\n6. Dispatching 2 more notifications and testing mark-all-as-read...');
    await request(server)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: salesUser.id,
        title: 'Review Complete',
        message: 'Your submitted review was approved.',
        type: 'APPROVAL_GRANTED',
      });
    await request(server)
      .post('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: salesUser.id,
        title: 'Daily Calling Target',
        message: 'You have 5 follow-ups scheduled for today.',
        type: 'INFO',
      });

    const markAllRes = await request(server)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${salesToken}`);

    if (markAllRes.status !== 200 || markAllRes.body.updatedCount < 2) {
      throw new Error(`Mark all as read failed: ${markAllRes.status}`);
    }
    console.log(`- Mark all read response: HTTP 200, Updated=${markAllRes.body.updatedCount}`);

    // 7. Test Anti-IDOR on Notification Delete
    console.log('\n7. Testing Anti-IDOR Protection on Delete...');
    const idorDeleteRes = await request(server)
      .delete(`/api/v1/notifications/${notifId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    if (idorDeleteRes.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for cross-user delete, got ${idorDeleteRes.status}`);
    }
    console.log('- Anti-IDOR Delete Guard: HTTP 403 Forbidden (PASS)');

    // Delete by legitimate owner
    const deleteRes = await request(server)
      .delete(`/api/v1/notifications/${notifId}`)
      .set('Authorization', `Bearer ${salesToken}`);
    if (deleteRes.status !== 200) {
      throw new Error(`Legitimate delete failed: ${deleteRes.status}`);
    }
    console.log(`- Owner deleted notification: HTTP 200 (PASS)`);

    // 8. Enterprise Audit Logging Query (Admin Only)
    console.log('\n8. Querying Enterprise Audit Logs as Admin (GET /api/v1/audit/logs)...');
    const auditRes = await request(server)
      .get('/api/v1/audit/logs')
      .set('Authorization', `Bearer ${adminToken}`);

    if (auditRes.status !== 200) {
      throw new Error(`Audit query failed: ${auditRes.status} ${JSON.stringify(auditRes.body)}`);
    }
    console.log(`- Audit Logs retrieved: HTTP 200, Total Logs: ${auditRes.body.meta.total}`);

    // Query Audit Summary
    console.log('\n9. Querying Audit Summary (GET /api/v1/audit/summary)...');
    const summaryRes = await request(server)
      .get('/api/v1/audit/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    if (summaryRes.status !== 200) {
      throw new Error(`Audit summary failed: ${summaryRes.status}`);
    }
    console.log(`- Audit Summary: HTTP 200, Total Logs Recorded: ${summaryRes.body.totalLogs}`);

    // 10. Audit RBAC Protection Tests
    console.log('\n10. Testing RBAC Protection on Audit Endpoints...');
    const salesAuditForbidden = await request(server)
      .get('/api/v1/audit/logs')
      .set('Authorization', `Bearer ${salesToken}`);

    if (salesAuditForbidden.status !== 403) {
      throw new Error(`Expected HTTP 403 for sales on audit logs, got ${salesAuditForbidden.status}`);
    }
    console.log('- Salesperson accessing Audit Logs: HTTP 403 Forbidden (PASS)');

    const salesSummaryForbidden = await request(server)
      .get('/api/v1/audit/summary')
      .set('Authorization', `Bearer ${salesToken}`);

    if (salesSummaryForbidden.status !== 403) {
      throw new Error(`Expected HTTP 403 for sales on audit summary, got ${salesSummaryForbidden.status}`);
    }
    console.log('- Salesperson accessing Audit Summary: HTTP 403 Forbidden (PASS)');

    const unauthAudit = await request(server).get('/api/v1/audit/logs');
    if (unauthAudit.status !== 401) {
      throw new Error(`Expected HTTP 401 for unauthenticated audit request, got ${unauthAudit.status}`);
    }
    console.log('- Unauthenticated access to Audit Logs: HTTP 401 Unauthorized (PASS)');

    console.log('\n=== ALL 14 BUNDLE 15 (NOTIFICATIONS & AUDIT) INTEGRATION TESTS PASSED 100% ===\n');
  } catch (error) {
    console.error('FATAL INTEGRATION TEST ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runLiveNotificationsAndAuditTests().then(() => {
  console.log('Bundle 15 integration test execution complete.');
  process.exit(0);
});
