# Data Retention & Archival Policy

## 1. Regulatory Context
Under the Indian Digital Personal Data Protection Act (DPDP Act 2023) and commercial accounting regulations, MELAYURVEDA CRM enforces strict retention policies:
- **Financial & Invoicing Records**: Preserved for a minimum of 8 statutory fiscal years.
- **Audit Logs**: Retained in high-speed storage for 2 years, then archived to cold storage for 7 years.
- **Lead History & Call Logs**: Maintained indefinitely as clinical-commercial operational context.
- **Session Tokens**: Automatically purged after 30 days of inactivity.

## 2. Soft-Deletion vs Hard-Deletion
- Primary records are marked inactive via `isActive: false` flags rather than issuing SQL `DELETE` statements.
- Personal customer data requests under DPDP Act (Right to Erasure) trigger cryptographic data anonymization (replacing PII with hashed identifiers) while preserving financial order totals.
