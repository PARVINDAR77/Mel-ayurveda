import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runPendingReviewIntegrationTest() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 09 (PENDING REVIEWS) ===');
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
    // 1. Authenticate Admin, Salespeople & Pending Reviewer
    console.log('1. Authenticating test personas...');
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

    const priyaLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'priya.sharma@melayurveda.com', password: 'PendingPassword2026!' });
    const priyaToken = priyaLogin.body.accessToken;
    const priyaId = priyaLogin.body.user.id;

    console.log(`- Personas authenticated: Admin, Ramesh (${rameshLogin.body.user.employeeCode}), Suresh, Priya (${priyaLogin.body.user.employeeCode})`);

    // 2. Create 2 test leads assigned to Ramesh Patel
    console.log('\n2. Creating 2 test patient leads assigned to Ramesh...');
    const phoneA = '97' + Math.floor(10000000 + Math.random() * 90000000);
    const phoneB = '97' + Math.floor(10000000 + Math.random() * 90000000);

    const leadARes = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Kishore Trivedi',
        phoneNumber: phoneA,
        city: 'Surat',
        productInterest: 'Liver Detox Care',
        assignToEmployeeId: rameshId,
      });
    const leadA = leadARes.body;

    const leadBRes = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Anandi Ben',
        phoneNumber: phoneB,
        city: 'Ahmedabad',
        productInterest: 'Diabetes Amrit Ras',
        assignToEmployeeId: rameshId,
      });
    const leadB = leadBRes.body;

    console.log(`- Created Lead A: ${leadA.leadCode} (${leadA.id}) and Lead B: ${leadB.leadCode} (${leadB.id})`);

    // 3. IDOR Security Test: Suresh attempts to submit Ramesh's lead to Pending Review
    console.log('\n3. Testing Anti-IDOR: Suresh attempting to submit Ramesh lead to pending review...');
    const idorSubmitRes = await request(server)
      .post('/api/v1/pending-reviews/submit')
      .set('Authorization', `Bearer ${sureshToken}`)
      .send({
        leadId: leadA.id,
        reason: 'Unauthorized submission attempt',
      });

    console.log(`- IDOR Submit Response: HTTP ${idorSubmitRes.status} (Expected 403 Forbidden)`);
    if (idorSubmitRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for IDOR submission, got ${idorSubmitRes.status}`);
    }

    // 4. Authorized Submission: Ramesh submits Lead A to Pending Review
    console.log('\n4. Ramesh submits Lead A to Pending Review queue...');
    const submitARes = await request(server)
      .post('/api/v1/pending-reviews/submit')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: leadA.id,
        reason: 'Chronic multi-morbidity: Liver sensitivity with osteoarthritis',
        salesNotes: 'Patient cannot take standard guggulu formulations. Needs clinical verification.',
      });

    console.log(`- Submit A status: HTTP ${submitARes.status}, Lead State: ${submitARes.body.leadStatus}`);
    if (submitARes.status !== 201 || submitARes.body.leadStatus !== 'PENDING_REVIEW') {
      throw new Error(`Expected HTTP 201 & leadStatus PENDING_REVIEW, got ${submitARes.status}`);
    }
    const reviewAId = submitARes.body.review.id;

    // 5. Conflict Test: Duplicate submission of already queued lead
    console.log('\n5. Testing Duplicate Submission Prevention...');
    const duplicateSubmitRes = await request(server)
      .post('/api/v1/pending-reviews/submit')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: leadA.id,
        reason: 'Attempting duplicate queue entry',
      });

    console.log(`- Duplicate Submit Response: HTTP ${duplicateSubmitRes.status} (Expected 409 Conflict)`);
    if (duplicateSubmitRes.status !== 409) {
      throw new Error(`Expected HTTP 409 for duplicate pending review, got ${duplicateSubmitRes.status}`);
    }

    // 6. Reviewer queries Pending Queue
    console.log('\n6. Priya (Reviewer) queries pending triage queue (/api/v1/pending-reviews/queue)...');
    const queueRes = await request(server)
      .get('/api/v1/pending-reviews/queue?filter=UNCLAIMED')
      .set('Authorization', `Bearer ${priyaToken}`);

    console.log(`- Unclaimed queue total: ${queueRes.body.meta.total}`);
    const foundInQueue = queueRes.body.data.find((r: any) => r.id === reviewAId);
    if (!foundInQueue) {
      throw new Error('Submitted review not found in unclaimed queue');
    }
    console.log(`- Found review in queue: Lead ${foundInQueue.lead.leadCode} (${foundInQueue.lead.customerName})`);

    // 7. Reviewer queries Pending Metrics
    console.log('\n7. Priya queries pending metrics (/api/v1/pending-reviews/metrics)...');
    const metricsRes = await request(server)
      .get('/api/v1/pending-reviews/metrics')
      .set('Authorization', `Bearer ${priyaToken}`);

    console.log('- Metrics:', metricsRes.body);
    if (metricsRes.body.totalPending < 1) {
      throw new Error('Expected totalPending >= 1');
    }

    // 8. Reviewer retrieves full Audit Dossier
    console.log('\n8. Priya retrieves clinical & commercial audit dossier for Lead A...');
    const dossierRes = await request(server)
      .get(`/api/v1/pending-reviews/${reviewAId}`)
      .set('Authorization', `Bearer ${priyaToken}`);

    console.log(`- Dossier returned: HTTP ${dossierRes.status}`);
    console.log(`  Patient: ${dossierRes.body.lead.customerName}, Submitter: ${dossierRes.body.submittedBy.firstName} (${dossierRes.body.submittedBy.employeeCode})`);
    console.log(`  Reason: ${dossierRes.body.reason}`);
    if (dossierRes.status !== 200 || !dossierRes.body.lead) {
      throw new Error('Dossier retrieval verification failed');
    }

    // 9. Reviewer claims Lead A review (Locking into UNDER_REVIEW)
    console.log('\n9. Priya claims Lead A review...');
    const claimRes = await request(server)
      .patch(`/api/v1/pending-reviews/${reviewAId}/claim`)
      .set('Authorization', `Bearer ${priyaToken}`);

    console.log(`- Claim Response: HTTP ${claimRes.status}, Claimed By: ${claimRes.body.claimedBy.employeeCode}`);
    if (claimRes.status !== 200 || claimRes.body.claimedById !== priyaId) {
      throw new Error('Claim review verification failed');
    }

    // Verify lead status is now UNDER_REVIEW
    const checkLeadRes = await request(server)
      .get(`/api/v1/leads/${leadA.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`- Lead status after claim: ${checkLeadRes.body.status} (Expected UNDER_REVIEW)`);
    if (checkLeadRes.body.status !== 'UNDER_REVIEW') {
      throw new Error(`Expected UNDER_REVIEW, got ${checkLeadRes.body.status}`);
    }

    // 10. Reviewer decides Lead A with APPROVE (Forward to Panel 04 Approval Queue)
    console.log('\n10. Priya decides Lead A review: APPROVE (Forward to Panel 04)...');
    const decideARes = await request(server)
      .post(`/api/v1/pending-reviews/${reviewAId}/decide`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({
        decision: 'APPROVE',
        reviewerNotes: 'Clinical verification passed: Substituted standard formulation with Punarnava-Triphala gentle protocol. Approved for final commercial sign-off.',
      });

    console.log(`- Decision A Response: HTTP ${decideARes.status}`);
    console.log(`- Decision: ${decideARes.body.decision}, Next Lead State: ${decideARes.body.nextLeadStatus}`);
    console.log(`- Approval Request created: ID=${decideARes.body.approvalRequest?.id}`);

    if (
      decideARes.status !== 201 &&
      decideARes.status !== 200 ||
      decideARes.body.nextLeadStatus !== 'APPROVAL_REQUESTED' ||
      !decideARes.body.approvalRequest
    ) {
      throw new Error('Approve decision verification failed');
    }

    // 11. Test Decision 2: Ramesh submits Lead B, Priya decides with REQUEST_FOLLOW_UP
    console.log('\n11. Testing REQUEST_FOLLOW_UP decision on Lead B...');
    const submitBRes = await request(server)
      .post('/api/v1/pending-reviews/submit')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: leadB.id,
        reason: 'Patient requests 40% discount for 6-month diabetic regimen',
      });
    const reviewBId = submitBRes.body.review.id;

    // Priya directly decides REQUEST_FOLLOW_UP
    const decideBRes = await request(server)
      .post(`/api/v1/pending-reviews/${reviewBId}/decide`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({
        decision: 'REQUEST_FOLLOW_UP',
        reviewerNotes: 'Maximum allowable introductory discount is 20%. Please follow up with customer and propose 3-month starter package first.',
      });

    console.log(`- Decision B Response: HTTP ${decideBRes.status}, Next Lead State: ${decideBRes.body.nextLeadStatus}`);
    if (decideBRes.body.nextLeadStatus !== 'FOLLOW_UP_REQUIRED') {
      throw new Error(`Expected FOLLOW_UP_REQUIRED, got ${decideBRes.body.nextLeadStatus}`);
    }

    // 12. Query Review History for Lead
    console.log('\n12. Querying review history for Lead A...');
    const historyRes = await request(server)
      .get(`/api/v1/pending-reviews/lead/${leadA.id}`)
      .set('Authorization', `Bearer ${priyaToken}`);

    console.log(`- Found ${historyRes.body.length} review records for lead`);
    if (historyRes.body.length === 0 || historyRes.body[0].decision !== 'APPROVE') {
      throw new Error('Review history check failed');
    }

    console.log('\n=== ALL 12 BUNDLE 09 (PENDING REVIEWS) INTEGRATION TESTS PASSED 100% ===');
  } finally {
    await app.close();
  }
}

runPendingReviewIntegrationTest().catch((err) => {
  console.error('FATAL INTEGRATION TEST ERROR:', err);
  process.exit(1);
});
