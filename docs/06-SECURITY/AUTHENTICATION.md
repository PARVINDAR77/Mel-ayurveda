# Authentication Architecture & Token Lifecycle

## 1. Dual-Token Architecture
The CRM utilizes a short-lived access token paired with rotating refresh tokens:

```mermaid
sequenceDiagram
    autonumber
    Client ->> Backend: POST /api/v1/auth/login (email + password)
    Backend ->> Database: Fetch user & verify Argon2id hash
    Backend ->> Database: Record active session & hash of refresh token
    Backend -->> Client: 200 OK + JWT Access Token (15m expiry) + HttpOnly Refresh Cookie (7d)
    
    Note over Client,Backend: Regular API Calls with Bearer Access Token
    
    Client ->> Backend: POST /api/v1/leads (with expired Access Token)
    Backend -->> Client: 401 Unauthorized
    
    Client ->> Backend: POST /api/v1/auth/refresh (HttpOnly Refresh Cookie)
    Backend ->> Database: Validate token hash & check isRevoked == false
    Backend ->> Database: Revoke old token & store new token hash (Rotation)
    Backend -->> Client: 200 OK + New Access Token + New Refresh Cookie
```

## 2. Refresh Token Rotation & Theft Detection
- Every refresh operation burns the incoming token and issues a brand-new token pair.
- If a revoked token is presented, the system detects a token reuse anomaly, invalidates the entire token family, terminates the session, and triggers a security audit event.
