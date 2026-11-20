# Security Testing Strategy & Verification Plan

## 1. Automated Security Test Scenarios
1. **Salesperson Lead Source Leak Test**: Verify that calling `GET /api/v1/leads` with sales credentials returns zero source attributes.
2. **IDOR Test**: Salesperson A attempts to query or log a call for Lead assigned to Salesperson B; must return `403 Forbidden`.
3. **Privilege Escalation Test**: Salesperson attempts to call `POST /api/v1/employees` or `POST /api/v1/approvals/:id/decide`; must return `403 Forbidden`.
4. **Brute Force Defense Test**: 6 failed logins from one IP triggers rate limit HTTP `429`.
5. **SQL Injection Defense**: Attempting SQL injection strings in lead search returns sanitized empty results without syntax errors.
