# Security Test Cases & Penetration Verification

## 1. Test Suite: Lead Source Privacy
- **SEC-TC-01**: Authenticate as `SALESPERSON`. Call `GET /api/v1/leads`. Assert `response.body.data[0].sourceType === undefined` and no campaign keys exist.
- **SEC-TC-02**: Authenticate as `SALESPERSON`. Call `GET /api/v1/lead-sources`. Assert HTTP status `403 Forbidden`.

## 2. Test Suite: IDOR & Horizontal Privilege Escalation
- **SEC-TC-03**: Authenticate as `SALESPERSON_A`. Attempt to post call log to lead assigned to `SALESPERSON_B`. Assert HTTP `403 Forbidden`.
- **SEC-TC-04**: Authenticate as `SALESPERSON`. Attempt to call `POST /api/v1/approvals/:id/decide`. Assert HTTP `403 Forbidden`.

## 3. Test Suite: Authentication & Session Tampering
- **SEC-TC-05**: Submit forged JWT signature. Assert HTTP `401 Unauthorized`.
- **SEC-TC-06**: Re-use previously rotated refresh token. Assert HTTP `401` and assert session revocation.
