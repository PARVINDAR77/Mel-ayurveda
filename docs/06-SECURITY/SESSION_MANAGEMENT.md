# Session Management Specification

## 1. Persistent Session Tracking
- Active sessions are recorded in PostgreSQL table `user_sessions` capturing:
  - `userId`, `ipAddress`, `userAgent`, `createdAt`, `lastActiveAt`, `isActive`.

## 2. Explicit Session Termination
- Calling `POST /api/v1/auth/logout` marks the session inactive and revokes associated refresh tokens.
- Super Admin can execute "Force Logout" on any employee, immediately revoking all active sessions and tokens.
