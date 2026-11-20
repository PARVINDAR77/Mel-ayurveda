# Panel 03: Pending Leads Panel Specification

## 1. Overview & Authority
The **Pending Leads Panel** serves as the intermediate triage, quality control, and clinical verification hub. It is operated by senior quality audit personnel and clinical review coordinators to investigate disputed leads, verify consultation accuracy, and ensure customer readiness prior to commercial approval.

- **Primary Persona**: Quality Audit Officer / Senior Ayurvedic Consultant.
- **Identifier Prefix**: `MEL-PND-XXX` (e.g., `MEL-PND-001`).
- **Dashboard Title**: Review • Resolve • Forward.

## 2. Core Functional Capabilities

### 2.1 Pending Dashboard Metrics
- **Total Pending**: Total leads currently in pending status awaiting resolution.
- **Overdue Reviews**: Leads exceeding the 24-hour review SLA.
- **In Review**: Leads currently claimed and being audited by pending reviewers.
- **Completed Today**: Reviews resolved within the current work shift.

### 2.2 Pending Queue Management
- **Queue Table**: Displays Lead ID, Customer Name, Mobile Number, Submitting Salesperson Name, Submission Timestamp (`Since`), Priority, and Action (`Review`).
- **Review Claiming**: A reviewer can claim an unclaimed pending lead, setting status to `UNDER_REVIEW` and `claimed_by = reviewer_id` to prevent duplicate concurrent audits.

### 2.3 Comprehensive Audit Dossier
Clicking "Review" presents the full lead dossier:
- **Customer Profile**: Contact details, geographic location, health inquiries.
- **Consultation Trail**: Complete chronological call logs created by the original salesperson.
- **Submission Context**: Salesperson's stated reason, consultation summary, and proposed Ayurvedic regimen.
- **Secondary Contact Facility**: Interface allowing the pending reviewer to place an audit verification call and log secondary call notes.

### 2.4 Four-Way Decision Engine
The reviewer must execute one of four strictly audited decisions:
1. **APPROVE (Forward to Approval Queue)**: Lead meets quality and clinical standards; forwards to Panel 04 with status `APPROVAL_REQUESTED`.
2. **REJECT (Permanent Disqualification)**: Lead is invalid, non-responsive, or disqualified; requires detailed rejection category and rationale. Status -> `REJECTED`.
3. **REQUEST_FOLLOW_UP**: Reviewer notes missing clinical details; lead returned to salesperson with specific follow-up instructions. Status -> `FOLLOW_UP_REQUIRED`.
4. **SEND_BACK**: Lead consultation had flaws or missing customer consent; returned to salesperson's active workspace with corrective feedback. Status -> `CONTACTED`.
