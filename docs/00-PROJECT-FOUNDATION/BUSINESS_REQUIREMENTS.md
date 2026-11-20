# Business Requirements Specification (BRS)

## 1. Introduction
This document defines the definitive business rules, functional mandates, and regulatory constraints governing the **MELAYURVEDA Enterprise CRM**.

## 2. Functional Requirements by Module

### 2.1 Lead Ingestion & Manual Creation
- **FR-LEAD-01 (Multi-Source Ingestion)**: System must ingest leads via secure webhook endpoints from Facebook Ads, Instagram Ads, Google Ads, Melayurveda Website, WhatsApp Business API, and Direct Inbound.
- **FR-LEAD-02 (Deduplication)**: Every incoming lead must be checked against existing records by primary phone number (normalized to 10-digit Indian standard `+91` / `[6-9][0-9]{9}`). If an active lead exists within the 30-day sales window, the system must log a duplicate interaction rather than overwriting existing sales ownership.
- **FR-LEAD-03 (Manual Entry)**: Super Admin must have a dedicated interface to manually input leads with mandatory fields: Customer Full Name, Primary Mobile Number; and optional fields: Alternate Phone, Email, State, City, Full Postal Address, Health Concern / Interested Product Category, Customer Inquiry Notes, and Priority level (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
- **FR-LEAD-04 (Creation Traceability)**: Manual leads must automatically record `source_type = MANUAL`, `created_by = authenticated_admin_id`, and system timestamp in UTC.

### 2.2 Lead Distribution & Assignment
- **FR-ASGN-01 (Manual Allocation)**: Super Admin can assign or reassign any single lead or batch of leads to any active salesperson.
- **FR-ASGN-02 (Round-Robin Auto-Distribution)**: The system must support an automated round-robin engine allocating incoming unassigned leads evenly among logged-in, active sales representatives.
- **FR-ASGN-03 (Assignment History)**: Every assignment or reassignment must write an immutable row to `lead_assignments` recording: `lead_id`, `assigned_by`, `assigned_to`, `reason`, and `assigned_at`.
- **FR-ASGN-04 (Ownership Isolation)**: Sales representatives must strictly be restricted to querying and interacting with leads currently assigned to their unique user ID.

### 2.3 Sales Consultation & Calling Management
- **FR-CALL-01 (Call Outcome Logging)**: After every calling attempt, the salesperson must record a standardized call outcome:
  - `INTERESTED`: Customer actively seeking product or regimen; details documented.
  - `NOT_INTERESTED`: Customer explicitly declined Ayurvedic products.
  - `NO_ANSWER`: Call rang out without response.
  - `BUSY_CALL_LATER`: Customer requested call back at another time.
  - `INVALID_NUMBER`: Wrong number, out of service, or disconnected.
  - `FOLLOW_UP_REQUIRED`: Requires scheduled consultation; mandatory follow-up date/time must be captured.
  - `PENDING_REVIEW`: Disputed lead, special pricing request, or complex medical history requiring review.
  - `REJECTED`: Ineligible candidate or abusive contact.
- **FR-CALL-02 (Call History Immutability)**: Call logs can never be edited or deleted by sales personnel. All records must persist chronologically.
- **FR-CALL-03 (Follow-up Scheduling)**: When outcome is `FOLLOW_UP_REQUIRED` or `BUSY_CALL_LATER`, a structured follow-up entity must be registered with reminder alerts visible on the Sales Dashboard.

### 2.4 Lead Source Privacy Protection
- **FR-PRIV-01 (Strict Masking for Sales)**: Under no circumstances may sales personnel view the marketing source (`source_type`, campaign names, ad set IDs, creative IDs, or acquisition cost).
- **FR-PRIV-02 (Backend Response Sanitization)**: The API layer serving salesperson endpoints must filter out source-related attributes using NestJS ClassSerializer / custom DTO projections, preventing exposure through browser network inspection.

### 2.5 Two-Tier Verification: Pending Review & Approval
- **FR-PND-01 (Pending Review Submission)**: A salesperson can submit an assigned lead for pending review by specifying a mandatory reason code, clinical/pricing justification notes, and proposed remedy.
- **FR-PND-02 (Pending Queue Actionability)**: Reviewers in the Pending Panel can:
  - `APPROVE`: Validates the lead and forwards it to the final Approval Queue.
  - `REJECT`: Permanently rejects the lead with justification.
  - `REQUEST_FOLLOW_UP`: Requests additional consultation from the salesperson.
  - `SEND_BACK`: Returns the lead to the salesperson with feedback notes.
- **FR-APR-01 (Final Approval Actionability)**: Approval Officers examine verified medical interest, customer identity, and financial terms. They can execute:
  - `APPROVE`: Formally transitions lead to `APPROVED`, unlocking customer profile creation and order drafting.
  - `REJECT`: Rejects the application with mandatory reason.
  - `SEND_BACK`: Returns the lead to Pending or Sales with corrective instructions.

### 2.6 Operations, Inventory, Billing & Fulfillment
- **FR-OPS-01 (Customer Conversion)**: An approved lead can be converted into a permanent customer entity while preserving the original lead linkage and interaction history.
- **FR-OPS-02 (Disease-Wise Product Catalog)**: The system maintains approved Ayurvedic formulations mapped to standardized therapeutic categories (e.g., Immunity, Joint Care, Digestive Health, Diabetic Care, Skin & Hair Wellness).
- **FR-OPS-03 (Order Draft & Confirmation)**: Management staff create order drafts, select prescribed products, calculate GST (CGST/SGST/IGST), apply authorized discounts, and record final customer confirmation.
- **FR-OPS-04 (Inventory Reservation)**: Order confirmation must atomically decrement available warehouse stock and generate an audit trail in `inventory_transactions`.
- **FR-OPS-05 (Invoicing & Dispatch)**: The system generates unique tax invoices (`MEL-INV-YYYY-XXXXX`) and records courier details (AWB number, shipping partner, dispatch date, tracking URL).

## 3. Non-Functional Requirements
- **NFR-SEC-01 (Authentication)**: All endpoints (except public login and webhook ingestion) require validated JWT access tokens.
- **NFR-SEC-02 (Password Hashing)**: All passwords hashed with Argon2id using recommended OWASP parameters (memory cost 64MB, iterations 3, parallelism 4).
- **NFR-PERF-01 (Latency)**: API response time for p95 requests must be under 200ms under a nominal load of 200 concurrent users.
- **NFR-AUD-01 (Audit Trail)**: 100% of administrative and state-changing events must be logged in `audit_logs` with actor, timestamp, action, and payload diffs.
- **NFR-REL-01 (Transactional Integrity)**: Multi-step workflows (assignment, approval, order reservation) must execute within PostgreSQL transactions with `READ COMMITTED` or `SERIALIZABLE` isolation.
