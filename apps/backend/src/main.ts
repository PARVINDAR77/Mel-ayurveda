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
  app.use(helmet());
  app.use(cookieParser());

  // CORS configuration
  const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
  await app.listen(port);
  logger.log(`Melayurveda CRM Core Backend running at: http://localhost:${port}/${globalPrefix.replace(/^\//, '')}`);
  logger.log(`Swagger OpenAPI Documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
