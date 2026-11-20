# ==============================================================================
# MELAYURVEDA CRM - CORE BACKEND PRODUCTION DOCKERFILE
# Multi-Stage Build: Builder -> Hardened Non-Root Runner (< 180MB)
# ==============================================================================

# Stage 1: Build & Compile
FROM node:20-alpine AS builder

WORKDIR /app

# Install build essentials for native dependencies if needed
RUN apk add --no-cache python3 make g++

# Copy root monorepo package manifests
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/backend/package*.json ./apps/backend/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code and Prisma schema
COPY packages/shared/ ./packages/shared/
COPY apps/backend/ ./apps/backend/

# Generate Prisma Client
RUN npx prisma generate --schema=apps/backend/prisma/schema.prisma

# Build shared package and backend application
RUN npm run build --workspace=@melayurveda/shared || true
RUN npm run build --workspace=@melayurveda/backend

# Prune development dependencies for minimal runner footprint
RUN npm prune --production

# ==============================================================================
# Stage 2: Hardened Production Runner
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Add dumb-init for proper PID 1 signal forwarding (SIGTERM, SIGINT)
RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production
ENV PORT=4100

# Security Hardening: Run as non-root 'node' user
USER node

# Copy dependencies, built output, Prisma client, and schema from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/packages ./packages
COPY --chown=node:node --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --chown=node:node --from=builder /app/apps/backend/package.json ./apps/backend/package.json

WORKDIR /app/apps/backend

EXPOSE 4100

# Health check probe against /api/v1/health
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:4100/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
