# Panel 01: Super Admin Specification

## 1. Overview & Authority
The **Super Admin** role holds supreme operational, strategic, and security authority over the MELAYURVEDA CRM. This panel provides real-time organizational oversight, complete user lifecycle administration, multi-channel lead distribution governance, and high-level enterprise analytics.

- **Primary Persona**: Operations Director / Chief Operating Officer / System Administrator.
- **Identifier Prefix**: `MEL-ADM-XXX` (e.g., `MEL-ADM-001`).
- **Dashboard Title**: Complete Control • Monitor • Manage.

## 2. Core Functional Capabilities

### 2.1 Executive Dashboard Metrics
The Super Admin dashboard displays real-time key performance indicators:
- **Total Leads**: Cumulative count of all ingested and manually created leads.
- **This Month**: Leads acquired within the active calendar month.
- **Contacted**: Leads that have reached at least one calling attempt.
- **Pending Review**: Leads currently in the triage queue awaiting review.
- **Approved**: Leads that have cleared both Pending and Final Approval checks.
- **Rejected**: Total leads disqualified across all review stages.
- **Converted Customers**: Total leads transformed into active customer records.
- **Total Orders & Sales Revenue**: Aggregate order count and monetary sales (₹).
- **Lead Source Analytics**: Donut/pie chart illustrating source distribution (Facebook Ads, Instagram Ads, Website, WhatsApp, Google Ads, Manual).
- **Sales Performance**: Bar chart comparing calling volumes, conversions, and revenue per sales representative.
- **Recent Activity Stream**: Chronological feed of critical events (new leads, assignments, approvals, confirmed orders).

### 2.2 Employee Lifecycle Management
- **Provisioning**: Create employee profiles with mandatory fields: First Name, Last Name, Official Email, Phone Number, Assigned Role (`SUPER_ADMIN`, `SALESPERSON`, `PENDING_REVIEWER`, `APPROVAL_OFFICER`, `MANAGEMENT`), and Designation.
- **Automated ID Generation**: System assigns the next sequential unique identifier based on role prefix (e.g., `MEL-ADM-001`, `MEL-SAL-001`, `MEL-PND-001`, `MEL-APR-001`, `MEL-MGT-001`).
- **Account Control**: Instantly activate, suspend, or deactivate accounts. Deactivation invalidates all active sessions and refresh tokens immediately.
- **Secure Access Reset**: Trigger a secure password reset flow issuing a time-limited (1-hour), single-use reset token via official email.
- **Lead Reassignment & Offboarding**: Safely transfer all active or pending leads from a departing/inactive employee to an active team member with mandatory audit logging.

### 2.3 Lead Governance & Manual Intake
- **Master Lead Registry**: Full visibility into all leads, unconstrained by assignment.
- **Advanced Filtering & Search**: Multi-parameter search by Lead ID, Customer Name, Mobile, Status, Date Range, Priority, Source, and Assigned Employee.
- **Manual Lead Creation**: Full manual entry modal allowing immediate assignment or unassigned queue placement.
- **Bulk Lead Operations**: Bulk assign, bulk status override (with mandatory administrative reason), and bulk export (audited).

### 2.4 Lead Source Configuration
- Configure external acquisition channels (Facebook, Instagram, Google Ads, WhatsApp, Website).
- Manage API credentials, webhook verification secrets, and UTM mapping rules.
- View source acquisition metrics, cost per lead (CPL), and channel conversion rates.
