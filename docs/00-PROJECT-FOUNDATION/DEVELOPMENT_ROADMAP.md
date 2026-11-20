# Melayurveda CRM Development Roadmap

## Roadmap Phases Overview (Phases 00 to 26)

```
[PHASE 00] Repository Inspection & Documentation Foundation
    |
[PHASE 01] Architecture Blueprint & Database Design Verification
    |
[PHASE 02] Project Foundation & Containerized Local Environment
    |
[PHASE 03] PostgreSQL & Prisma Schema Engineering
    |
[PHASE 04] Authentication, Argon2id & Security Guardrails
    |
[PHASE 05] User, Role & Employee API Services (Bundle 01-03)
    |
[PHASE 06] Lead Ingestion & Management APIs (Bundle 04-05)
    |
[PHASE 07] Lead Distribution & Assignment Engine (Bundle 06)
    |
[PHASE 08] Calling Workflow & Follow-up Scheduler (Bundle 07-08)
    |
[PHASE 09] Pending Review Queue & Decision API (Bundle 09)
    |
[PHASE 10] Final Approval Engine & State Machine (Bundle 10)
    |
[PHASE 11] Customer Conversion & Profile API (Bundle 11)
    |
[PHASE 12] Products, Disease Categories & Orders (Bundle 12)
    |
[PHASE 13] Operations, Invoicing, Inventory & Dispatch (Bundle 13)
    |
[PHASE 14] Executive Dashboards & Analytics Reporting (Bundle 14)
    |
[PHASE 15] Notification Bus & Enterprise Audit Logging (Bundle 15)
    |
[PHASE 16] Next.js Design System & Shared Layout Infrastructure
    |
[PHASE 17] Panel 01: Super Admin Frontend
    |
[PHASE 18] Panel 02: Salesperson Frontend (With Source Privacy)
    |
[PHASE 19] Panel 03: Pending Review Frontend
    |
[PHASE 20] Panel 04: Approval Authority Frontend
    |
[PHASE 21] Panel 05: Management, Operations & Billing Frontend
    |
[PHASE 22] End-to-End System Integration Testing
    |
[PHASE 23] Rigorous Security Audit, Pen-Testing & OWASP Verification
    |
[PHASE 24] Performance Profiling, Caching & Load Optimization
    |
[PHASE 25] Production Deployment & CI/CD Pipeline
    |
[PHASE 26] Production Readiness Sign-Off & Handover
```

## Milestone Targets & Quality Gate Rules
1. **Gate 0 (Documentation Review)**: All 71 markdown specification files complete, reviewed, and cross-referenced before code authoring.
2. **Gate 1 (Data Layer Verification)**: Prisma schema validated, clean migrations tested against clean PostgreSQL test databases.
3. **Gate 2 (API Bundle Isolation)**: Each API bundle must achieve 100% test passing (unit + integration) and updated Swagger definitions before downstream bundle development starts.
4. **Gate 3 (Security & Privacy Compliance)**: Automated tests must prove that salesperson credentials cannot receive lead source metadata across any API endpoint.
5. **Gate 4 (Production Acceptance)**: Zero TypeScript errors, zero lint warnings, passing E2E Playwright test suite.
