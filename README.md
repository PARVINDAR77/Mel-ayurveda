# MELAYURVEDA – ENTERPRISE AYURVEDIC CRM SYSTEM
### MELAYURVEDA INDIA PVT. LTD.

A production-grade, highly secure, role-based Lead Management, Clinical Quality Review, and Commercial Operations CRM engineered for Ayurvedic healthcare enterprises.

---

## 🌟 Key System Capabilities

1. **Five Dedicated Role-Based Panels**:
   - **Panel 01: Super Admin** – Complete organization control, employee provisioning, lead distribution engine, source analytics, and master reports.
   - **Panel 02: Salesperson** – High-velocity tele-sales consultation, persistent calling history, outcome logging, and follow-up management with **100% Lead Source Privacy**.
   - **Panel 03: Pending Leads** – Clinical quality audit queue, patient re-contact, and 4-way resolution routing (Approve, Reject, Follow-up, Send Back).
   - **Panel 04: Approval Authority** – Final commercial and medical sign-off gatekeeper preventing non-compliant order conversions.
   - **Panel 05: Management** – Customer CRM, disease-wise Ayurvedic formulation catalog, sales draft confirmation, GST invoicing, inventory ledger, and courier dispatch tracking.

2. **Strict Lead Source Privacy**:
   - Proprietary acquisition data (Facebook, Instagram, Google Ads, Ad spend, Campaign IDs) is strictly masked from sales consultants at the API and database query levels.

3. **Multi-Source Ingestion & Deduplication**:
   - Ingestion webhooks for Meta Ads, Google Ads, E-commerce Website, and WhatsApp Business, plus an audited manual entry module.
   - Real-time phone deduplication protecting sales ownership.

4. **Zero-Trust Security**:
   - Argon2id salted password hashing.
   - Short-lived JWT access tokens with rotating refresh tokens and token reuse theft detection.
   - Granular RBAC and ABAC ownership guards preventing horizontal privilege escalation (anti-IDOR).
   - Immutable audit logs capturing every state transition and administrative action.

---

## 🏗️ Technology Architecture

```
NEXT.JS 15+ (App Router, Tailwind CSS, TanStack Query, Zod)
                  |
                  | HTTPS / REST API (/api/v1)
                  |
NESTJS 11+ (TypeScript, DTO Validation, Guards, Interceptors)
                  |
PRISMA ORM 6+ (Transactions, Migrations, Connection Pool)
                  |
POSTGRESQL 16+ (ACID Invariants, Foreign Keys, Unique Indexes)
```

---

## 📚 Complete Project Documentation Index

All architectural blueprints, database models, security frameworks, and API contracts are fully documented prior to development:

- **[Master Implementation Prompt](MASTER_IMPLEMENTATION_PROMPT.md)**
- **00. Project Foundation**:
  - [Project Overview](docs/00-PROJECT-FOUNDATION/PROJECT_OVERVIEW.md)
  - [Business Requirements Specification](docs/00-PROJECT-FOUNDATION/BUSINESS_REQUIREMENTS.md)
  - [Project Scope & Boundaries](docs/00-PROJECT-FOUNDATION/PROJECT_SCOPE.md)
  - [Development Roadmap](docs/00-PROJECT-FOUNDATION/DEVELOPMENT_ROADMAP.md)
  - [Acceptance Criteria](docs/00-PROJECT-FOUNDATION/ACCEPTANCE_CRITERIA.md)
- **01. Architecture**:
  - [System Architecture](docs/01-ARCHITECTURE/SYSTEM_ARCHITECTURE.md)
  - [Frontend Architecture](docs/01-ARCHITECTURE/FRONTEND_ARCHITECTURE.md)
  - [Backend Architecture](docs/01-ARCHITECTURE/BACKEND_ARCHITECTURE.md)
  - [Database Architecture](docs/01-ARCHITECTURE/DATABASE_ARCHITECTURE.md)
  - [Project Folder Structure](docs/01-ARCHITECTURE/PROJECT_FOLDER_STRUCTURE.md)
  - [Architectural Decision Records (ADRs)](docs/01-ARCHITECTURE/ARCHITECTURE_DECISIONS.md)
- **02. User Roles & Panels**:
  - [Panel 01: Super Admin](docs/02-USER-ROLES/SUPER_ADMIN.md)
  - [Panel 02: Salesperson](docs/02-USER-ROLES/SALES_PANEL.md)
  - [Panel 03: Pending Leads](docs/02-USER-ROLES/PENDING_PANEL.md)
  - [Panel 04: Approval Panel](docs/02-USER-ROLES/APPROVAL_PANEL.md)
  - [Panel 05: Management Panel](docs/02-USER-ROLES/MANAGEMENT_PANEL.md)
  - [Role-Permission Matrix](docs/02-USER-ROLES/ROLE_PERMISSION_MATRIX.md)
- **03. Lead Lifecycle & Workflows**:
  - [Lead Lifecycle State Machine](docs/03-LEAD-MANAGEMENT/LEAD_LIFECYCLE.md)
  - [Lead Source Privacy Specification](docs/03-LEAD-MANAGEMENT/LEAD_SOURCE_PRIVACY.md)
  - [Manual Lead Creation](docs/03-LEAD-MANAGEMENT/MANUAL_LEAD_CREATION.md)
  - [Lead Assignment Engine](docs/03-LEAD-MANAGEMENT/LEAD_ASSIGNMENT.md)
  - [Calling Workflow & Outcomes](docs/03-LEAD-MANAGEMENT/CALLING_WORKFLOW.md)
  - [Pending Review Workflow](docs/03-LEAD-MANAGEMENT/PENDING_WORKFLOW.md)
  - [Approval Workflow](docs/03-LEAD-MANAGEMENT/APPROVAL_WORKFLOW.md)
  - [Follow-up Workflow](docs/03-LEAD-MANAGEMENT/FOLLOWUP_WORKFLOW.md)
  - [Duplicate Lead Handling](docs/03-LEAD-MANAGEMENT/DUPLICATE_LEAD_HANDLING.md)
- **04. Database Blueprint**:
  - [Database Schema (Prisma)](docs/04-DATABASE/DATABASE_SCHEMA.md)
  - [Entity Relationship Models](docs/04-DATABASE/ENTITY_RELATIONSHIPS.md)
  - [Database Constraints & Invariants](docs/04-DATABASE/DATABASE_CONSTRAINTS.md)
  - [Migration Strategy](docs/04-DATABASE/MIGRATION_STRATEGY.md)
  - [Data Retention Policy](docs/04-DATABASE/DATA_RETENTION.md)
- **05. REST API Specifications**:
  - [API Standards & Conventions](docs/05-API/API_STANDARDS.md)
  - [Comprehensive Endpoints Catalog](docs/05-API/API_ENDPOINTS.md)
  - [API Contracts & Data DTOs](docs/05-API/API_CONTRACTS.md)
  - [Input Validation Standards](docs/05-API/API_VALIDATION.md)
  - [Error Handling Architecture](docs/05-API/ERROR_HANDLING.md)
  - [API Versioning Strategy](docs/05-API/API_VERSIONING.md)
  - [API Authorization Guards](docs/05-API/API_AUTHORIZATION.md)
- **06. Security Architecture**:
  - [Security Architecture Overview](docs/06-SECURITY/SECURITY_ARCHITECTURE.md)
  - [Authentication & Token Lifecycle](docs/06-SECURITY/AUTHENTICATION.md)
  - [Authorization Architecture](docs/06-SECURITY/AUTHORIZATION.md)
  - [Password Security & Argon2id](docs/06-SECURITY/PASSWORD_SECURITY.md)
  - [Session Management](docs/06-SECURITY/SESSION_MANAGEMENT.md)
  - [Data Protection & Privacy](docs/06-SECURITY/DATA_PROTECTION.md)
  - [Security Testing Plan](docs/06-SECURITY/SECURITY_TESTING.md)
  - [STRIDE Threat Model](docs/06-SECURITY/THREAT_MODEL.md)
- **07. UI/UX Design System**:
  - [Design System & Palette](docs/07-UI-UX/DESIGN_SYSTEM.md)
  - [Dashboard Design Specifications](docs/07-UI-UX/DASHBOARD_DESIGN.md)
  - [Responsive Design Standards](docs/07-UI-UX/RESPONSIVE_DESIGN.md)
  - [Component Library Standards](docs/07-UI-UX/COMPONENT_STANDARDS.md)
  - [Tele-Sales UX Ergonomics](docs/07-UI-UX/USER_EXPERIENCE.md)
- **08. Testing & QA**:
  - [Testing Strategy Pyramid](docs/08-TESTING/TESTING_STRATEGY.md)
  - [Unit Testing Standards](docs/08-TESTING/UNIT_TESTING.md)
  - [API Integration Testing](docs/08-TESTING/API_TESTING.md)
  - [E2E Playwright Testing](docs/08-TESTING/E2E_TESTING.md)
  - [Security Penetration Test Cases](docs/08-TESTING/SECURITY_TEST_CASES.md)
  - [Performance & Load Testing](docs/08-TESTING/PERFORMANCE_TESTING.md)
- **09. Deployment & DevOps**:
  - [Local Developer Setup](docs/09-DEPLOYMENT/LOCAL_SETUP.md)
  - [Docker & Container Topology](docs/09-DEPLOYMENT/DOCKER_SETUP.md)
  - [Production Cloud Deployment](docs/09-DEPLOYMENT/PRODUCTION_DEPLOYMENT.md)
  - [Backup & Recovery Strategy](docs/09-DEPLOYMENT/BACKUP_RECOVERY.md)
  - [Monitoring & Observability](docs/09-DEPLOYMENT/MONITORING.md)
  - [Disaster Recovery Plan](docs/09-DEPLOYMENT/DISASTER_RECOVERY.md)
- **10. Project Tracking**:
  - [Master Implementation Status](docs/10-PROJECT-TRACKING/IMPLEMENTATION_STATUS.md)
  - [Changelog](docs/10-PROJECT-TRACKING/CHANGELOG.md)
  - [Known Issues & Open Decisions](docs/10-PROJECT-TRACKING/KNOWN_ISSUES.md)
  - [Architecture Decision Log](docs/10-PROJECT-TRACKING/DECISIONS.md)
  - [API Bundle Tracker](docs/10-PROJECT-TRACKING/API_BUNDLE_STATUS.md)
  - [Test Execution Report](docs/10-PROJECT-TRACKING/TEST_EXECUTION_REPORT.md)

---

## 🚀 Getting Started

Refer to [Local Development Setup](docs/09-DEPLOYMENT/LOCAL_SETUP.md) for complete instructions to run the application locally.

```bash
# 1. Start local PostgreSQL container
docker compose up -d postgres

# 2. Install dependencies
npm install

# 3. Run Prisma migrations
npx prisma migrate dev

# 4. Seed database with initial Super Admin and product categories
npx prisma db seed

# 5. Launch development services
npm run dev
```
