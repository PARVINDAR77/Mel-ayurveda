# Pinned Dependency Versions & Rationale

## 1. Overview
In accordance with Phase 02 quality gates, all technology dependencies across the monorepo are pinned to stable, mutually compatible versions. This prevents transitive dependency drift, build breakage, and security vulnerabilities.

---

## 2. Pinned Version Matrix

### 2.1 Backend Dependencies (\`apps/backend\`)
| Package Name | Pinned Version | Rationale & Compatibility |
|:---|:---|:---|
| \`@nestjs/common\` | \`11.0.10\` | NestJS 11 LTS release with enhanced performance and Node.js 20/22/24 compatibility. |
| \`@nestjs/core\` | \`11.0.10\` | Core dependency injection container. |
| \`@nestjs/platform-express\` | \`11.0.10\` | Standard Express HTTP adapter supporting custom middleware and filters. |
| \`@nestjs/config\` | \`4.0.0\` | Environment variable validation using Joi / dotenv. |
| \`@nestjs/swagger\` | \`11.0.3\` | OpenAPI 3.0 specification auto-generator. |
| \`swagger-ui-express\` | \`5.0.1\` | Interactive Swagger UI for API bundle verification. |
| \`@prisma/client\` | \`6.3.1\` | Latest Prisma ORM client with strict PostgreSQL 16 typing. |
| \`prisma\` | \`6.3.1\` | CLI migration generator, engine, and schema compiler. |
| \`argon2\` | \`0.41.1\` | Memory-hard Argon2id cryptographic password hashing conforming to OWASP. |
| \`@nestjs/jwt\` | \`11.0.0\` | JWT signing and verification module. |
| \`@nestjs/passport\` | \`11.0.0\` | Guardrail integration with Passport strategies. |
| \`passport\` | \`0.7.0\` | Core authentication framework. |
| \`passport-jwt\` | \`4.0.1\` | Bearer token extractor and validator. |
| \`class-validator\` | \`0.14.1\` | Runtime validation decorators for DTOs. |
| \`class-transformer\` | \`0.5.1\` | Automatic plain-to-class payload transformation. |
| \`helmet\` | \`8.0.0\` | HTTP security headers (CSP, HSTS, X-Frame-Options). |
| \`cookie-parser\` | \`1.4.7\` | Extraction of HttpOnly refresh token cookies. |
| \`rxjs\` | \`7.8.1\` | Reactive Extensions for NestJS interceptor pipelines. |
| \`reflect-metadata\` | \`0.2.2\` | Decorator metadata reflection for TypeScript. |

### 2.2 Frontend Dependencies (\`apps/frontend\`)
| Package Name | Pinned Version | Rationale & Compatibility |
|:---|:---|:---|
| \`next\` | \`15.1.7\` | Next.js 15 App Router with high-performance SSR and Turbopack. |
| \`react\` | \`19.0.0\` | Modern React 19 concurrent features. |
| \`react-dom\` | \`19.0.0\` | React 19 DOM renderer. |
| \`tailwindcss\` | \`3.4.17\` | Utility-first styling engine with customized Ayurvedic palette. |
| \`postcss\` | \`8.5.1\` | CSS post-processing pipeline. |
| \`autoprefixer\` | \`10.4.20\` | Vendor prefix automation for cross-browser CSS. |
| \`axios\` | \`1.7.9\` | HTTP client with automatic refresh-token rotation interceptors. |
| \`@tanstack/react-query\`| \`5.66.0\` | Server-state caching, background revalidation, and optimistic updates. |
| \`lucide-react\` | \`0.475.0\` | Feather-derived modern iconography across 5 CRM panels. |
| \`clsx\` | \`2.1.1\` | Conditional class names utility. |
| \`tailwind-merge\` | \`3.0.1\` | Deterministic merging of Tailwind CSS classes without conflicts. |
| \`react-hook-form\` | \`7.54.2\` | Performant uncontrolled form state management. |
| \`zod\` | \`3.24.1\` | Declarative schema validation matching backend DTO rules. |
| \`@hookform/resolvers\` | \`3.10.0\` | Bridge connecting React Hook Form with Zod schemas. |

### 2.3 Shared Package Dependencies (\`packages/shared\`)
| Package Name | Pinned Version | Rationale & Compatibility |
|:---|:---|:---|
| \`typescript\` | \`5.7.3\` | Unified TypeScript compiler shared across backend and frontend. |

---

## 3. Compatibility Verification
- **Node.js**: Validated on Node.js `v24.18.0`.
- **Database**: Validated for PostgreSQL 16+ via Docker and Prisma 6.3.1.
- **Transpilation**: Strict mode (`"strict": true`) enforced across all packages.
