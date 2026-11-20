# STRIDE Threat Model Analysis

## 1. Identified Threats & Mitigations

| Threat Category | Potential Attack Vector | Applied Mitigation |
|:---|:---|:---|
| **Spoofing** | Attacker impersonates employee via stolen credentials. | Argon2id hashing, short-lived JWTs (15m), refresh token rotation, MFA for Super Admin. |
| **Tampering** | Salesperson attempts to alter call logs or historical records. | Call logs are append-only; database foreign keys disallow update/delete. |
| **Repudiation** | Employee denies executing an unauthorized status change. | Immutable `audit_logs` capturing actor ID, timestamp, IP, old state, and new state. |
| **Information Disclosure** | Salesperson discovers marketing spend and lead sources. | Strict DTO projection and API response filtering quarantine source data. |
| **Denial of Service** | Botnet floods lead webhook or login endpoints. | Express-rate-limit, Nginx burst shields, request body size limits. |
| **Elevation of Privilege** | Salesperson calls approval endpoints via crafted HTTP requests. | NestJS `RolesGuard` and `PermissionsGuard` verify server-side claims on every endpoint. |
