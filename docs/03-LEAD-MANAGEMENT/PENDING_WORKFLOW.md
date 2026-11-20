# Pending Review Workflow Specification

## 1. Objectives & Submission Criteria
The **Pending Review Workflow** safeguards company standards for clinical suitability, treatment expectations, and commercial agreements.

### Submission Triggers
- Patient reports chronic multi-morbidity (e.g., severe rheumatoid arthritis with diabetic complications).
- Patient requests customized multi-month regimen discounts exceeding standard sales limits.
- Customer disputes contact or identity details requiring verification.

## 2. Step-by-Step Pending Process
1. **Sales Submission**: Salesperson triggers "Submit to Pending", providing mandatory clinical observations and reason code. Status transitions to `PENDING_REVIEW`.
2. **Queue Placement**: Lead appears in the centralized Pending Queue.
3. **Claiming by Reviewer**: An authorized reviewer (`MEL-PND-XXX`) clicks "Review", locking the record into `UNDER_REVIEW` to avoid collision.
4. **Reviewer Audit**: Reviewer inspects previous calling logs, dials customer if needed, and evaluates dosage/pricing parameters.
5. **Decision Execution**:
   - **Approve**: Forwards to Approval Queue (`APPROVAL_REQUESTED`).
   - **Reject**: Marks lead `REJECTED` with justification.
   - **Request Follow-Up**: Returns to salesperson with specific questions.
   - **Send Back**: Returns to salesperson workspace for re-consultation.
