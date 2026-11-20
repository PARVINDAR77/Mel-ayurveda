# End-to-End (E2E) Testing Specification

## 1. Framework: Playwright
Playwright tests simulate complete multi-role user journeys across browser sessions.

## 2. Critical Lead-to-Customer E2E Journey
1. **Step 1 (Ingestion)**: Webhook receives new lead from Website or Super Admin creates manual lead.
2. **Step 2 (Assignment)**: Super Admin assigns lead to Salesperson `MEL-SAL-001`.
3. **Step 3 (Calling)**: Salesperson logs in, opens assigned lead, logs call outcome `INTERESTED`, submits for Pending Review.
4. **Step 4 (Pending Review)**: Pending Reviewer `MEL-PND-001` logs in, claims lead, reviews notes, clicks `APPROVE` (forwards to approval).
5. **Step 5 (Final Approval)**: Approval Officer `MEL-APR-001` logs in, inspects pricing, clicks `APPROVE`.
6. **Step 6 (Conversion & Order)**: Management staff `MEL-MGT-001` logs in, converts lead to Customer, drafts order, confirms order, generates GST invoice, assigns courier dispatch.
