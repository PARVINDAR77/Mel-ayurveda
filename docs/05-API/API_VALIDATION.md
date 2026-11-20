# API Input Validation Standards

## 1. Validation Stack
- Framework: **NestJS ValidationPipe**
- Libraries: **class-validator** & **class-transformer**
- Global Configuration:
  ```typescript
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strips undocumented fields
      forbidNonWhitelisted: true,   // Rejects requests with unknown properties
      transform: true,              // Automatically coerces payloads to DTO instances
      transformOptions: { enableImplicitConversion: true },
    })
  );
  ```

## 2. Custom Domain Validators
- **Indian Mobile Pattern**: `/^[6-9]d{9}$/` (rejects 9-digit or invalid area codes).
- **Employee Code Pattern**: `/^MEL-(ADM|SAL|PND|APR|MGT)-d{3,4}$/`.
- **Order Number Pattern**: `/^MEL-ORD-d{4,8}$/`.
- **GSTIN Pattern**: `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/`.
