# Project Scope & Boundaries

## 1. In-Scope Deliverables

### 1.1 Five Role-Based Panels
1. **Super Admin Panel**: Full administrative governance, employee CRUD, lead ingestion management, manual lead entry, multi-strategy lead assignment, organization-wide reporting, system audit log viewer.
2. **Salesperson Panel**: Secure workspace restricted to assigned leads, calling management interface, real-time call logging, follow-up calendar, pending review submission, personal sales metric cards.
3. **Pending Leads Panel**: Triage queue for disputed/complex leads, customer re-verification notes, four-way decision routing (Approve, Reject, Follow-up, Send Back), SLA tracking.
4. **Approval Panel**: High-level verification dashboard, clinical and commercial compliance checks, final approval/rejection/send-back engine, audit trail inspection.
5. **Management Panel**: Master customer registry, disease-wise Ayurvedic product management, stock balance and warehouse inventory, sales draft and order generation, GST invoicing, courier and dispatch tracking.

### 1.2 Backend API Services (15 API Bundles)
- Bundle 01: Authentication & Token Management
- Bundle 02: User & Employee Management
- Bundle 03: Roles & Permissions Governance
- Bundle 04: Lead Sources & Ingestion Webhooks
- Bundle 05: Lead Management & Deduplication
- Bundle 06: Lead Assignment & Distribution Engine
- Bundle 07: Calling Logs & Outcome Processing
- Bundle 08: Follow-up Scheduling & Alerts
- Bundle 09: Pending Review Workflow
- Bundle 10: Final Approval Engine
- Bundle 11: Customer Conversion & CRM Profiles
- Bundle 12: Ayurvedic Products, Pricing & Orders
- Bundle 13: Operations, Billing & Dispatch
- Bundle 14: Analytics, KPIs & Business Reporting
- Bundle 15: Notifications & System Audit Logging

### 1.3 Database Architecture
- PostgreSQL relational schema managed via Prisma ORM.
- Complete set of normalization rules, unique constraints, foreign keys, indexes, and soft-delete provisions where compliant.

## 2. Out-of-Scope (Deferred or Prohibited)
- **Direct Merchant Gateway Settlement**: The CRM captures payment records, transaction reference IDs, and payment statuses (UPI, COD, NetBanking, Card), but does not act as an automated payment processing merchant aggregator.
- **Automated Medical Diagnosis / AI Prescriptions**: In strict compliance with Ayush Ministry regulations, the CRM does not generate automated health claims or clinical prescriptions. All treatment mapping is human-directed.
- **Third-Party Telephony Hardware Switchboards**: The CRM provides software-level call outcome recording and click-to-dial tel-link protocols; direct integration with proprietary PBX PRI hardware lines is out-of-scope for the primary release.
- **Public Customer Portal**: The system is an internal enterprise operations CRM, not an external customer-facing self-service app.

## 3. Project Assumptions & Dependencies
- Deployment environment supports Docker 24+ and Node.js 20+ runtime.
- PostgreSQL 16+ instance available with read-write permissions and extension support (`uuid-ossp`, `pgcrypto`).
- SMTP relay or transactional email provider available for employee onboarding and notification dispatches.
