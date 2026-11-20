# Acceptance Criteria & Verification Standards

## 1. User Account & Employee Identification
- [ ] Every employee account created receives a system-generated unique ID conforming strictly to format:
  - Super Admin: `MEL-ADM-XXX`
  - Salesperson: `MEL-SAL-XXX`
  - Pending Reviewer: `MEL-PND-XXX`
  - Approval Officer: `MEL-APR-XXX`
  - Management Staff: `MEL-MGT-XXX`
- [ ] Employee ID is unique across the entire database, indexed, and immutable once issued.
- [ ] Passwords stored using Argon2id with no plaintext logging or exposure in API responses.
- [ ] Account activation/deactivation immediately revokes active refresh tokens and denies subsequent authentication attempts.

## 2. Lead Management & Source Privacy
- [ ] Lead ingested via webhook or created manually has normalized phone number format.
- [ ] Duplicate leads within 30-day window trigger duplicate interaction event without reassigning owner unless admin explicitly reassigns.
- [ ] **Strict Source Privacy**:
  - Salesperson API call `GET /api/v1/leads` or `GET /api/v1/leads/:id` returns DTO omitting: `source_type`, `campaign_name`, `campaign_id`, `adset_id`, `ad_id`, `cost_per_lead`, `utm_parameters`.
  - Super Admin and Management API calls include full marketing source attributes.
  - Integration tests verify 403 or field sanitization on salesperson source query attempts.

## 3. Calling & Workflow Transitions
- [ ] Salesperson can log calls only against leads actively assigned to their ID.
- [ ] Call logs capture outcome, notes, timestamp, and duration; call records cannot be altered or removed.
- [ ] State transitions follow explicit lifecycle validation:
  - `NEW` -> `CONTACTED` -> `INTERESTED` -> `PENDING_REVIEW` -> `UNDER_REVIEW` -> `APPROVED` -> `CONVERTED`
  - Invalid transitions (e.g., `NEW` directly to `APPROVED` by Salesperson) are blocked with HTTP 400/403.
- [ ] When a lead is submitted to Pending Review, it enters the Pending Queue while preserving original salesperson assignment in history.
- [ ] When an Approval Officer approves a lead, status updates to `APPROVED` and lead becomes eligible for customer conversion.

## 4. Management, Billing & Inventory
- [ ] Approved leads can be converted to Customers with unique `MEL-CUST-XXXXXX` identifier.
- [ ] Products maintain SKU, pricing, GST percentage (5%, 12%, 18%), and stock level.
- [ ] Orders calculate subtotal, discounts, tax breakdown, and total price with strict 2-decimal precision.
- [ ] Stock quantities decrement atomically upon order confirmation within a database transaction.
