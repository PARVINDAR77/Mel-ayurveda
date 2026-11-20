# Project Overview: MELAYURVEDA CRM

## 1. Executive Summary
**MELAYURVEDA INDIA PVT. LTD.** is a leading Ayurvedic healthcare and wellness enterprise. The company manufactures, markets, and dispenses premium Ayurvedic formulations, specialized therapeutic wellness packages, and personalized Ayurvedic care regimens.

To scale operations nationwide, Melayurveda receives customer inquiries and sales leads through multiple digital acquisition channels:
- Meta Platforms (Facebook Ads, Instagram Lead Ads)
- Google Ads (Search, Display, Performance Max)
- Melayurveda Official E-Commerce Website & Consult Portals
- Direct WhatsApp Business Inquiries & Telephonic Inbound
- Manual Field & Clinical Referrals

The **MELAYURVEDA Enterprise CRM** is designed as a secure, role-based, end-to-end Lead Lifecycle and Business Operations Management system. It replaces fragmented spreadsheets and ad-hoc communication with a strictly auditable, transaction-safe workflow connecting Marketing, Tele-Sales, Quality Audit (Pending Review), Clinical & Commercial Approval, Customer Care, Inventory, and Logistics.

## 2. Company Identity & Brand Governance
- **Legal Entity**: MELAYURVEDA INDIA PVT. LTD.
- **Operating Sector**: Classical & Proprietary Ayurvedic Medicine, Herbal Formulations, Wellness Lifestyle Care.
- **Brand Identity**: Premium Forest Green (`#14532D`), Pure White (`#FFFFFF`), Subtle Gold/Sand Accents (`#CA8A04`).
- **Core Mission**: Delivering authenticated, scientifically validated Ayurvedic health solutions with human-centered care, clinical integrity, and operational excellence.
- **Compliance Mandate**: Strict adherence to Ayush Ministry advertising guidelines, Drugs and Cosmetics Act (1940), and Indian Digital Personal Data Protection Act (DPDP Act 2023).

## 3. Core Business Objectives
1. **Zero Lead Leakage & Prompt Engagement**: Ingest leads from all marketing endpoints into a centralized PostgreSQL repository within sub-second latencies; auto-distribute leads to available sales representatives.
2. **Strict Lead Source Privacy**: Sales personnel must be empowered to consult and sell without exposure to marketing sources, ad campaign identifiers, or lead generation expenditures, protecting proprietary acquisition intelligence.
3. **Multi-Tier Quality & Compliance Auditing**: High-value Ayurvedic care requires customer requirement validation. A dual-tier review mechanism (**Pending Review** & **Final Approval**) ensures consultations meet company standards before commercial conversion.
4. **Seamless Commercial & Dispatch Execution**: Instantaneous transformation of approved leads into verified customer profiles, sales draft generation, stock reservation, GST-compliant invoice issuance, and courier tracking integration.
5. **End-to-End Auditability**: Immutable chronological tracking of every lead interaction, phone call attempt, status change, employee reassignment, and administrative decision.

## 4. Key Stakeholders & System Roles
| Role Code | Role Name | Primary Responsibility |
|:---|:---|:---|
| `SUPER_ADMIN` | Super Administrator | Executive control, employee provisioning, lead distribution, system configuration, master reporting. |
| `SALESPERSON` | Ayurvedic Health Consultant / Tele-Sales | Calling assigned leads, assessing health requirements, logging call outcomes, submitting qualified leads for review. |
| `PENDING_REVIEWER` | Quality & Clinical Review Officer | Investigating disputed or complex leads, conducting verification calls, ensuring compliance before approval. |
| `APPROVAL_OFFICER` | Commercial & Medical Approver | Final authority verifying customer consent, pricing, and health regimen; authorizing customer creation and order initiation. |
| `MANAGEMENT` | Operations, Inventory & Dispatch Officer | Customer relationship management, product inventory allocation, GST invoicing, package fulfillment, and courier tracking. |

## 5. Architectural High-Water Marks
- **Decoupled Architecture**: Next.js 15+ frontend talking exclusively to NestJS 11+ REST API via strictly typed JSON payloads.
- **Relational Integrity**: PostgreSQL as single source of truth managed via Prisma ORM, utilizing foreign keys, strict check constraints, and transactional wrappers.
- **Zero-Trust Access**: Argon2id salted password hashing, JWT short-lived access tokens with rotating refresh tokens, granular RBAC/ABAC guards.
- **Enterprise Observability**: Winston/Pino structured audit logging recording user, action, entity ID, previous state, new state, IP address, and user agent.
