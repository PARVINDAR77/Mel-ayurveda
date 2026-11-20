# ==============================================================================
# MELAYURVEDA CRM - FRONTEND PRODUCTION DOCKERFILE
# Multi-Stage Standalone Next.js 15 Image (< 120MB)
# ==============================================================================

# Stage 1: Dependencies Cache
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/frontend/package*.json ./apps/frontend/
RUN npm ci

# Stage 2: Standalone Next.js Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build time
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build standalone distribution
RUN npm run build --workspace=@melayurveda/frontend

# ==============================================================================
# Stage 3: Minimal Production Runner
# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init wget

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root system group and user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy static assets and standalone server bundle
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/login || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/frontend/server.js"]
