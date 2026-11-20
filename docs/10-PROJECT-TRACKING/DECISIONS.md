# Log of Architectural & Technical Decisions

## 1. Summary of Accepted Architectural Decisions
- **DEC-001**: Monorepo structure containing `apps/backend` (NestJS) and `apps/frontend` (Next.js App Router).
- **DEC-002**: PostgreSQL 16 managed via Prisma ORM for type safety and deterministic SQL migrations.
- **DEC-003**: Lead source exclusion enforced at backend API serializer layer rather than frontend UI filtering.
- **DEC-004**: Multi-record operations (lead assignment, review approval to customer conversion, order confirmation) wrapped in `prisma.$transaction()`.
- **DEC-005**: All call logs are strictly immutable and append-only to preserve tele-consultation audit history.
- **DEC-006**: Employee codes generated automatically via sequential role prefix (`MEL-ADM-XXX`, `MEL-SAL-XXX`, `MEL-PND-XXX`, `MEL-APR-XXX`, `MEL-MGT-XXX`).
