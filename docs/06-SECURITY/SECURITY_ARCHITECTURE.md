# Security Architecture Specification

## 1. Security Philosophy & Defense-in-Depth
MELAYURVEDA CRM enforces defense-in-depth across every layer of the technology stack:
1. **Network & Edge**: TLS 1.3 encryption, IP rate-limiting, CORS restriction, Helmet HTTP headers.
2. **Application Layer**: NestJS JWT authentication, granular RBAC/ABAC guards, strict DTO validation pipes, parameterized SQL queries via Prisma.
3. **Data Layer**: PostgreSQL column encryption where appropriate, strict row-level authorization assertions, immutable audit logs.
4. **Data Isolation Invariant**: Salesperson role is technically isolated from marketing source intelligence.

## 2. Cryptographic Standards
- **Password Storage**: Argon2id (Memory: 64MB, Iterations: 3, Parallelism: 4).
- **Session Tokens**: JWT with HMAC-SHA256 (`HS256`) or asymmetric RSA (`RS256`).
- **Refresh Token Storage**: SHA-256 hashed in database; raw token issued as HttpOnly, Secure, SameSite=Strict cookie.
- **Data in Transit**: HTTPS with strict transport security (`HSTS`, max-age: 31536000).
