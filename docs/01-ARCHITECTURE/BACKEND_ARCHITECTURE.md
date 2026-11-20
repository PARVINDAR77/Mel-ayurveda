# Backend Architecture Specification

## 1. Technology Selection & Rationale
- **Framework**: **NestJS 11+**
  - *Rationale*: Enterprise-grade progressive Node.js framework providing structured modularity, dependency injection, decorator-driven routing, and built-in TypeScript support.
- **Language**: **TypeScript 5.x**
  - *Rationale*: Complete type consistency, strict compiler flags, and interface-driven contracts.
- **ORM & Data Mapping**: **Prisma ORM 6.x**
  - *Rationale*: Type-safe database client, declarative schema definitions, automated migrations, and high-performance connection pooling.
- **Validation**: **class-validator & class-transformer**
  - *Rationale*: Strong runtime input verification with auto-transforming pipes.
- **API Documentation**: **@nestjs/swagger (OpenAPI 3.0)**
  - *Rationale*: Real-time interactive API specifications, schema generation, and developer onboarding.

## 2. Modular Architecture & Dependency Graph
```
apps/backend/src/
├── app.module.ts              # Root orchestration module
├── main.ts                    # Bootstrap entry point with global pipes & filters
├── common/
│   ├── decorators/            # @CurrentUser(), @Roles(), @Permissions()
│   ├── dto/                   # PaginatedResponseDto, BaseFilterDto
│   ├── filters/               # AllExceptionsFilter, PrismaClientExceptionFilter
│   ├── guards/                # JwtAuthGuard, RolesGuard, PermissionsGuard
│   ├── interceptors/          # TransformInterceptor, AuditLoggingInterceptor, PrivacyInterceptor
│   └── pipes/                 # CustomValidationPipe, ParsePhonePipe
└── modules/
    ├── auth/                  # JWT, Argon2id, Refresh tokens, Sessions
    ├── users/                 # Employee profiles, User CRUD, Access reset
    ├── roles/                 # Role definitions, Permission mappings
    ├── lead-sources/          # Source definitions, webhook handlers, campaign stats
    ├── leads/                 # Lead repository, deduplication, search, manual entry
    ├── lead-assignments/      # Manual, round-robin, and priority assignment engine
    ├── calling/               # Call logs, outcome recordings, call analytics
    ├── follow-ups/            # Scheduled customer follow-ups, reminder queries
    ├── pending-reviews/       # Pending review triage, queue manager, decision router
    ├── approvals/             # Final approval workflow, verification checks
    ├── customers/             # Customer conversion, CRM records, profile history
    ├── products/              # Ayurvedic formulary, disease categories, pricing
    ├── orders/                # Sales drafts, order confirmations, status pipeline
    ├── inventory/             # Stock balances, warehouse transactions, reservations
    ├── billing/               # Tax calculation (GST), invoice generation
    ├── dispatch/              # Courier partners, AWB tracking, dispatch updates
    ├── analytics/             # Executive KPIs, role dashboard aggregations
    ├── audit/                 # Structured audit trail persistence
    └── notifications/         # Real-time event notifications
```

## 3. Cross-Cutting Concerns
- **Global Validation Pipe**: Strips non-whitelisted properties (`whitelist: true`), forbids unknown payloads (`forbidNonWhitelisted: true`), and automatically transforms types.
- **Global Exception Filter**: Unifies all errors into a standardized JSON response envelope with unique error trace IDs.
- **Transaction Manager**: Multi-step business logic (e.g., Lead Assignment, Review Approval to Order) runs inside `prisma.$transaction()` blocks.
