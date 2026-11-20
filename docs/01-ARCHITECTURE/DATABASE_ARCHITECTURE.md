# Database Architecture Specification

## 1. Storage Engine & Database Philosophy
- **Database**: **PostgreSQL 16 Enterprise**
- **ORM**: **Prisma ORM 6.x**
- **Schema Design Philosophy**:
  - Normalized relational structure (3NF) ensuring referential integrity.
  - Foreign key constraints on every parent-child association.
  - Immutable historical tables (`lead_assignments`, `lead_status_history`, `call_logs`, `audit_logs`) to prevent loss of operational context.
  - Enforced UTC timezone for all timestamp columns (`TIMESTAMPTZ`).
  - Strict unique indexes on natural keys (e.g., employee code, order number, invoice number, phone deduplication).

## 2. High-Level Entity Domains
```mermaid
erDiagram
    USERS ||--o{ EMPLOYEE_PROFILES : has
    USERS ||--o{ USER_SESSIONS : maintains
    USERS ||--o{ REFRESH_TOKENS : issues
    ROLES ||--o{ ROLE_PERMISSIONS : contains
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : mapped
    USERS ||--o{ ROLES : assigned

    LEAD_SOURCES ||--o{ LEADS : originates
    LEADS ||--o{ LEAD_ASSIGNMENTS : assigned_via
    LEADS ||--o{ LEAD_STATUS_HISTORY : transitions
    LEADS ||--o{ CALL_LOGS : logs
    LEADS ||--o{ FOLLOW_UPS : schedules
    LEADS ||--o{ PENDING_REVIEWS : submits
    LEADS ||--o{ APPROVAL_REQUESTS : submits
    LEADS ||--o| CUSTOMERS : converts

    CUSTOMERS ||--o{ ORDERS : places
    PRODUCT_CATEGORIES ||--o{ PRODUCTS : categorizes
    PRODUCTS ||--o{ ORDER_ITEMS : ordered
    ORDERS ||--o{ ORDER_ITEMS : contains
    ORDERS ||--o| INVOICES : bills
    ORDERS ||--o| SHIPMENTS : dispatches
    PRODUCTS ||--o{ INVENTORY : stocked
    INVENTORY ||--o{ INVENTORY_TRANSACTIONS : logs
```

## 3. Indexing & Optimization Strategy
- **Primary Keys**: UUID v4 or CUID2 for distributed scalability and zero enumeration risk.
- **Composite Indexes**:
  - `leads(status, assigned_to_id)` for fast salesperson workspace queries.
  - `leads(phone_number)` with normalized digits for instant duplicate lookups.
  - `call_logs(lead_id, created_at DESC)` for chronological calling history display.
  - `orders(customer_id, status)` for customer order history lookups.
  - `audit_logs(entity_type, entity_id, created_at DESC)` for fast compliance audits.
