# Duplicate Lead Handling Specification

## 1. Deduplication Principles
To protect sales consultant ownership, prevent customer harassment, and maintain accurate acquisition metrics, the CRM employs strict phone-based deduplication algorithms.

## 2. Normalization Engine
Every mobile number undergoes automated cleansing before matching:
- Strip whitespace, hyphens, parentheses, and leading `+91` or `0`.
- Validate standard Indian 10-digit mobile pattern: `^[6-9]d{9}$`.
- Store canonical 10-digit format in `leads.phone_number`.

## 3. Business Policies for Matching Records
When a newly ingested lead matches an existing phone number:

### Policy A: Active Sales Window (Within 30 Days)
- If the existing lead was created or contacted within the past 30 days and is currently `ASSIGNED`, `CONTACTED`, `FOLLOW_UP_REQUIRED`, or `INTERESTED`:
  - The incoming inquiry is **NOT** assigned to a new salesperson.
  - An entry is logged in `lead_duplicate_attempts` linking the new inquiry metadata to the original lead.
  - The currently assigned salesperson receives an in-app notification: *"Patient re-engaged via [Channel]"*.

### Policy B: Stale Lead (Older than 30 Days & Terminal State)
- If the previous lead is in a terminal state (`NOT_INTERESTED`, `REJECTED`) or inactive for > 60 days:
  - System permits creation of a re-engagement lead or re-activates the record into `NEW` status for fresh assignment.
