# Panel 02: Salesperson Panel Specification

## 1. Overview & Authority
The **Salesperson** role represents the Ayurvedic Health Consultant and Tele-Sales representative. Sales personnel engage with prospective customers, understand health concerns, recommend company-approved Ayurvedic regimens, record calling outcomes, and submit qualified candidates for quality review.

- **Primary Persona**: Ayurvedic Health Consultant / Tele-Sales Executive.
- **Identifier Prefix**: `MEL-SAL-XXX` (e.g., `MEL-SAL-001`).
- **Dashboard Title**: My Leads • Call • Follow Up.

## 2. Core Functional Capabilities

### 2.1 Strict Lead Source Privacy (Zero Source Exposure)
- **Business Rule**: Sales personnel MUST NOT see marketing acquisition source, campaign name, ad creative, cost-per-lead, or external platform identifiers under any circumstances.
- **Technical Enforcement**:
  - The API endpoint `GET /api/v1/leads` filters records by `assigned_to_id = current_user.id`.
  - The serializer projects responses into `SalespersonLeadResponseDto`, completely omitting `source_type`, `campaign_id`, `utm_parameters`, and related fields.
  - The UI table never renders source columns.

### 2.2 Sales Dashboard Metrics
- **My Total Leads**: Cumulative assigned leads.
- **Called**: Number of leads with at least one logged call.
- **Pending Follow-up**: Leads with scheduled follow-ups due today or overdue.
- **Interested**: Leads marked with outcome `INTERESTED`.
- **Pending Review Requests**: Leads submitted to Pending Panel awaiting review.
- **Approved Leads**: Leads successfully cleared through approval.
- **Converted Customers**: Leads converted into orders.
- **Daily Calling Target Progress**: Progress bar tracking daily completed call count against quota (e.g., 50 calls/day).

### 2.3 My Leads Workspace
The salesperson workspace presents a clean, responsive table:
- **Columns**: Lead ID (`MEL-LEAD-XXXXX`), Customer Name, Mobile Number, City, State, Product Interest, Priority (`LOW`, `NORMAL`, `HIGH`, `URGENT`), Status, Action Button (`Call`).
- **Filters**: Status filter (`NEW`, `CONTACTED`, `FOLLOW_UP_REQUIRED`, `INTERESTED`), Priority filter, Search by Name/Mobile.

### 2.4 Calling Management & Outcome Logging
Clicking the "Call" action opens the Calling Drawer/Modal:
- **Customer Summary**: Full Name, Primary Phone, Alternate Phone, City, Stated Health Concern.
- **Call Outcome Selector**: Single-select dropdown with mandatory outcomes:
  - `INTERESTED`
  - `NOT_INTERESTED`
  - `NO_ANSWER`
  - `BUSY_CALL_LATER`
  - `INVALID_NUMBER`
  - `FOLLOW_UP_REQUIRED`
  - `PENDING_REVIEW`
  - `REJECTED`
- **Consultation Notes**: Rich text or markdown area for product inquiry observation, customer requirements, and recommended Ayurvedic package.
- **Follow-up Date & Time Picker**: Mandatory if outcome is `FOLLOW_UP_REQUIRED` or `BUSY_CALL_LATER`.
- **Calling History Timeline**: Chronological read-only list of all past call logs for this customer.

### 2.5 Submission to Pending Review
When a customer expresses complex symptoms, requests customized pricing, or requires clinical quality validation:
- Salesperson clicks "Submit to Pending".
- Modal requires: Review Reason (`CLINICAL_VALIDATION`, `SPECIAL_PRICING`, `DISPUTED_CONTACT`, `HIGH_VALUE_ORDER`), Consultation Summary, and Proposed Regimen.
- Lead status transitions to `PENDING_REVIEW`; lead appears in Pending Queue while retaining original salesperson attribution.
