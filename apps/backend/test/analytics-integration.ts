import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

async function runLiveAnalyticsTests() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 14 (ANALYTICS & 5 PANEL DASHBOARDS) ===');

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
    // 1. Authenticate all 5 personas
    console.log('1. Authenticating all 5 CRM personas...');

    // Super Admin
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' });
    const adminToken = adminLogin.body.accessToken;
    console.log('- Authenticated Admin (MEL-ADM-001)');

    // Salesperson (Ramesh Patel)
    const salesLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    const salesToken = salesLogin.body.accessToken;
    console.log('- Authenticated Salesperson (MEL-SAL-001 - Ramesh)');

    // Pending Reviewer (Priya Sharma)
    const pendingLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'priya.sharma@melayurveda.com', password: 'PendingPassword2026!' });
    const pendingToken = pendingLogin.body.accessToken;
    console.log('- Authenticated Pending Reviewer (MEL-PND-001 - Priya)');

    // Approval Officer (Amit Desai)
    const approvalLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'amit.desai@melayurveda.com', password: 'ApprovalPassword2026!' });
    const approvalToken = approvalLogin.body.accessToken;
    console.log('- Authenticated Approval Officer (MEL-APR-001 - Amit)');

    // Management (Neha Mehta)
    const mgmtLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'neha.mehta@melayurveda.com', password: 'MgmtPassword2026!' });
    const mgmtToken = mgmtLogin.body.accessToken;
    console.log('- Authenticated Management (MEL-MGT-001 - Neha)');

    // 2. Test Panel 01: Super Admin Dashboard
    console.log('\n2. Testing Super Admin Master Dashboard (/api/v1/analytics/dashboard/admin)...');
    const adminDashboardRes = await request(server)
      .get('/api/v1/analytics/dashboard/admin')
      .set('Authorization', `Bearer ${adminToken}`);

    if (adminDashboardRes.status !== 200) {
      throw new Error(`Admin dashboard failed: ${adminDashboardRes.status} ${JSON.stringify(adminDashboardRes.body)}`);
    }
    console.log(`- Admin Dashboard: HTTP 200, Total Leads: ${adminDashboardRes.body.overview.totalLeads}`);
    console.log(`  Lead Sources Tracked: ${adminDashboardRes.body.sourceDistribution.length}`);
    console.log(`  Sales Reps Tracked: ${adminDashboardRes.body.salesTeamPerformance.length}`);

    // 3. Test Auto-Resolved Dashboard for Admin
    console.log('\n3. Testing Auto-Resolved /api/v1/analytics/dashboard for Admin...');
    const autoAdminRes = await request(server)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    if (autoAdminRes.status !== 200 || !autoAdminRes.body.sourceDistribution) {
      throw new Error(`Auto admin dashboard failed: ${autoAdminRes.status}`);
    }
    console.log('- Auto-Resolved Admin Dashboard: HTTP 200 (Matches Admin)');

    // 4. Test Panel 02: Salesperson Dashboard & MANDATORY PRIVACY INVARIANT
    console.log('\n4. Testing Salesperson Dashboard (/api/v1/analytics/dashboard/sales)...');
    const salesDashboardRes = await request(server)
      .get('/api/v1/analytics/dashboard/sales')
      .set('Authorization', `Bearer ${salesToken}`);

    if (salesDashboardRes.status !== 200) {
      throw new Error(`Sales dashboard failed: ${salesDashboardRes.status} ${JSON.stringify(salesDashboardRes.body)}`);
    }

    console.log(`- Sales Dashboard: HTTP 200, Rep: ${salesDashboardRes.body.salesperson.employeeCode}`);
    console.log(`  Assigned Leads: ${salesDashboardRes.body.pipeline.totalAssigned}, Calls Today: ${salesDashboardRes.body.todayActivity.callsLoggedToday}`);

    // Verification of STRICT ZERO LEAD SOURCE DATA
    const salesRaw = JSON.stringify(salesDashboardRes.body).toLowerCase();
    if (
      salesRaw.includes('leadsource') ||
      salesRaw.includes('sourcetype') ||
      salesRaw.includes('campaign') ||
      salesRaw.includes('costperlead') ||
      salesDashboardRes.body.sourceDistribution !== undefined
    ) {
      throw new Error('SECURITY VIOLATION: Salesperson dashboard leaked lead source data!');
    }
    console.log('- STRICT LEAD SOURCE PRIVACY VERIFIED: Zero marketing or source data exposed to salesperson');

    // 5. Test Auto-Resolved Dashboard for Salesperson
    console.log('\n5. Testing Auto-Resolved /api/v1/analytics/dashboard for Salesperson...');
    const autoSalesRes = await request(server)
      .get('/api/v1/analytics/dashboard')
      .set('Authorization', `Bearer ${salesToken}`);
    if (autoSalesRes.status !== 200 || !autoSalesRes.body.pipeline) {
      throw new Error(`Auto sales dashboard failed: ${autoSalesRes.status}`);
    }
    console.log('- Auto-Resolved Sales Dashboard: HTTP 200 (Matches Salesperson)');

    // 6. Test Panel 03: Pending Review Dashboard
    console.log('\n6. Testing Pending Review Dashboard (/api/v1/analytics/dashboard/pending)...');
    const pendingDashboardRes = await request(server)
      .get('/api/v1/analytics/dashboard/pending')
      .set('Authorization', `Bearer ${pendingToken}`);

    if (pendingDashboardRes.status !== 200) {
      throw new Error(`Pending review dashboard failed: ${pendingDashboardRes.status}`);
    }
    console.log(`- Pending Dashboard: HTTP 200, Open Workload: ${pendingDashboardRes.body.queue.totalOpenWorkload}`);
    console.log(`  Overdue Reviews: ${pendingDashboardRes.body.queue.overdueReviewsCount}`);

    // 7. Test Panel 04: Approval Authority Dashboard
    console.log('\n7. Testing Approval Authority Dashboard (/api/v1/analytics/dashboard/approval)...');
    const approvalDashboardRes = await request(server)
      .get('/api/v1/analytics/dashboard/approval')
      .set('Authorization', `Bearer ${approvalToken}`);

    if (approvalDashboardRes.status !== 200) {
      throw new Error(`Approval dashboard failed: ${approvalDashboardRes.status}`);
    }
    console.log(`- Approval Dashboard: HTTP 200, Pending Approvals: ${approvalDashboardRes.body.queue.totalPendingApproval}`);
    console.log(`  Approved Order Value: ₹${approvalDashboardRes.body.commercialImpact.totalApprovedOrderValue}`);

    // 8. Test Panel 05: Management Dashboard
    console.log('\n8. Testing Management Dashboard (/api/v1/analytics/dashboard/management)...');
    const mgmtDashboardRes = await request(server)
      .get('/api/v1/analytics/dashboard/management')
      .set('Authorization', `Bearer ${mgmtToken}`);

    if (mgmtDashboardRes.status !== 200) {
      throw new Error(`Management dashboard failed: ${mgmtDashboardRes.status}`);
    }
    console.log(`- Management Dashboard: HTTP 200, Total Customers: ${mgmtDashboardRes.body.customers.totalCustomers}`);
    console.log(`  Total Orders: ${mgmtDashboardRes.body.orders.totalOrders}, Delivery Success Rate: ${mgmtDashboardRes.body.orders.deliverySuccessRate}%`);
    console.log(`  Gross Revenue: ₹${mgmtDashboardRes.body.financials.grossRevenue}, Total GST Collected: ₹${mgmtDashboardRes.body.financials.totalTaxCollected}`);
    console.log(`  Tracked SKUs: ${mgmtDashboardRes.body.inventoryHealth.totalSkusTracked}, Low Stock Count: ${mgmtDashboardRes.body.inventoryHealth.lowStockCount}`);

    // 9. RBAC & Anti-IDOR Tests
    console.log('\n9. Testing RBAC Forbidden Guards on Dashboard Views...');

    // Salesperson accessing Admin Dashboard -> 403 Forbidden
    const salesAdminForbidden = await request(server)
      .get('/api/v1/analytics/dashboard/admin')
      .set('Authorization', `Bearer ${salesToken}`);
    if (salesAdminForbidden.status !== 403) {
      throw new Error(`Expected 403 for sales on admin dashboard, got ${salesAdminForbidden.status}`);
    }
    console.log('- Sales accessing Admin Dashboard: HTTP 403 Forbidden (PASS)');

    // Salesperson accessing Management Dashboard -> 403 Forbidden
    const salesMgmtForbidden = await request(server)
      .get('/api/v1/analytics/dashboard/management')
      .set('Authorization', `Bearer ${salesToken}`);
    if (salesMgmtForbidden.status !== 403) {
      throw new Error(`Expected 403 for sales on management dashboard, got ${salesMgmtForbidden.status}`);
    }
    console.log('- Sales accessing Management Dashboard: HTTP 403 Forbidden (PASS)');

    // Pending Reviewer accessing Admin Dashboard -> 403 Forbidden
    const pendingAdminForbidden = await request(server)
      .get('/api/v1/analytics/dashboard/admin')
      .set('Authorization', `Bearer ${pendingToken}`);
    if (pendingAdminForbidden.status !== 403) {
      throw new Error(`Expected 403 for pending reviewer on admin dashboard, got ${pendingAdminForbidden.status}`);
    }
    console.log('- Pending Reviewer accessing Admin Dashboard: HTTP 403 Forbidden (PASS)');

    // Unauthenticated request -> 401 Unauthorized
    const unauthRes = await request(server).get('/api/v1/analytics/dashboard');
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401 for unauthenticated dashboard request, got ${unauthRes.status}`);
    }
    console.log('- Unauthenticated access to Dashboard: HTTP 401 Unauthorized (PASS)');

    // 10. Admin Cross-Access Verification
    console.log('\n10. Testing Admin Cross-Access to all Role Dashboards...');
    const adminSalesRes = await request(server)
      .get('/api/v1/analytics/dashboard/sales')
      .set('Authorization', `Bearer ${adminToken}`);
    const adminPendingRes = await request(server)
      .get('/api/v1/analytics/dashboard/pending')
      .set('Authorization', `Bearer ${adminToken}`);
    const adminApprovalRes = await request(server)
      .get('/api/v1/analytics/dashboard/approval')
      .set('Authorization', `Bearer ${adminToken}`);
    const adminMgmtRes = await request(server)
      .get('/api/v1/analytics/dashboard/management')
      .set('Authorization', `Bearer ${adminToken}`);

    if (
      adminSalesRes.status !== 200 ||
      adminPendingRes.status !== 200 ||
      adminApprovalRes.status !== 200 ||
      adminMgmtRes.status !== 200
    ) {
      throw new Error('Admin cross-access to role dashboards failed');
    }
    console.log('- Admin successfully accessed all 5 role dashboard views (All HTTP 200 OK)');

    console.log('\n=== ALL 14 BUNDLE 14 (ANALYTICS & DASHBOARDS) INTEGRATION TESTS PASSED 100% ===\n');
  } catch (error) {
    console.error('FATAL INTEGRATION TEST ERROR:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runLiveAnalyticsTests().then(() => {
  console.log('Bundle 14 integration test execution complete.');
  process.exit(0);
});
