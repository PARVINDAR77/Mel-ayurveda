# Local Development Setup Guide

## 1. Prerequisites
- Node.js 20+ LTS
- PostgreSQL 16+ (or Docker Desktop)
- Git 2.40+

## 2. Setup Steps
1. **Clone repository**:
   ```bash
   git clone <repo-url>
   cd Melayurveda
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure `DATABASE_URL`, `JWT_SECRET`, etc.
3. **Start Local Database via Docker**:
   ```bash
   docker compose up -d postgres
   ```
4. **Install Dependencies & Run Migrations**:
   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   ```
5. **Start Development Servers**:
   ```bash
   npm run dev
   ```
