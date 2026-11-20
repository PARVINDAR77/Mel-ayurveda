# Frontend Architecture Specification

## 1. Technology Selection & Rationale
- **Framework**: **Next.js 15+ (App Router)**
  - *Rationale*: Server-side rendering (SSR) for initial auth shell, client components for interactive CRM workspaces, strict directory-based routing, and zero-bundle server utilities.
- **Language**: **TypeScript 5.x**
  - *Rationale*: End-to-end type safety sharing API response contracts with the backend.
- **Styling**: **Tailwind CSS 3.4+**
  - *Rationale*: Utility-first CSS ensuring deterministic styling, low bundle overhead, and a cohesive Ayurvedic color palette (Forest Green, Gold, Crisp Slate).
- **Server State Management**: **TanStack Query v5 (React Query)**
  - *Rationale*: Industry-standard cache management, optimistic updates for call outcome submissions, auto-refetching, and pagination handling.
- **Form Management & Validation**: **React Hook Form + Zod**
  - *Rationale*: Performant uncontrolled form inputs with schema-driven validation matching backend DTO constraints.
- **Data Visualization**: **Recharts**
  - *Rationale*: Highly customizable, responsive SVG charting for lead source distribution, sales conversion funnels, and executive KPIs.
- **Icons**: **Lucide React**
  - *Rationale*: Clean, consistent, lightweight SVG iconography across all five panels.

## 2. Directory Layout & Route Architecture
```
apps/frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── forgot-password/
│   ├── (dashboard)/
│   │   ├── admin/             # Panel 01: Super Admin
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── leads/
│   │   │   ├── sources/
│   │   │   └── reports/
│   │   ├── sales/             # Panel 02: Salesperson
│   │   │   ├── dashboard/
│   │   │   ├── my-leads/
│   │   │   ├── calling/
│   │   │   └── follow-ups/
│   │   ├── pending/           # Panel 03: Pending Review
│   │   │   ├── queue/
│   │   │   └── history/
│   │   ├── approval/          # Panel 04: Approval Authority
│   │   │   ├── queue/
│   │   │   └── history/
│   │   └── management/        # Panel 05: Operations & Billing
│   │       ├── customers/
│   │       ├── products/
│   │       ├── orders/
│   │       ├── inventory/
│   │       └── billing/
│   ├── layout.tsx
│   └── page.tsx               # Root redirector based on authenticated role
├── components/
│   ├── ui/                    # Atomic design system: Button, Input, Modal, Badge, Table
│   ├── shared/                # Navbar, Sidebar, UserMenu, StatCard, EmptyState, Loader
│   └── modules/               # Domain-specific components (LeadTable, CallDialog, OrderForm)
├── hooks/                     # Custom hooks: useAuth, useLeads, useDebounce, useMediaQuery
├── lib/
│   ├── api-client.ts          # Axios client with interceptors for token refresh
│   └── utils.ts               # Formatting, currency, date helpers
└── types/                     # Shared TypeScript interface definitions
```

## 3. Role-Based Navigation & Route Protection
- Client-side navigation is protected via custom `AuthGuard` and `RoleGuard` components wrapped in React context.
- Session tokens stored in secure HttpOnly cookies (with memory fallback).
- Unauthorized route navigation triggers immediate redirection to the user's primary authorized panel or login screen.
