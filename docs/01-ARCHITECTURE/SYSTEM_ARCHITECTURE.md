# System Architecture Specification

## 1. Architectural Topology
The **MELAYURVEDA Enterprise CRM** is architected as a modern, decoupled three-tier system:

```mermaid
flowchart TD
    subgraph ClientTier ["Client Presentation Layer (Next.js 15 App Router)"]
        UI_Admin["Super Admin Panel (/admin)"]
        UI_Sales["Salesperson Panel (/sales)"]
        UI_Pending["Pending Review Panel (/pending)"]
        UI_Approval["Approval Panel (/approval)"]
        UI_Mgmt["Management Panel (/management)"]
        TanStack["TanStack Query Cache + Axios HTTP Client"]
    end

    subgraph GatewayTier ["Security & Gateway Layer"]
        ReverseProxy["Reverse Proxy (Nginx / Cloudflare)"]
        RateLimiter["Rate Limiter & DDoS Shield"]
        HelmetCORS["Helmet Headers & CORS Guard"]
    end

    subgraph AppTier ["Application Business Logic Layer (NestJS 11 Core)"]
        AuthModule["Auth & Security Engine (Argon2id + JWT Guard)"]
        RBACModule["RBAC & ABAC Permission Interceptor"]
        LeadModule["Lead Lifecycle & Source Privacy Service"]
        CallModule["Calling & Follow-up Scheduler Service"]
        ReviewModule["Pending & Approval State Machine"]
        CommerceModule["Customer, Order, Inventory & Billing Service"]
        AuditModule["Structured Audit Logger & Event Bus"]
    end

    subgraph DataTier ["Data Persistence Layer (PostgreSQL 16)"]
        PrismaORM["Prisma Client & Migration Engine"]
        PostgresDB[(PostgreSQL Primary Database)]
        ReplicaDB[(Read Replica - Optional / Analytics)]
    end

    ClientTier -->|HTTPS / REST API / TLS 1.3| GatewayTier
    GatewayTier --> AppTier
    AppTier --> PrismaORM
    PrismaORM --> PostgresDB
```

## 2. Core Architectural Principles
1. **Single Source of Truth**: The PostgreSQL database is the sole authoritative store of all enterprise records. Frontend state is transient and synchronized via TanStack Query.
2. **Backend-Enforced Business Rules**: No critical business decision, status validation, or permission verification relies on frontend logic. The NestJS backend validates all invariants.
3. **Immutability of Audit Trails**: State transitions, call logs, assignment shifts, and administrative decisions generate immutable historical records.
4. **Principle of Least Privilege**: Users are granted the minimum necessary permissions required to fulfill their business function.
5. **Fail-Safe Data Isolation**: Lead source metadata is quarantined from sales access through architectural DTO separation.
