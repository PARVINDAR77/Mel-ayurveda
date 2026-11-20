# Architectural Decision Records (ADRs)

## ADR-001: Selection of NestJS for Backend Framework
- **Status**: ACCEPTED
- **Context**: Need an enterprise-grade, strongly typed, modular backend supporting dependency injection, clean architecture, and standardized API guards.
- **Decision**: Adopt NestJS 11+ on Node.js 20+ LTS.
- **Consequences**: Standardized patterns for controllers, services, DTO validation, and Swagger generation across all 15 API bundles.

## ADR-002: Selection of Next.js App Router for Frontend
- **Status**: ACCEPTED
- **Context**: Five specialized CRM panels requiring shared layout logic, secure route gating, and high-performance client interaction.
- **Decision**: Adopt Next.js 15+ with App Router and React 19.
- **Consequences**: Fast client navigation, clean layout nesting, server-side auth validation, and seamless integration with Tailwind CSS.

## ADR-003: Selection of PostgreSQL & Prisma ORM
- **Status**: ACCEPTED
- **Context**: Mission-critical business operations requiring ACID transactions, complex relational data, strict foreign keys, and safe schema migrations.
- **Decision**: Adopt PostgreSQL 16+ with Prisma ORM 6+.
- **Consequences**: Type-safe database queries, automated TypeScript types generation, strictly managed SQL migrations, and reliable multi-step transactional logic.

## ADR-004: Architectural Enforcement of Lead Source Privacy
- **Status**: ACCEPTED
- **Context**: Business imperative that sales representatives must NEVER see marketing acquisition sources, campaigns, or ad costs.
- **Decision**: Enforce lead source exclusion at the API Controller/Service layer using role-tailored response DTOs (`SalespersonLeadResponseDto` vs `AdminLeadResponseDto`) combined with a NestJS serialization interceptor.
- **Consequences**: Prevents accidental data exposure via browser inspection; verifiable through automated security integration tests.

## ADR-005: Password Security using Argon2id
- **Status**: ACCEPTED
- **Context**: Need maximum cryptographic protection against GPU/ASIC brute-force attacks on employee credentials.
- **Decision**: Implement Argon2id password hashing with 64MB memory, 3 iterations, and parallelism of 4.
- **Consequences**: Highest standard of credential security conforming to OWASP guidelines.
