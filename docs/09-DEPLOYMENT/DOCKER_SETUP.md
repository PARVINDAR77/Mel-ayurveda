# Docker & Containerization Specification

## 1. Docker Compose Topology (`docker-compose.yml`)
Includes:
- `postgres`: PostgreSQL 16 Alpine with persistent volume.
- `backend`: NestJS application container.
- `frontend`: Next.js standalone container.
- `redis` (Optional / Queue): In-memory caching & round-robin coordinator.

## 2. Multi-Stage Dockerfile Strategy
- Multi-stage build (Builder -> Runner) minimizes final image footprint (< 180MB) and strips development dependencies.
- Runs under non-root `node` user for container security hardening.
