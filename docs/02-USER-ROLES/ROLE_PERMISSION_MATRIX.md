# Role-Permission Matrix Specification

## 1. System Roles
- **SUPER_ADMIN**: Supreme administrative authority.
- **SALESPERSON**: Tele-sales & Ayurvedic health consultation.
- **PENDING_REVIEWER**: Quality audit & clinical verification.
- **APPROVAL_OFFICER**: Final commercial & medical sign-off.
- **MANAGEMENT**: Operations, customer CRM, inventory, billing, dispatch.

## 2. Comprehensive Permission Matrix

| Module | Permission Key | SUPER_ADMIN | SALESPERSON | PENDING_REVIEWER | APPROVAL_OFFICER | MANAGEMENT |
|:---|:---|:---:|:---:|:---:|:---:|:---:|
| **Authentication** | `auth:login` | YES | YES | YES | YES | YES |
| | `auth:refresh_token` | YES | YES | YES | YES | YES |
| | `auth:reset_password` | YES | NO | NO | NO | NO |
| **Employee Admin** | `employee:create` | YES | NO | NO | NO | NO |
| | `employee:read_all` | YES | NO | NO | NO | NO |
| | `employee:update` | YES | NO | NO | NO | NO |
| | `employee:deactivate` | YES | NO | NO | NO | NO |
| **Lead Sources** | `lead_source:create` | YES | NO | NO | NO | NO |
| | `lead_source:read` | YES | **FORBIDDEN** | NO | NO | YES |
| | `lead_source:analytics`| YES | **FORBIDDEN** | NO | NO | YES |
| **Leads** | `lead:create_manual` | YES | NO | NO | NO | YES |
| | `lead:read_all` | YES | NO | NO | NO | YES |
| | `lead:read_assigned` | YES | YES | NO | NO | NO |
| | `lead:update_details` | YES | YES (Limited) | YES (Notes) | NO | YES |
| | `lead:export` | YES | **FORBIDDEN** | NO | NO | YES |
| **Lead Assignment** | `lead:assign_manual` | YES | NO | NO | NO | NO |
| | `lead:assign_bulk` | YES | NO | NO | NO | NO |
| | `lead:reassign` | YES | NO | NO | NO | NO |
| **Calling** | `call:create_log` | YES | YES (Assigned) | YES (Audit) | NO | NO |
| | `call:read_history` | YES | YES (Assigned) | YES (Audit) | YES (Audit) | YES |
| | `call:update_log` | **FORBIDDEN** | **FORBIDDEN** | **FORBIDDEN** | **FORBIDDEN** | **FORBIDDEN** |
| **Follow-ups** | `followup:create` | YES | YES | YES | NO | NO |
| | `followup:update` | YES | YES | YES | NO | NO |
| **Pending Review** | `pending:submit` | YES | YES | NO | NO | NO |
| | `pending:read_queue` | YES | NO | YES | NO | NO |
| | `pending:claim` | YES | NO | YES | NO | NO |
| | `pending:decide` | YES | NO | YES | NO | NO |
| **Approval** | `approval:submit` | YES | NO | YES | NO | NO |
| | `approval:read_queue`| YES | NO | NO | YES | NO |
| | `approval:decide` | YES | NO | NO | YES | NO |
| **Customer CRM** | `customer:convert` | YES | NO | NO | NO | YES |
| | `customer:read` | YES | NO | NO | NO | YES |
| | `customer:update` | YES | NO | NO | NO | YES |
| **Products** | `product:manage` | YES | NO | NO | NO | YES |
| | `product:read` | YES | YES | YES | YES | YES |
| **Orders & Invoices**| `order:create_draft` | YES | NO | NO | NO | YES |
| | `order:confirm` | YES | NO | NO | NO | YES |
| | `invoice:generate` | YES | NO | NO | NO | YES |
| **Inventory** | `inventory:read` | YES | NO | NO | NO | YES |
| | `inventory:adjust` | YES | NO | NO | NO | YES |
| **Dispatch** | `dispatch:update` | YES | NO | NO | NO | YES |
| **Audit Logs** | `audit:read` | YES | **FORBIDDEN** | **FORBIDDEN** | **FORBIDDEN** | **FORBIDDEN** |

*Note: Bold **FORBIDDEN** signifies an explicit security invariant tested via automated API test suites.*
