# Unit Testing Standards & Guidelines

## 1. Framework & Tooling
- **Test Runner**: Jest
- **Mocking**: `jest.mock()` & `@golevelup/ts-jest` for automatic NestJS dependency mocking.

## 2. Unit Testing Principles
- Unit tests isolate business logic from database side-effects.
- Every state transition rule in `LeadsService` must have a dedicated unit test asserting both permitted transitions and rejected invalid transitions.
- Every DTO custom validator (Indian phone, GSTIN, employee code) must have positive and negative boundary test cases.
