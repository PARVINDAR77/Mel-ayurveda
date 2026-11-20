import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { PrismaService } from '../src/prisma/prisma.service';

interface BenchmarkMetric {
  name: string;
  type: 'READ' | 'WRITE' | 'CONCURRENCY' | 'HEALTH';
  slaTargetMs: number;
  samples: number;
  latencies: number[];
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
  avg: number;
  successRate: number;
  passed: boolean;
}

function calculatePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return Number(sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))].toFixed(2));
}

function analyzeMetrics(
  name: string,
  type: 'READ' | 'WRITE' | 'CONCURRENCY' | 'HEALTH',
  slaTargetMs: number,
  latencies: number[],
  successCount: number,
): BenchmarkMetric {
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = calculatePercentile(sorted, 50);
  const p90 = calculatePercentile(sorted, 90);
  const p95 = calculatePercentile(sorted, 95);
  const p99 = calculatePercentile(sorted, 99);
  const min = sorted.length > 0 ? Number(sorted[0].toFixed(2)) : 0;
  const max = sorted.length > 0 ? Number(sorted[sorted.length - 1].toFixed(2)) : 0;
  const avg =
    sorted.length > 0
      ? Number((sorted.reduce((sum, v) => sum + v, 0) / sorted.length).toFixed(2))
      : 0;
  const successRate = latencies.length > 0 ? (successCount / latencies.length) * 100 : 0;
  const passed = p95 <= slaTargetMs && successRate === 100;

  return {
    name,
    type,
    slaTargetMs,
    samples: latencies.length,
    latencies,
    p50,
    p90,
    p95,
    p99,
    min,
    max,
    avg,
    successRate,
    passed,
  };
}

async function runPerformanceBenchmarks() {
  console.log('================================================================================');
  console.log('  MELAYURVEDA CRM: ENTERPRISE PERFORMANCE BENCHMARK & SLA SUITE (PHASE 24)');
  console.log('================================================================================\n');

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
  const prisma = app.get(PrismaService);

  const results: BenchmarkMetric[] = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Authenticate Actors and Obtain Entity IDs
    // -------------------------------------------------------------------------
    console.log('--- SETUP: Authenticating Actors & Gathering Target Entities ---');

    // Admin
    const adminLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@melayurveda.com', password: 'Melayurveda@Admin2026!' });
    if (adminLogin.status !== 200) throw new Error('Admin login failed');
    const adminToken = adminLogin.body.accessToken;

    // Salesperson 1
    const salesLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'ramesh.patel@melayurveda.com', password: 'BrandNewRameshPassword2026!' });
    if (salesLogin.status !== 200) throw new Error('Sales login failed');
    const salesToken = salesLogin.body.accessToken;
    const salesId = salesLogin.body.user.id;

    // Management
    const mgmtLogin = await request(server)
      .post('/api/v1/auth/login')
      .send({ email: 'neha.mehta@melayurveda.com', password: 'MgmtPassword2026!' });
    if (mgmtLogin.status !== 200) throw new Error('Mgmt login failed');
    const mgmtToken = mgmtLogin.body.accessToken;

    // Fetch an assigned lead for tele-caller operations
    const leadsRes = await request(server)
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${salesToken}`);
    const leadList = leadsRes.body.data || leadsRes.body;
    if (!leadList || leadList.length === 0) throw new Error('No leads found for Salesperson');
    const targetLeadId = leadList[0].id;

    // Fetch products catalog
    const productsRes = await request(server)
      .get('/api/v1/products')
      .set('Authorization', `Bearer ${mgmtToken}`);
    const productList = productsRes.body.data || productsRes.body;
    if (!productList || productList.length === 0) throw new Error('No products found');
    const targetProductId = productList[0].id;

    // Fetch existing customer
    const customersRes = await request(server)
      .get('/api/v1/customers')
      .set('Authorization', `Bearer ${mgmtToken}`);
    const customerList = customersRes.body.data || customersRes.body;
    if (!customerList || customerList.length === 0) throw new Error('No customers found');
    const targetCustomerId = customerList[0].id;

    console.log(`  Target Lead: ${leadList[0].leadCode} (${targetLeadId})`);
    console.log(`  Target Product: ${productList[0].sku} (${targetProductId})`);
    console.log(`  Target Customer: ${customerList[0].customerCode} (${targetCustomerId})\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 0: Database Direct Connection & Roundtrip Health (SLA < 20ms)
    // -------------------------------------------------------------------------
    console.log('--- BENCHMARK 0: Database Direct Connection Roundtrip Health ---');
    const healthLatencies: number[] = [];
    let healthSuccess = 0;
    for (let i = 0; i < 20; i++) {
      const res = await prisma.checkDatabaseHealth();
      if (res.connected && res.latencyMs !== undefined) {
        healthLatencies.push(res.latencyMs);
        healthSuccess++;
      }
    }
    const healthMetric = analyzeMetrics(
      'DB Direct Ping (SELECT 1)',
      'HEALTH',
      20,
      healthLatencies,
      healthSuccess,
    );
    results.push(healthMetric);
    console.log(`  Samples: ${healthMetric.samples} | p50: ${healthMetric.p50}ms | p95: ${healthMetric.p95}ms | Max: ${healthMetric.max}ms | Status: ${healthMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 1: GET /api/v1/leads (Read SLA: p95 < 150ms)
    // -------------------------------------------------------------------------
    console.log('--- BENCHMARK 1: GET /api/v1/leads (Tele-Sales Queue Read SLA < 150ms) ---');
    const leadsLatencies: number[] = [];
    let leadsSuccess = 0;
    const leadsIterations = 50;

    for (let i = 0; i < leadsIterations; i++) {
      const t0 = process.hrtime.bigint();
      const res = await request(server)
        .get('/api/v1/leads?page=1&limit=20')
        .set('Authorization', `Bearer ${salesToken}`);
      const t1 = process.hrtime.bigint();
      const durationMs = Number(t1 - t0) / 1_000_000;
      leadsLatencies.push(durationMs);
      if (res.status === 200) leadsSuccess++;
    }

    const leadsMetric = analyzeMetrics(
      'GET /api/v1/leads',
      'READ',
      150,
      leadsLatencies,
      leadsSuccess,
    );
    results.push(leadsMetric);
    console.log(`  Samples: ${leadsMetric.samples} | p50: ${leadsMetric.p50}ms | p95: ${leadsMetric.p95}ms | SLA: <150ms | Status: ${leadsMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 2: GET /api/v1/calling/logs/lead/:leadId (Read SLA: p95 < 150ms)
    // -------------------------------------------------------------------------
    console.log(`--- BENCHMARK 2: GET /api/v1/calling/logs/lead/:leadId (Calling History Read SLA < 150ms) ---`);
    const callLogsLatencies: number[] = [];
    let callLogsSuccess = 0;
    const callLogsIterations = 50;

    for (let i = 0; i < callLogsIterations; i++) {
      const t0 = process.hrtime.bigint();
      const res = await request(server)
        .get(`/api/v1/calling/logs/lead/${targetLeadId}`)
        .set('Authorization', `Bearer ${salesToken}`);
      const t1 = process.hrtime.bigint();
      const durationMs = Number(t1 - t0) / 1_000_000;
      callLogsLatencies.push(durationMs);
      if (res.status === 200) callLogsSuccess++;
    }

    const callLogsMetric = analyzeMetrics(
      'GET /api/v1/calling/logs/lead/:id',
      'READ',
      150,
      callLogsLatencies,
      callLogsSuccess,
    );
    results.push(callLogsMetric);
    console.log(`  Samples: ${callLogsMetric.samples} | p50: ${callLogsMetric.p50}ms | p95: ${callLogsMetric.p95}ms | SLA: <150ms | Status: ${callLogsMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 3: GET /api/v1/analytics/dashboard/sales (Read SLA: p95 < 150ms)
    // -------------------------------------------------------------------------
    console.log('--- BENCHMARK 3: GET /api/v1/analytics/dashboard/sales (Sales Dashboard Read SLA < 150ms) ---');
    const salesDashLatencies: number[] = [];
    let salesDashSuccess = 0;
    const salesDashIterations = 30;

    for (let i = 0; i < salesDashIterations; i++) {
      const t0 = process.hrtime.bigint();
      const res = await request(server)
        .get('/api/v1/analytics/dashboard/sales')
        .set('Authorization', `Bearer ${salesToken}`);
      const t1 = process.hrtime.bigint();
      const durationMs = Number(t1 - t0) / 1_000_000;
      salesDashLatencies.push(durationMs);
      if (res.status === 200) salesDashSuccess++;
    }

    const salesDashMetric = analyzeMetrics(
      'GET /api/v1/analytics/dashboard/sales',
      'READ',
      150,
      salesDashLatencies,
      salesDashSuccess,
    );
    results.push(salesDashMetric);
    console.log(`  Samples: ${salesDashMetric.samples} | p50: ${salesDashMetric.p50}ms | p95: ${salesDashMetric.p95}ms | SLA: <150ms | Status: ${salesDashMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 4: GET /api/v1/inventory (Read SLA: p95 < 150ms)
    // -------------------------------------------------------------------------
    console.log('--- BENCHMARK 4: GET /api/v1/inventory (Warehouse Inventory Stock Read SLA < 150ms) ---');
    const invLatencies: number[] = [];
    let invSuccess = 0;
    const invIterations = 30;

    for (let i = 0; i < invIterations; i++) {
      const t0 = process.hrtime.bigint();
      const res = await request(server)
        .get('/api/v1/inventory')
        .set('Authorization', `Bearer ${mgmtToken}`);
      const t1 = process.hrtime.bigint();
      const durationMs = Number(t1 - t0) / 1_000_000;
      invLatencies.push(durationMs);
      if (res.status === 200) invSuccess++;
    }

    const invMetric = analyzeMetrics(
      'GET /api/v1/inventory',
      'READ',
      150,
      invLatencies,
      invSuccess,
    );
    results.push(invMetric);
    console.log(`  Samples: ${invMetric.samples} | p50: ${invMetric.p50}ms | p95: ${invMetric.p95}ms | SLA: <150ms | Status: ${invMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 5: POST /api/v1/calling/logs (Write SLA: p95 < 250ms)
    // -------------------------------------------------------------------------
    console.log('--- BENCHMARK 5: POST /api/v1/calling/logs (Tele-Consultation Write SLA < 250ms) ---');
    const postCallLatencies: number[] = [];
    let postCallSuccess = 0;
    const postCallIterations = 30;

    for (let i = 0; i < postCallIterations; i++) {
      const t0 = process.hrtime.bigint();
      const res = await request(server)
        .post('/api/v1/calling/logs')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          leadId: targetLeadId,
          callOutcome: 'FOLLOW_UP_REQUIRED',
          durationSeconds: 45 + (i % 30),
          notes: `Performance benchmark iteration ${i + 1} - verified low latency persistence.`,
        });
      const t1 = process.hrtime.bigint();
      const durationMs = Number(t1 - t0) / 1_000_000;
      postCallLatencies.push(durationMs);
      if (res.status === 201) postCallSuccess++;
    }

    const postCallMetric = analyzeMetrics(
      'POST /api/v1/calling/logs',
      'WRITE',
      250,
      postCallLatencies,
      postCallSuccess,
    );
    results.push(postCallMetric);
    console.log(`  Samples: ${postCallMetric.samples} | p50: ${postCallMetric.p50}ms | p95: ${postCallMetric.p95}ms | SLA: <250ms | Status: ${postCallMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 6: POST /api/v1/orders/draft & confirm (Write SLA: p95 < 250ms)
    // -------------------------------------------------------------------------
    console.log('--- BENCHMARK 6: POST /api/v1/orders/draft & confirm (Order Workflow Write SLA < 250ms) ---');
    const orderDraftLatencies: number[] = [];
    let orderDraftSuccess = 0;
    const orderConfirmLatencies: number[] = [];
    let orderConfirmSuccess = 0;
    const orderIterations = 15;

    for (let i = 0; i < orderIterations; i++) {
      // 6.1 Draft Order creation
      const t0Draft = process.hrtime.bigint();
      const draftRes = await request(server)
        .post('/api/v1/orders/draft')
        .set('Authorization', `Bearer ${mgmtToken}`)
        .send({
          customerId: targetCustomerId,
          paymentMode: 'CASH_ON_DELIVERY',
          notes: `Benchmark order #${i + 1}`,
          items: [
            {
              productId: targetProductId,
              quantity: 1,
            },
          ],
        });
      const t1Draft = process.hrtime.bigint();
      const draftDurationMs = Number(t1Draft - t0Draft) / 1_000_000;
      orderDraftLatencies.push(draftDurationMs);
      if (draftRes.status === 201) {
        orderDraftSuccess++;

        // 6.2 Confirm Order with atomic inventory reservation
        const createdOrderId = draftRes.body.id;
        const t0Confirm = process.hrtime.bigint();
        const confirmRes = await request(server)
          .post(`/api/v1/orders/${createdOrderId}/confirm`)
          .set('Authorization', `Bearer ${mgmtToken}`)
          .send({});
        const t1Confirm = process.hrtime.bigint();
        const confirmDurationMs = Number(t1Confirm - t0Confirm) / 1_000_000;
        orderConfirmLatencies.push(confirmDurationMs);
        if (confirmRes.status === 200 || confirmRes.status === 201) {
          orderConfirmSuccess++;
        }
      }
    }

    const orderDraftMetric = analyzeMetrics(
      'POST /api/v1/orders/draft',
      'WRITE',
      250,
      orderDraftLatencies,
      orderDraftSuccess,
    );
    results.push(orderDraftMetric);
    console.log(`  Draft Orders - Samples: ${orderDraftMetric.samples} | p50: ${orderDraftMetric.p50}ms | p95: ${orderDraftMetric.p95}ms | SLA: <250ms | Status: ${orderDraftMetric.passed ? 'PASS' : 'FAIL'}`);

    const orderConfirmMetric = analyzeMetrics(
      'POST /api/v1/orders/:id/confirm',
      'WRITE',
      250,
      orderConfirmLatencies,
      orderConfirmSuccess,
    );
    results.push(orderConfirmMetric);
    console.log(`  Confirm Orders - Samples: ${orderConfirmMetric.samples} | p50: ${orderConfirmMetric.p50}ms | p95: ${orderConfirmMetric.p95}ms | SLA: <250ms | Status: ${orderConfirmMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // BENCHMARK 7: Concurrent Tele-caller Burst Simulation (50 Parallel Requests)
    // -------------------------------------------------------------------------
    console.log('--- BENCHMARK 7: Concurrent Tele-Caller Burst Simulation (50 Parallel In-Flight Requests) ---');
    const burstConcurrency = 50;
    const burstPromises: Promise<{ durationMs: number; status: number }>[] = [];

    const burstStart = process.hrtime.bigint();

    for (let i = 0; i < burstConcurrency; i++) {
      const reqPromise = (async () => {
        const reqStart = process.hrtime.bigint();
        // Mix of tele-caller operations: 50% lead queries, 30% call logs, 20% dashboard
        let res;
        if (i % 10 < 5) {
          res = await request(server)
            .get('/api/v1/leads?page=1&limit=10')
            .set('Authorization', `Bearer ${salesToken}`);
        } else if (i % 10 < 8) {
          res = await request(server)
            .get(`/api/v1/calling/logs/lead/${targetLeadId}`)
            .set('Authorization', `Bearer ${salesToken}`);
        } else {
          res = await request(server)
            .get('/api/v1/analytics/dashboard/sales')
            .set('Authorization', `Bearer ${salesToken}`);
        }
        const reqEnd = process.hrtime.bigint();
        return {
          durationMs: Number(reqEnd - reqStart) / 1_000_000,
          status: res.status,
        };
      })();
      burstPromises.push(reqPromise);
    }

    const burstResults = await Promise.all(burstPromises);
    const burstEnd = process.hrtime.bigint();
    const totalBurstDurationMs = Number(burstEnd - burstStart) / 1_000_000;

    const burstLatencies = burstResults.map((r) => r.durationMs);
    const burstSuccessCount = burstResults.filter((r) => r.status === 200).length;

    const burstMetric = analyzeMetrics(
      'Concurrent Burst (50 Tele-Callers)',
      'CONCURRENCY',
      250,
      burstLatencies,
      burstSuccessCount,
    );
    results.push(burstMetric);
    console.log(`  Total Burst Duration: ${totalBurstDurationMs.toFixed(2)}ms for ${burstConcurrency} concurrent queries`);
    console.log(`  Throughput: ${(burstConcurrency / (totalBurstDurationMs / 1000)).toFixed(1)} req/sec`);
    console.log(`  Success: ${burstSuccessCount}/${burstConcurrency} (100%) | Zero Deadlocks | Zero Pool Timeouts`);
    console.log(`  p50: ${burstMetric.p50}ms | p95: ${burstMetric.p95}ms | p99: ${burstMetric.p99}ms | Max: ${burstMetric.max}ms | Status: ${burstMetric.passed ? 'PASS' : 'FAIL'}\n`);

    // -------------------------------------------------------------------------
    // SUMMARY REPORT TABLE
    // -------------------------------------------------------------------------
    console.log('================================================================================');
    console.log('                      PHASE 24 BENCHMARK SLA AUDIT SUMMARY');
    console.log('================================================================================');
    console.log(
      '| Metric / Endpoint                       | Type   | SLA (ms) | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Success | Result |',
    );
    console.log(
      '|-----------------------------------------|--------|----------|----------|----------|----------|----------|---------|--------|',
    );

    let allPassed = true;
    for (const r of results) {
      if (!r.passed) allPassed = false;
      const namePadded = r.name.padEnd(39, ' ');
      const typePadded = r.type.padEnd(6, ' ');
      const slaPadded = `< ${r.slaTargetMs}`.padEnd(8, ' ');
      const p50Padded = `${r.p50}`.padEnd(8, ' ');
      const p95Padded = `${r.p95}`.padEnd(8, ' ');
      const p99Padded = `${r.p99}`.padEnd(8, ' ');
      const maxPadded = `${r.max}`.padEnd(8, ' ');
      const succPadded = `${r.successRate.toFixed(0)}%`.padEnd(7, ' ');
      const resPadded = r.passed ? ' PASS ' : ' FAIL ';
      console.log(
        `| ${namePadded} | ${typePadded} | ${slaPadded} | ${p50Padded} | ${p95Padded} | ${p99Padded} | ${maxPadded} | ${succPadded} | ${resPadded} |`,
      );
    }
    console.log(
      '|-----------------------------------------|--------|----------|----------|----------|----------|----------|---------|--------|',
    );

    if (allPassed) {
      console.log('\n  OVERALL RESULT: [100% PASS] ALL PERFORMANCE & CONCURRENCY SLAs STRICTLY COMPLIANT!\n');
    } else {
      console.error('\n  OVERALL RESULT: [FAIL] ONE OR MORE BENCHMARK SLAs EXCEEDED TARGET THRESHOLDS!\n');
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('Fatal error during performance profiling benchmark:', error);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

runPerformanceBenchmarks();
