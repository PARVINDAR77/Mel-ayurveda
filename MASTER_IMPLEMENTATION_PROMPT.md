# MASTER IMPLEMENTATION PROMPT
# MELAYURVEDA – ENTERPRISE AYURVEDIC CRM SYSTEM

## 1. YOUR ROLE
Act as a Senior Software Architect, Senior Full-Stack Developer, Backend Engineer, Database Architect, UI/UX Designer, DevSecOps Engineer, and QA Automation Engineer.
You are responsible for planning, architecting, documenting, developing, testing, securing, and preparing a complete production-ready CRM for MELAYURVEDA INDIA PVT. LTD.
This is a real business-critical CRM, not a demo, prototype, template, or static dashboard.
You must work systematically, phase by phase.

**MOST IMPORTANT INSTRUCTION:**
FIRST CREATE ALL REQUIRED MARKDOWN DOCUMENTATION FILES.
ONLY AFTER COMPLETING AND VERIFYING THE DOCUMENTATION, START THE ACTUAL SOFTWARE DEVELOPMENT.
Never skip documentation. Never start coding all modules simultaneously. Never mark a feature complete just because its frontend UI exists.

## 2. PROJECT OBJECTIVE
Build a complete Ayurvedic Business Lead Management and Sales CRM for MELAYURVEDA INDIA PVT. LTD.
The company receives customer leads from multiple platforms and manages them through a structured employee workflow.

Core Capabilities:
1. Super Admin to control the complete CRM.
2. Super Admin to create multiple employees and sales accounts.
3. Super Admin to generate unique employee IDs (e.g., MEL-ADM-001, MEL-SAL-001, MEL-PND-001, MEL-APR-001, MEL-MGT-001).
4. Super Admin to collect leads from different platforms (Facebook, Instagram, Google Ads, Website, WhatsApp, Manual).
5. Super Admin to manually create leads.
6. Super Admin to assign leads to specific salespeople.
7. Salespeople to manage only their authorized assigned leads.
8. Salespeople to call customers and record call outcomes.
9. Salespeople to submit leads for pending review.
10. Pending employees to review and process pending leads.
11. Approval employees to approve, reject, or return leads.
12. Super Admin to monitor the complete workflow.
13. Management employees to manage customers, products, orders, billing, inventory, and dispatch.
14. Every activity to be stored in PostgreSQL.
15. Every business operation to communicate through NestJS APIs.
16. Complete security, authentication, authorization, validation, logging, and testing.

## 3. MANDATORY TECHNOLOGY STACK
- Frontend: Next.js (App Router), React, TypeScript, Tailwind CSS, React Hook Form, Zod, TanStack Query, Recharts.
- Backend: NestJS, TypeScript, REST API (/api/v1), DTO validation (class-validator), Authentication/Authorization Guards, Swagger/OpenAPI.
- Database: PostgreSQL, Prisma ORM, Version-controlled migrations, Transactions, Connection pooling.
- Security: Argon2id password hashing, JWT access tokens (15m), Refresh token rotation (7d), HttpOnly cookies, RBAC + ABAC, Helmet, CORS, Audit logging.
- Development: Docker, Docker Compose, ESLint, Prettier, Jest, Supertest, Playwright.

## 4. FIVE CRM PANELS
1. PANEL 01 – SUPER ADMIN (Complete Control, Monitoring, Employee Management, Lead Assignment, Analytics)
2. PANEL 02 – SALESPERSON (Authorized Leads, Calling Management, Call Outcomes, Lead Source Hidden, Pending Submission)
3. PANEL 03 – PENDING LEADS (Pending Review Queue, Re-contact, Approve/Reject/Request Follow-up/Send Back)
4. PANEL 04 – APPROVAL (Final Lead Verification, Approve/Reject/Send Back, Customer Conversion Trigger)
5. PANEL 05 – MANAGEMENT (Customers, Products, Disease-wise categories, Orders, Billing, Inventory, Courier & Dispatch)
