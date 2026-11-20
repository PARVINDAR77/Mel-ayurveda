-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'SALESPERSON', 'PENDING_REVIEWER', 'APPROVAL_OFFICER', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "LeadSourceType" AS ENUM ('FACEBOOK_ADS', 'INSTAGRAM_ADS', 'GOOGLE_ADS', 'WEBSITE', 'WHATSAPP', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ASSIGNED', 'CONTACTED', 'FOLLOW_UP_REQUIRED', 'INTERESTED', 'NOT_INTERESTED', 'INVALID_NUMBER', 'PENDING_REVIEW', 'UNDER_REVIEW', 'APPROVAL_REQUESTED', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "CallOutcome" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'NO_ANSWER', 'BUSY_CALL_LATER', 'INVALID_NUMBER', 'FOLLOW_UP_REQUIRED', 'PENDING_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PendingDecision" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_FOLLOW_UP', 'SEND_BACK');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVE', 'REJECT', 'SEND_BACK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH_ON_DELIVERY', 'UPI', 'NET_BANKING', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InventoryTxType" AS ENUM ('RESTOCK', 'ORDER_RESERVATION', 'ORDER_FULFILLED', 'ORDER_CANCELLED', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('MANIFESTED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RTO');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "employeeCode" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "role" "RoleType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAcceptingLeads" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ipAddress" VARCHAR(45) NOT NULL,
    "userAgent" VARCHAR(500) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_sources" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "sourceType" "LeadSourceType" NOT NULL,
    "description" VARCHAR(500),
    "apiKeyHash" VARCHAR(255),
    "webhookSecret" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "lead_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "leadCode" VARCHAR(50) NOT NULL,
    "customerName" VARCHAR(150) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "alternatePhone" VARCHAR(20),
    "email" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "address" VARCHAR(500),
    "productInterest" VARCHAR(255),
    "customerRequirements" TEXT,
    "notes" TEXT,
    "priority" "LeadPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "sourceId" UUID,
    "sourceType" "LeadSourceType" NOT NULL DEFAULT 'MANUAL',
    "campaignId" VARCHAR(150),
    "campaignName" VARCHAR(255),
    "adSetId" VARCHAR(150),
    "adId" VARCHAR(150),
    "externalLeadId" VARCHAR(150),
    "costPerLead" DECIMAL(10,2),
    "rawPayload" JSONB,
    "createdById" UUID,
    "assignedToId" UUID,
    "assignedAt" TIMESTAMPTZ,
    "lastContactedAt" TIMESTAMPTZ,
    "convertedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_assignments" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "reassignmentReason" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_status_history" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "fromStatus" "LeadStatus" NOT NULL,
    "toStatus" "LeadStatus" NOT NULL,
    "changedById" UUID NOT NULL,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "call_logs" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "callerId" UUID NOT NULL,
    "callOutcome" "CallOutcome" NOT NULL,
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "calledAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "scheduledTime" TIMESTAMPTZ NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reminderNotes" VARCHAR(500),
    "completedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_reviews" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "claimedById" UUID,
    "reason" VARCHAR(255) NOT NULL,
    "salesNotes" TEXT,
    "reviewerNotes" TEXT,
    "decision" "PendingDecision",
    "decidedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pending_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "officerId" UUID,
    "decision" "ApprovalDecision",
    "decisionReason" VARCHAR(500),
    "officerNotes" TEXT,
    "decidedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "customerCode" VARCHAR(50) NOT NULL,
    "convertedFromId" UUID,
    "fullName" VARCHAR(150) NOT NULL,
    "phoneNumber" VARCHAR(20) NOT NULL,
    "alternatePhone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" VARCHAR(500),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "pincode" VARCHAR(10),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "categoryId" UUID NOT NULL,
    "description" TEXT,
    "mrpPrice" DECIMAL(10,2) NOT NULL,
    "sellingPrice" DECIMAL(10,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 12.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "customerId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL DEFAULT 'CASH_ON_DELIVERY',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentRef" VARCHAR(100),
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoiceNumber" VARCHAR(50) NOT NULL,
    "orderId" UUID NOT NULL,
    "cgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "sgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "igstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    "totalTax" DECIMAL(10,2) NOT NULL,
    "grandTotal" DECIMAL(10,2) NOT NULL,
    "issuedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "availableQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 20,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "type" "InventoryTxType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "notes" VARCHAR(255),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "courierPartner" VARCHAR(100) NOT NULL,
    "trackingAwb" VARCHAR(100) NOT NULL,
    "trackingUrl" VARCHAR(500),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'MANIFESTED',
    "dispatchedAt" TIMESTAMPTZ,
    "deliveredAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "oldState" JSONB,
    "newState" JSONB,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeCode_key" ON "users"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE INDEX "users_employeeCode_idx" ON "users"("employeeCode");

-- CreateIndex
CREATE INDEX "user_sessions_userId_isActive_idx" ON "user_sessions"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_isRevoked_idx" ON "refresh_tokens"("userId", "isRevoked");

-- CreateIndex
CREATE UNIQUE INDEX "lead_sources_name_key" ON "lead_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "leads_leadCode_key" ON "leads"("leadCode");

-- CreateIndex
CREATE INDEX "leads_phoneNumber_idx" ON "leads"("phoneNumber");

-- CreateIndex
CREATE INDEX "leads_status_assignedToId_idx" ON "leads"("status", "assignedToId");

-- CreateIndex
CREATE INDEX "leads_priority_idx" ON "leads"("priority");

-- CreateIndex
CREATE INDEX "leads_createdAt_idx" ON "leads"("createdAt");

-- CreateIndex
CREATE INDEX "lead_assignments_leadId_isActive_idx" ON "lead_assignments"("leadId", "isActive");

-- CreateIndex
CREATE INDEX "lead_assignments_assignedToId_idx" ON "lead_assignments"("assignedToId");

-- CreateIndex
CREATE INDEX "lead_status_history_leadId_createdAt_idx" ON "lead_status_history"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "call_logs_leadId_calledAt_idx" ON "call_logs"("leadId", "calledAt");

-- CreateIndex
CREATE INDEX "call_logs_callerId_calledAt_idx" ON "call_logs"("callerId", "calledAt");

-- CreateIndex
CREATE INDEX "follow_ups_assignedToId_scheduledTime_status_idx" ON "follow_ups"("assignedToId", "scheduledTime", "status");

-- CreateIndex
CREATE INDEX "follow_ups_leadId_idx" ON "follow_ups"("leadId");

-- CreateIndex
CREATE INDEX "pending_reviews_leadId_idx" ON "pending_reviews"("leadId");

-- CreateIndex
CREATE INDEX "pending_reviews_claimedById_idx" ON "pending_reviews"("claimedById");

-- CreateIndex
CREATE INDEX "approval_requests_leadId_idx" ON "approval_requests"("leadId");

-- CreateIndex
CREATE INDEX "approval_requests_officerId_idx" ON "approval_requests"("officerId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customerCode_key" ON "customers"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "customers_convertedFromId_key" ON "customers"("convertedFromId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phoneNumber_key" ON "customers"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_productId_key" ON "inventory"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_orderId_key" ON "shipments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_trackingAwb_key" ON "shipments"("trackingAwb");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "lead_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_assignments" ADD CONSTRAINT "lead_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_status_history" ADD CONSTRAINT "lead_status_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_logs" ADD CONSTRAINT "call_logs_callerId_fkey" FOREIGN KEY ("callerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_reviews" ADD CONSTRAINT "pending_reviews_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_reviews" ADD CONSTRAINT "pending_reviews_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_convertedFromId_fkey" FOREIGN KEY ("convertedFromId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
