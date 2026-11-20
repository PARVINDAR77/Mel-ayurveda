# API Integration Testing Specification

## 1. Scope & Tooling
- **Framework**: Supertest + Jest.
- Integration tests execute real HTTP calls against the NestJS application initialized with an in-memory or Dockerized PostgreSQL database.

## 2. Test Execution Matrix by Bundle
- **Bundle 01**: Valid login, bad password, expired token, refresh rotation, revoked token reuse.
- **Bundle 02**: Employee creation with auto-generated ID, duplicate email rejection.
- **Bundle 05 & 06**: Manual lead creation, round-robin distribution, assignment history row creation.
- **Bundle 07 & 08**: Calling log creation, outcome state updates, follow-up scheduling.
- **Bundle 09 & 10**: Pending review submission, reviewer claim, approval sign-off.
- **Bundle 11 & 12**: Customer conversion, order calculation with GST, atomic stock reservation.
