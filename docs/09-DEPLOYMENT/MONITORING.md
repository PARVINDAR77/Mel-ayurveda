# Monitoring & Observability Architecture

## 1. Health Check Endpoints
- `GET /api/v1/health`: Application uptime, memory usage, Node.js event loop lag.
- `GET /api/v1/health/db`: Verifies PostgreSQL connectivity and pool status.

## 2. Structured Logging & Metrics
- JSON-formatted logs using Pino with contextual trace IDs.
- Error alerts dispatched to Sentry and operational Slack/Teams webhook channels for any unhandled 5xx errors.
