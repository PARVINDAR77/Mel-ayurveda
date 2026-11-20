# API Versioning Strategy

## 1. Versioning Scheme
- **URI Versioning**: Standardized path prefix: `/api/v1`.
- All controllers declare versioning explicitly:
  ```typescript
  @Controller({ path: 'leads', version: '1' })
  ```

## 2. Deprecation & Lifecycle Policy
- Breaking changes require a new version namespace (`/api/v2`).
- Deprecated endpoints emit standard HTTP headers:
  - `Deprecation: true`
  - `Sunset: Wed, 11 Nov 2027 00:00:00 GMT`
