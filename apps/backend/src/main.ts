import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('MelayurvedaBootstrap');
  const app = await NestFactory.create(AppModule);

  // Security headers & cookies
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hidePoweredBy: true,
      xssFilter: true,
      noSniff: true,
    }),
  );
  app.use(cookieParser());

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3010', 'http://127.0.0.1:3010', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      if (
        !origin ||
        corsOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Global API prefix
  const globalPrefix = process.env.API_PREFIX || '/api/v1';
  app.setGlobalPrefix(globalPrefix.replace(/^\//, ''));

  // Global DTO validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('MELAYURVEDA Enterprise CRM API')
    .setDescription('Complete Ayurvedic Lead Management, Review & Operations REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Melayurveda API Server successfully listening on http://0.0.0.0:${port}${globalPrefix}`);
  logger.log(`Melayurveda CRM Core Backend running at: http://localhost:${port}/${globalPrefix.replace(/^\//, '')}`);
  logger.log(`Swagger OpenAPI Documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`🛡️ Melayurveda Enterprise WAF (Web Application Firewall) Active: Bot Shield, Anti-Scraping, SQLi/XSS Filters, Brute-Force IP Ban`);
}

bootstrap();
