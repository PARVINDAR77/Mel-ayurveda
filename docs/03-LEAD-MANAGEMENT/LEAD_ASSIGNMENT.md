# Lead Assignment Engine Specification

## 1. Assignment Strategies

### 1.1 Manual Single & Bulk Allocation
- **Actor**: Super Admin.
- **Workflow**: Admin selects one or multiple leads from the Unassigned Queue (`status = NEW`), selects an active salesperson from the roster, and confirms.
- **Atomicity**: Executed in a single database transaction. Updates lead records and creates corresponding `lead_assignments` rows.

### 1.2 Automated Round-Robin Engine
- **Trigger**: Incoming webhook lead ingestion.
- **Mechanism**:
  1. Retrieve all active employees with role `SALESPERSON` whose `is_active = true` and `is_accepting_leads = true`.
  2. Maintain a round-robin pointer in Redis or PostgreSQL `system_settings`.
  3. Assign incoming lead to the next eligible salesperson in sequence.
  4. Increment round-robin pointer modulo the pool size.

### 1.3 Priority & Geography-Based Routing (Advanced Rules)
- Leads flagged as `URGENT` or with high-value product interest can be routed to senior sales consultants.
- Leads matching specific Indian states (e.g., Gujarat, Maharashtra, Delhi NCR) can be prioritized to consultants fluent in regional languages.

## 2. Assignment History & Tracking Schema
Every assignment or reassignment is captured permanently:
```sql
CREATE TABLE lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    assigned_by_id UUID NOT NULL REFERENCES users(id),
    assigned_to_id UUID NOT NULL REFERENCES users(id),
    reassignment_reason VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

When a reassignment occurs, previous assignments for that lead set `is_active = false`, preserving a full chronological audit chain.
