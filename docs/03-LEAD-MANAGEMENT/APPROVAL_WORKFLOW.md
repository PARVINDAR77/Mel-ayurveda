# Approval Workflow Specification

## 1. Purpose & Authority
The **Approval Workflow** represents the final pre-order verification. It ensures all regulatory, medical, and pricing verifications are fulfilled before patient leads are converted to commercial orders.

## 2. Approval Verification Checklist
Before executing an approval decision, the Approval Officer (`MEL-APR-XXX`) reviews:
- [ ] Patient identity and delivery address validation.
- [ ] Stated health concern matches approved Ayurvedic therapeutic categories.
- [ ] Prescribed product formulations contain no contraindications.
- [ ] Total package price, taxes (GST), and payment mode (COD / Prepaid) are accurate.
- [ ] Quality audit notes from the Pending Reviewer are satisfied.

## 3. Decision Pathways
- **APPROVE**:
  - Updates lead status to `APPROVED`.
  - Records reviewer user ID, timestamp, and verification certificate.
  - Automatically enables the "Convert to Customer" workflow in the Management Panel.
- **REJECT**:
  - Sets status to `REJECTED`.
  - Records permanent rejection log in `approval_history`.
- **SEND BACK**:
  - Reverts status to `UNDER_REVIEW` (back to Pending Reviewer) or `CONTACTED` (back to Salesperson) with required revision instructions.
