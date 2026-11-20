# Project Folder Structure Specification

## 1. Monorepo Organization
The Melayurveda CRM codebase is organized as an enterprise-grade monorepo to maintain separation of concerns while facilitating shared type definitions and tooling.

```
/ (Repository Root)
├── .github/                   # CI/CD Workflows, PR templates
├── apps/
│   ├── backend/               # NestJS 11+ REST API Application
│   │   ├── prisma/            # Prisma schema, migrations, seeders
│   │   ├── src/               # Application source code
│   │   ├── test/              # Integration and E2E test suites
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/              # Next.js 15+ App Router Application
│       ├── app/               # Routes, page layouts, route handlers
│       ├── components/        # Atomic UI & domain-specific widgets
│       ├── hooks/             # Custom React state and data hooks
│       ├── lib/               # Utility libraries & API client
│       ├── public/            # Static assets, branding, icons
│       ├── package.json
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── docs/                      # Master Architecture & Technical Documentation
│   ├── 00-PROJECT-FOUNDATION/
│   ├── 01-ARCHITECTURE/
│   ├── 02-USER-ROLES/
│   ├── 03-LEAD-MANAGEMENT/
│   ├── 04-DATABASE/
│   ├── 05-API/
│   ├── 06-SECURITY/
│   ├── 07-UI-UX/
│   ├── 08-TESTING/
│   ├── 09-DEPLOYMENT/
│   └── 10-PROJECT-TRACKING/
├── packages/
│   └── shared/                # Shared TypeScript contracts, DTO interfaces, Enums
├── docker-compose.yml         # Local dev environment orchestration
├── docker-compose.prod.yml    # Production container configuration
├── .gitignore
├── .editorconfig
├── README.md
└── MASTER_IMPLEMENTATION_PROMPT.md
```
