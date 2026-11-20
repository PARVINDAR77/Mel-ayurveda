# Comprehensive Testing Strategy

## 1. Testing Pyramid & Target Coverage
The MELAYURVEDA CRM enforces a rigorous automated testing pyramid:

```
          /\
         /  \  E2E Playwright Scenarios (Complete Lead Journey) - 10%
        /----\
       /      \  Integration & API Tests (Supertest across 15 Bundles) - 30%
      /--------\
     /          \  Unit Tests (Jest for Services, Pipes, Guards, Utils) - 60%
    --------------
```

- **Target Code Coverage**:
  - Global Business Services: >= 85%
  - Auth, Security, Roles, & Lead Privacy Guards: 100%
  - Core Workflow State Machine Transitions: 100%

## 2. Test Execution Environments
- **Local Unit & Integration**: Run against isolated Dockerized PostgreSQL test database.
- **Continuous Integration (CI)**: GitHub Actions running on every Pull Request; zero failure tolerance.
