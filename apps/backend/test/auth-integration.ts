import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function runIntegrationTest() {
  console.log('--- STARTING LIVE HTTP INTEGRATION TEST FOR BUNDLE 01 ---');
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
    // 1. Test Valid Login
    console.log('1. Testing POST /api/v1/auth/login with valid seeded Super Admin credentials...');
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@melayurveda.com',
        password: 'Melayurveda@Admin2026!',
      });

    console.log('Status:', loginRes.status);
    if (loginRes.status !== 200) {
      throw new Error(`Expected 200, got ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
    }
    console.log('Access Token Received:', loginRes.body.accessToken ? 'YES (Valid JWT)' : 'NO');
    console.log('User Employee Code:', loginRes.body.user.employeeCode);
    console.log('User Role:', loginRes.body.user.role);

    const accessToken = loginRes.body.accessToken;
    const cookies = loginRes.headers['set-cookie'];
    console.log('HttpOnly Refresh Cookie Set:', cookies ? 'YES' : 'NO');

    // 2. Test Invalid Password (must reject 401)
    console.log('\n2. Testing POST /api/v1/auth/login with wrong password...');
    const failRes = await request(server)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@melayurveda.com',
        password: 'WrongPassword123!',
      });
    console.log('Status:', failRes.status, failRes.status === 401 ? '(CORRECT 401 Unauthorized)' : '(FAILED)');
    if (failRes.status !== 401) {
      throw new Error(`Expected 401, got ${failRes.status}`);
    }

    // 3. Test GET /api/v1/auth/me with Bearer token
    console.log('\n3. Testing GET /api/v1/auth/me with Bearer JWT...');
    const meRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    console.log('Status:', meRes.status);
    console.log('Profile Response:', meRes.body);
    if (meRes.status !== 200 || meRes.body.employeeCode !== 'MEL-ADM-001') {
      throw new Error(`Expected 200 with MEL-ADM-001, got ${meRes.status}`);
    }

    // 4. Test GET /api/v1/auth/me without token (must reject 401)
    console.log('\n4. Testing GET /api/v1/auth/me without token...');
    const unauthRes = await request(server).get('/api/v1/auth/me');
    console.log('Status:', unauthRes.status, unauthRes.status === 401 ? '(CORRECT 401 Unauthorized)' : '(FAILED)');
    if (unauthRes.status !== 401) {
      throw new Error(`Expected 401, got ${unauthRes.status}`);
    }

    // 5. Test POST /api/v1/auth/refresh with HttpOnly cookie
    console.log('\n5. Testing POST /api/v1/auth/refresh with cookie...');
    const refreshRes = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);
    console.log('Status:', refreshRes.status);
    console.log('Rotated Access Token Received:', refreshRes.body.accessToken ? 'YES' : 'NO');
    if (refreshRes.status !== 200 || !refreshRes.body.accessToken) {
      throw new Error(`Expected 200, got ${refreshRes.status}`);
    }

    console.log('\n✅ ALL BUNDLE 01 LIVE INTEGRATION TESTS PASSED 100%!');
  } finally {
    await app.close();
  }
}

runIntegrationTest().catch((err) => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
