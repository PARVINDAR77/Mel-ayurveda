# Data Protection & Privacy Specification

## 1. Lead Source Isolation
- Proprietary advertising metrics (Ad spend, campaign names, UTM tags) are quarantined from sales personnel.
- Enforced at database query projection and DTO serialization layers.

## 2. Customer PII Protection
- Customer phone numbers and addresses are accessible only to assigned sales reps and authorized management staff.
- Bulk export of customer records requires Super Admin authorization and logs a high-severity audit record.
