# Comprehensive API Endpoints Catalog

## Bundle 01: Authentication
- `POST /api/v1/auth/login`: Authenticate credentials, return JWT access token & set refresh cookie.
- `POST /api/v1/auth/refresh`: Rotate refresh token, issue new access token.
- `POST /api/v1/auth/logout`: Revoke current refresh token and clear cookie.
- `GET /api/v1/auth/me`: Retrieve authenticated user identity and effective permissions.
- `POST /api/v1/auth/password-reset/request`: Super Admin requests password reset link for user.
- `POST /api/v1/auth/password-reset/confirm`: User completes password reset with token.

## Bundle 02 & 03: Users, Employees & Permissions
- `GET /api/v1/employees`: List employees with pagination and role filters (Admin).
- `POST /api/v1/employees`: Create new employee with auto-generated ID (Admin).
- `GET /api/v1/employees/:id`: Retrieve specific employee profile.
- `PATCH /api/v1/employees/:id`: Update employee details or role assignment (Admin).
- `PATCH /api/v1/employees/:id/status`: Activate or deactivate employee account (Admin).
- `GET /api/v1/roles/permissions`: List all available system permissions.

## Bundle 04 & 05: Lead Sources & Lead Management
- `GET /api/v1/lead-sources`: List lead acquisition sources (Admin & Management).
- `POST /api/v1/lead-sources`: Register new acquisition source or webhook config.
- `POST /api/v1/leads/manual`: Manually create a lead (Admin & Management).
- `POST /api/v1/leads/webhook/:sourceKey`: Ingestion webhook for Meta/Google/Website.
- `GET /api/v1/leads`: List leads (Admin sees all with sources; Sales sees assigned only without sources).
- `GET /api/v1/leads/:id`: Retrieve lead details (filtered strictly by role).
- `PATCH /api/v1/leads/:id`: Update permitted lead attributes.

## Bundle 06: Lead Assignment Engine
- `POST /api/v1/leads/assign/manual`: Assign or reassign specific lead to salesperson.
- `POST /api/v1/leads/assign/bulk`: Bulk assign leads to salesperson.
- `POST /api/v1/leads/assign/round-robin`: Trigger automatic round-robin assignment.
- `GET /api/v1/leads/:id/assignments`: View assignment audit history for a lead.

## Bundle 07 & 08: Calling & Follow-Ups
- `POST /api/v1/calling/logs`: Record call attempt, duration, notes, and outcome.
- `GET /api/v1/calling/logs/lead/:leadId`: Retrieve call history for a lead.
- `POST /api/v1/follow-ups`: Schedule a future callback.
- `GET /api/v1/follow-ups/my`: List scheduled and overdue follow-ups for current salesperson.
- `PATCH /api/v1/follow-ups/:id/complete`: Mark follow-up completed.

## Bundle 09: Pending Review Workflow
- `POST /api/v1/pending-reviews/submit`: Salesperson submits lead for review.
- `GET /api/v1/pending-reviews/queue`: View active pending review queue.
- `PATCH /api/v1/pending-reviews/:id/claim`: Reviewer claims lead into UNDER_REVIEW.
- `POST /api/v1/pending-reviews/:id/decide`: Record decision (Approve, Reject, Follow-up, Send Back).

## Bundle 10: Final Approval Workflow
- `GET /api/v1/approvals/queue`: View leads awaiting final commercial/medical sign-off.
- `POST /api/v1/approvals/:id/decide`: Record approval decision (Approve, Reject, Send Back).

## Bundle 11 & 12: Customers, Products & Orders
- `POST /api/v1/customers/convert/:leadId`: Convert approved lead to customer.
- `GET /api/v1/customers`: List customers with order history.
- `GET /api/v1/products`: List disease-categorized Ayurvedic products.
- `POST /api/v1/products`: Add or update product SKU, price, GST rate.
- `POST /api/v1/orders/draft`: Create draft order for customer.
- `POST /api/v1/orders/:id/confirm`: Finalize and confirm order (reserves inventory).

## Bundle 13: Invoicing, Inventory & Dispatch
- `POST /api/v1/invoices/generate/:orderId`: Generate GST tax invoice.
- `GET /api/v1/inventory`: View stock levels across all SKUs.
- `POST /api/v1/inventory/restock`: Log warehouse replenishment.
- `POST /api/v1/dispatch/:orderId`: Assign courier partner and AWB tracking number.

## Bundle 14 & 15: Analytics & Audit
- `GET /api/v1/analytics/dashboard/admin`: Master metrics for Super Admin.
- `GET /api/v1/analytics/dashboard/sales`: Performance KPIs for Salesperson.
- `GET /api/v1/analytics/dashboard/management`: Revenue & fulfillment metrics for Management.
- `GET /api/v1/audit/logs`: Query immutable audit logs (Admin only).
