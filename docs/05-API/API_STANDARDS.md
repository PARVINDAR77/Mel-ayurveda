# REST API Standards & Conventions

## 1. Protocol & Base URL
- Protocol: HTTPS / TLS 1.3
- Base Path: `/api/v1`
- Content-Type: `application/json`

## 2. Standardized Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "totalPages": 63
  },
  "timestamp": "2026-11-20T12:00:00.000Z"
}
```

## 3. Standardized Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed on 1 field",
    "details": [
      {
        "field": "phoneNumber",
        "message": "Must be a valid 10-digit Indian mobile number"
      }
    ],
    "traceId": "trace-uuid-12345"
  },
  "timestamp": "2026-11-20T12:00:00.000Z"
}
```

## 4. HTTP Status Code Usages
- `200 OK`: Successful GET, PUT, PATCH.
- `201 Created`: Successful POST creation.
- `204 No Content`: Successful deletion or null action.
- `400 Bad Request`: Validation errors or invalid state machine transitions.
- `401 Unauthorized`: Missing, expired, or invalid JWT token.
- `403 Forbidden`: Role lacks authorized permission for the action.
- `404 Not Found`: Resource entity does not exist.
- `409 Conflict`: Natural key collision (e.g. duplicate phone in active window).
- `429 Too Many Requests`: Rate limit exceeded.
- `500 Internal Server Error`: Unexpected server error (logged with traceId).
