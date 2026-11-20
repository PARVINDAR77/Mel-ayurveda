import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runCallingFollowUpIntegrationTest() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLES 07 & 08 ===');
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
    // 1. Authenticate Admin and Salespeople
    console.log('1. Authenticating Super Admin & Sales Representatives...');
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' });
    const adminToken = adminLogin.body.accessToken;

    const rameshLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    const rameshToken = rameshLogin.body.accessToken;
    const rameshId = rameshLogin.body.user.id;

    const sureshLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'suresh.kumar@melayurveda.com', password: 'SalesPassword2026!' });
    const sureshToken = sureshLogin.body.accessToken;
    const sureshId = sureshLogin.body.user.id;

    console.log(`- Admin authenticated. Ramesh: ${rameshLogin.body.user.employeeCode}, Suresh: ${sureshLogin.body.user.employeeCode}`);

    // 2. Create a test lead assigned to Ramesh
    console.log('\n2. Creating a test customer lead assigned to Ramesh Patel...');
    const phone = '96' + Math.floor(10000000 + Math.random() * 90000000);
    const leadRes = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Priya Rathore',
        phoneNumber: phone,
        city: 'Jaipur',
        productInterest: 'Skin Glow Elixir',
        assignToEmployeeId: rameshId,
      });

    const lead = leadRes.body;
    console.log(`- Created lead ${lead.leadCode} (${lead.id}) assigned to Ramesh`);

    // 3. IDOR Security Test: Suresh attempts to log a call for Ramesh's lead
    console.log('\n3. Testing Anti-IDOR Protection: Suresh attempting to log a call for Ramesh lead...');
    const idorCallRes = await request(server)
      .post('/api/v1/calling/logs')
      .set('Authorization', `Bearer ${sureshToken}`)
      .send({
        leadId: lead.id,
        callOutcome: 'INTERESTED',
        durationSeconds: 60,
        notes: 'Unauthorized call attempt',
      });

    console.log(`- IDOR Call Log Response: HTTP ${idorCallRes.status} (Expected 403 Forbidden)`);
    if (idorCallRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for IDOR call log, got ${idorCallRes.status}`);
    }

    // 4. IDOR Security Test: Suresh attempts to schedule follow-up for Ramesh's lead
    console.log('\n4. Testing Anti-IDOR Protection: Suresh attempting to schedule follow-up for Ramesh lead...');
    const idorFollowUpRes = await request(server)
      .post('/api/v1/follow-ups')
      .set('Authorization', `Bearer ${sureshToken}`)
      .send({
        leadId: lead.id,
        scheduledTime: new Date(Date.now() + 86400000).toISOString(),
        reminderNotes: 'Unauthorized callback schedule',
      });

    console.log(`- IDOR Follow-Up Response: HTTP ${idorFollowUpRes.status} (Expected 403 Forbidden)`);
    if (idorFollowUpRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for IDOR follow-up, got ${idorFollowUpRes.status}`);
    }

    // 5. IDOR Security Test: Suresh attempts to view call logs of Ramesh's lead
    console.log('\n5. Testing Anti-IDOR Protection: Suresh attempting to view call history of Ramesh lead...');
    const idorViewRes = await request(server)
      .get(`/api/v1/calling/logs/lead/${lead.id}`)
      .set('Authorization', `Bearer ${sureshToken}`);

    console.log(`- IDOR View Call Logs Response: HTTP ${idorViewRes.status} (Expected 403 Forbidden)`);
    if (idorViewRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for IDOR view call logs, got ${idorViewRes.status}`);
    }

    // 6. Authorized Call Logging with Inline Follow-up
    console.log('\n6. Ramesh logs consultation call (Outcome: BUSY_CALL_LATER + Callback Scheduled)...');
    const callbackTime = new Date(Date.now() + 2 * 86400000).toISOString(); // 2 days later
    const call1Res = await request(server)
      .post('/api/v1/calling/logs')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: lead.id,
        callOutcome: 'BUSY_CALL_LATER',
        durationSeconds: 45,
        notes: 'Customer in a meeting, requested callback after 2 days.',
        scheduledFollowUpTime: callbackTime,
        followUpNotes: 'Discuss custom Ayurvedic skin herbs after office hours.',
      });

    console.log(`- Call 1 logged: HTTP ${call1Res.status}`);
    console.log(`- New lead status: ${call1Res.body.newStatus} (Expected FOLLOW_UP_REQUIRED)`);
    console.log(`- Scheduled Follow-up ID: ${call1Res.body.followUp?.id}`);

    if (call1Res.status !== 201 || call1Res.body.newStatus !== 'FOLLOW_UP_REQUIRED') {
      throw new Error(`Call 1 verification failed: status=${call1Res.status}, leadStatus=${call1Res.body.newStatus}`);
    }

    const followUpId = call1Res.body.followUp.id;

    // 7. Query Ramesh's Follow-up Agenda
    console.log('\n7. Ramesh queries his follow-up queue (/api/v1/follow-ups/my)...');
    const myFollowUpsRes = await request(server)
      .get('/api/v1/follow-ups/my')
      .set('Authorization', `Bearer ${rameshToken}`);

    console.log(`- Total follow-ups found: ${myFollowUpsRes.body.meta.total}`);
    console.log(`- Summary stats:`, myFollowUpsRes.body.summary);
    const foundFollowUp = myFollowUpsRes.body.data.find((f: any) => f.id === followUpId);
    if (!foundFollowUp) {
      throw new Error('Scheduled follow-up not found in my follow-ups list');
    }
    console.log(`- Found follow-up for lead: ${foundFollowUp.lead.customerName} (${foundFollowUp.lead.leadCode})`);

    // 8. Reschedule Follow-up
    console.log('\n8. Ramesh reschedules callback to 3 days later...');
    const newCallbackTime = new Date(Date.now() + 3 * 86400000).toISOString();
    const rescheduleRes = await request(server)
      .patch(`/api/v1/follow-ups/${followUpId}/reschedule`)
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        scheduledTime: newCallbackTime,
        reason: 'Customer traveling until Thursday',
      });

    console.log(`- Reschedule response: HTTP ${rescheduleRes.status}, status=${rescheduleRes.body.status}`);
    if (rescheduleRes.status !== 200 || rescheduleRes.body.status !== 'SCHEDULED') {
      throw new Error('Reschedule verification failed');
    }

    // 9. Call Logging Test 2: Auto-completion of scheduled follow-up
    console.log('\n9. Ramesh calls customer again (Outcome: INTERESTED) -> Auto-completing follow-up...');
    const call2Res = await request(server)
      .post('/api/v1/calling/logs')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: lead.id,
        callOutcome: 'INTERESTED',
        durationSeconds: 240,
        notes: 'Customer deeply interested in Skin Glow Elixir + Neem Detox regimen. Agreed to standard 45-day package.',
      });

    console.log(`- Call 2 logged: HTTP ${call2Res.status}, New Lead Status: ${call2Res.body.newStatus}`);
    if (call2Res.body.newStatus !== 'INTERESTED') {
      throw new Error(`Expected lead status INTERESTED, got ${call2Res.body.newStatus}`);
    }

    // Verify previously scheduled follow-up was auto-completed
    const checkFollowUpRes = await request(server)
      .get(`/api/v1/follow-ups/lead/${lead.id}`)
      .set('Authorization', `Bearer ${rameshToken}`);

    const completedFollowUp = checkFollowUpRes.body.find((f: any) => f.id === followUpId);
    console.log(`- Auto-completed Follow-up Status: ${completedFollowUp.status} (Expected COMPLETED)`);
    if (completedFollowUp.status !== 'COMPLETED') {
      throw new Error(`Expected follow-up to be COMPLETED, got ${completedFollowUp.status}`);
    }

    // 10. Query Lead Call History (Append-Only Audit Guarantee)
    console.log('\n10. Ramesh queries full call history for lead...');
    const logsRes = await request(server)
      .get(`/api/v1/calling/logs/lead/${lead.id}`)
      .set('Authorization', `Bearer ${rameshToken}`);

    console.log(`- Total calls logged for lead: ${logsRes.body.length}`);
    logsRes.body.forEach((l: any, idx: number) => {
      console.log(`  [Call ${idx + 1}] Outcome: ${l.callOutcome}, Duration: ${l.durationSeconds}s, Caller: ${l.caller.firstName} (${l.caller.employeeCode})`);
    });

    if (logsRes.body.length < 2) {
      throw new Error(`Expected at least 2 call logs, found ${logsRes.body.length}`);
    }

    // 11. Query Personal Calling Analytics
    console.log('\n11. Ramesh queries personal calling analytics (/api/v1/calling/analytics/my)...');
    const analyticsRes = await request(server)
      .get('/api/v1/calling/analytics/my')
      .set('Authorization', `Bearer ${rameshToken}`);

    console.log(`- Calling Analytics for ${analyticsRes.body.caller.name}:`);
    console.log(`  Total Calls: ${analyticsRes.body.overall.totalCalls}`);
    console.log(`  Total Talk Time: ${analyticsRes.body.overall.totalDurationSeconds}s`);
    console.log(`  Average Duration: ${analyticsRes.body.overall.averageDurationSeconds}s`);
    console.log(`  Interested Count: ${analyticsRes.body.overall.interestedCount}`);
    console.log(`  Conversion Rate: ${analyticsRes.body.overall.conversionRate}%`);
    console.log(`  Breakdown:`, analyticsRes.body.overall.breakdownByOutcome);

    if (analyticsRes.status !== 200 || analyticsRes.body.overall.totalCalls < 2) {
      throw new Error('Analytics verification failed');
    }

    // 12. Standalone Follow-up manual completion
    console.log('\n12. Testing manual follow-up creation and completion...');
    const manualFuRes = await request(server)
      .post('/api/v1/follow-ups')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: lead.id,
        scheduledTime: new Date(Date.now() + 5 * 86400000).toISOString(),
        reminderNotes: 'Post-sales check-in',
      });

    const manualFuId = manualFuRes.body.id;
    console.log(`- Created manual follow-up: ${manualFuId}`);

    const completeRes = await request(server)
      .patch(`/api/v1/follow-ups/${manualFuId}/complete`)
      .set('Authorization', `Bearer ${rameshToken}`);

    console.log(`- Manually completed follow-up: status=${completeRes.body.status}`);
    if (completeRes.body.status !== 'COMPLETED') {
      throw new Error(`Expected COMPLETED status, got ${completeRes.body.status}`);
    }

    console.log('\n=== ALL 12 BUNDLE 07 & 08 INTEGRATION TESTS PASSED 100% ===');
  } finally {
    await app.close();
  }
}

runCallingFollowUpIntegrationTest().catch((err) => {
  console.error('FATAL INTEGRATION TEST ERROR:', err);
  process.exit(1);
});
