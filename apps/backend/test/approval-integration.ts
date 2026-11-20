import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runApprovalIntegrationTest() {
  console.log('=== STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 10 (FINAL APPROVAL ENGINE) ===');
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
    console.log('1. Authenticating test personas (Admin, Sales, Pending, Approval)...');
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
    const amitId = amitLogin.body.user.id;

    console.log(`- Authenticated: Admin, Ramesh (${rameshLogin.body.user.employeeCode}), Priya (${priyaLogin.body.user.employeeCode}), Amit (${amitLogin.body.user.employeeCode})`);

    // 2. Create 2 test leads assigned to Ramesh Patel
    console.log('\n2. Creating 2 test customer leads assigned to Ramesh...');
    const phoneA = '98' + Math.floor(10000000 + Math.random() * 90000000);
    const phoneB = '98' + Math.floor(10000000 + Math.random() * 90000000);

    const leadARes = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Meera Ben Joshi',
        phoneNumber: phoneA,
        city: 'Bhavnagar',
        productInterest: 'Ayurvedic Anti-Allergy Kwath',
        assignToEmployeeId: rameshId,
      });
    const leadA = leadARes.body;

    const leadBRes = await request(server)
      .post('/api/v1/leads/manual')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        customerName: 'Chirag Parekh',
        phoneNumber: phoneB,
        city: 'Gandhinagar',
        productInterest: 'High Potency Shilajit & Ashwagandha',
        assignToEmployeeId: rameshId,
      });
    const leadB = leadBRes.body;

    console.log(`- Created Lead A: ${leadA.leadCode} and Lead B: ${leadB.leadCode}`);

    // 3. Process Leads through Panel 03 (Pending Review) to generate Approval Requests
    console.log('\n3. Progressing Leads A & B through Pending Review to Approval Queue...');
    // Submit Lead A
    const submitARes = await request(server)
      .post('/api/v1/pending-reviews/submit')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: leadA.id,
        reason: 'Severe chronic rhinitis requiring physician sign-off',
      });
    const revAId = submitARes.body.review.id;

    // Priya approves Lead A -> Generates Approval Request A
    const decideARes = await request(server)
      .post(`/api/v1/pending-reviews/${revAId}/decide`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({
        decision: 'APPROVE',
        reviewerNotes: 'Clinical verification complete. Allergen panel checked. Forwarded for commercial sign-off.',
      });
    const reqAId = decideARes.body.approvalRequest.id;

    // Submit Lead B
    const submitBRes = await request(server)
      .post('/api/v1/pending-reviews/submit')
      .set('Authorization', `Bearer ${rameshToken}`)
      .send({
        leadId: leadB.id,
        reason: 'Customer has borderline hypertension requesting shilajit formulation',
      });
    const revBId = submitBRes.body.review.id;

    // Priya approves Lead B -> Generates Approval Request B
    const decideBRes = await request(server)
      .post(`/api/v1/pending-reviews/${revBId}/decide`)
      .set('Authorization', `Bearer ${priyaToken}`)
      .send({
        decision: 'APPROVE',
        reviewerNotes: 'Clinical verification flagged for medical advisor review due to hypertension.',
      });
    const reqBId = decideBRes.body.approvalRequest.id;

    console.log(`- Forwarded to Panel 04: Approval Request A (${reqAId}), Approval Request B (${reqBId})`);

    // 4. Amit Desai queries Approval Queue
    console.log('\n4. Amit Desai queries Approval Queue (/api/v1/approvals/queue)...');
    const queueRes = await request(server)
      .get('/api/v1/approvals/queue?filter=PENDING')
      .set('Authorization', `Bearer ${amitToken}`);

    console.log(`- Unclaimed approval queue total: ${queueRes.body.meta.total}`);
    const foundReqA = queueRes.body.data.find((r: any) => r.id === reqAId);
    if (!foundReqA) {
      throw new Error('Approval Request A not found in queue');
    }
    console.log(`- Found request for Lead ${foundReqA.lead.leadCode} (${foundReqA.lead.customerName})`);

    // 5. Amit Desai queries Approval Metrics
    console.log('\n5. Amit Desai queries Approval Panel Metrics (/api/v1/approvals/metrics)...');
    const metricsRes = await request(server)
      .get('/api/v1/approvals/metrics')
      .set('Authorization', `Bearer ${amitToken}`);

    console.log('- Approval Metrics:', metricsRes.body);
    if (metricsRes.body.totalRequests < 2) {
      throw new Error('Expected totalRequests >= 2');
    }

    // 6. Amit Desai retrieves full verification dossier for Request A
    console.log('\n6. Amit Desai retrieves full approval verification dossier for Request A...');
    const dossierRes = await request(server)
      .get(`/api/v1/approvals/${reqAId}`)
      .set('Authorization', `Bearer ${amitToken}`);

    console.log(`- Dossier returned: HTTP ${dossierRes.status}`);
    console.log(`  Customer: ${dossierRes.body.lead.customerName}, Status: ${dossierRes.body.lead.status}`);
    console.log(`  Pending Reviewer Notes: ${dossierRes.body.lead.pendingReviews[0]?.reviewerNotes}`);
    if (dossierRes.status !== 200 || !dossierRes.body.lead) {
      throw new Error('Approval dossier retrieval failed');
    }

    // 7. Amit claims Approval Request A
    console.log('\n7. Amit claims Approval Request A...');
    const claimRes = await request(server)
      .patch(`/api/v1/approvals/${reqAId}/claim`)
      .set('Authorization', `Bearer ${amitToken}`);

    console.log(`- Claim response: HTTP ${claimRes.status}, Officer: ${claimRes.body.officer.employeeCode}`);
    if (claimRes.status !== 200 || claimRes.body.officerId !== amitId) {
      throw new Error('Claim approval request failed');
    }

    // 8. Amit decides Request A with APPROVE (Clearing lead for customer conversion)
    console.log('\n8. Amit decides Request A: APPROVE...');
    const finalApproveRes = await request(server)
      .post(`/api/v1/approvals/${reqAId}/decide`)
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        decision: 'APPROVE',
        officerNotes: 'Medical parameters and commercial pricing verified. Approved for formal customer onboarding and order generation.',
      });

    console.log(`- Decision A Response: HTTP ${finalApproveRes.status}`);
    console.log(`- Decision: ${finalApproveRes.body.decision}, Next Lead State: ${finalApproveRes.body.nextLeadStatus}`);
    if (
      finalApproveRes.status !== 201 &&
      finalApproveRes.status !== 200 ||
      finalApproveRes.body.nextLeadStatus !== 'APPROVED'
    ) {
      throw new Error(`Expected APPROVED state, got ${finalApproveRes.body.nextLeadStatus}`);
    }

    // Verify lead state in database
    const verifyLeadARes = await request(server)
      .get(`/api/v1/leads/${leadA.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    console.log(`- Verified Lead A DB Status: ${verifyLeadARes.body.status} (Expected APPROVED)`);
    if (verifyLeadARes.body.status !== 'APPROVED') {
      throw new Error(`Lead A is not APPROVED, got ${verifyLeadARes.body.status}`);
    }

    // 9. Amit decides Request B with REJECT (Medical Contraindication)
    console.log('\n9. Amit decides Request B: REJECT (Medical Contraindication)...');
    const rejectBRes = await request(server)
      .post(`/api/v1/approvals/${reqBId}/decide`)
      .set('Authorization', `Bearer ${amitToken}`)
      .send({
        decision: 'REJECT',
        decisionReason: 'MEDICAL_CONTRAINDICATION',
        officerNotes: 'Contraindicated: Customer blood pressure exceeds safety threshold for high-potency formulations. Case closed.',
      });

    console.log(`- Decision B Response: HTTP ${rejectBRes.status}, Next Lead State: ${rejectBRes.body.nextLeadStatus}`);
    if (rejectBRes.body.nextLeadStatus !== 'REJECTED') {
      throw new Error(`Expected REJECTED state, got ${rejectBRes.body.nextLeadStatus}`);
    }

    // 10. Query Approval History for Lead A
    console.log('\n10. Querying approval history for Lead A...');
    const historyRes = await request(server)
      .get(`/api/v1/approvals/lead/${leadA.id}`)
      .set('Authorization', `Bearer ${amitToken}`);

    console.log(`- Found ${historyRes.body.length} approval records for Lead A`);
    if (historyRes.body.length === 0 || historyRes.body[0].decision !== 'APPROVE') {
      throw new Error('Approval history check failed');
    }

    console.log('\n=== ALL 10 BUNDLE 10 (FINAL APPROVAL ENGINE) INTEGRATION TESTS PASSED 100% ===');
  } finally {
    await app.close();
  }
}

runApprovalIntegrationTest().catch((err) => {
  console.error('FATAL INTEGRATION TEST ERROR:', err);
  process.exit(1);
});
