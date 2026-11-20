# Panel 04: Approval Panel Specification

## 1. Overview & Authority
The **Approval Panel** is the ultimate commercial and clinical sign-off gatekeeper. Staffed by senior medical advisors and commercial controllers, this panel guarantees that all Ayurvedic health packages, pricing structures, and patient consent criteria adhere to company policy before an inquiry becomes a legally recognized customer and order.

- **Primary Persona**: Medical Director / Commercial Approval Head.
- **Identifier Prefix**: `MEL-APR-XXX` (e.g., `MEL-APR-001`).
- **Dashboard Title**: Verify • Approve • Reject.

## 2. Core Functional Capabilities

### 2.1 Approval Dashboard Metrics
- **Total Requests**: Aggregate requests in the approval pipeline.
- **New Requests**: Fresh requests forwarded from Pending Review or direct senior sales escalations.
- **Under Review**: Requests actively undergoing medical/commercial scrutiny.
- **Approved Today**: Successfully verified leads cleared for customer conversion.

### 2.2 Approval Queue & Detailed Inspection
The queue presents incoming approval requests with quick-glance cards and full dossier inspection:
- **Lead Identifier**: `MEL-LEAD-XXXXX`
- **Customer Information**: Full Name, Mobile, City, State.
- **Product Regimen**: Prescribed Ayurvedic formulations (e.g., Ayurvedic Immunity Booster, Joint Care Capsules).
- **Assigned Salesperson**: Identity of sales consultant (`MEL-SAL-XXX`).
- **Pending Reviewer**: Identity of quality audit officer (`MEL-PND-XXX`).
- **Audit Trail**: Unified chronological view of Sales notes, Call logs, and Pending Review notes.

### 2.3 Definitive Action Suite
Three distinct decision buttons are provided:
1. **APPROVE (Green Action)**:
   - Sets lead status to `APPROVED`.
   - Records reviewer ID, timestamp, approval notes, and verified commercial terms.
   - Automatically unlocks lead conversion in the Management Panel.
2. **REJECT (Red Action)**:
   - Sets lead status to `REJECTED`.
   - Mandates selection of a rejection reason code (`MEDICAL_CONTRAINDICATION`, `COMMERCIAL_UNVIABILITY`, `PATIENT_UNWILLING`, `DUPLICATE_ORDER`).
   - Immutable rejection record stored in `approval_history`.
3. **SEND_BACK (Blue Action)**:
   - Reverts lead to either Pending Queue or Salesperson workspace for rectifying discrepancies.
   - Requires mandatory explanatory comments detailing required corrections.
