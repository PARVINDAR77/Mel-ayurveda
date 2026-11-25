-- CreateTable
CREATE TABLE IF NOT EXISTS "recycle_bin_items" (
    "id" UUID NOT NULL,
    "entityType" VARCHAR(50) NOT NULL,
    "entityId" UUID NOT NULL,
    "itemIdentifier" VARCHAR(100) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "category" VARCHAR(100),
    "dataSnapshot" JSONB NOT NULL,
    "deleteReason" VARCHAR(500),
    "deletedById" UUID NOT NULL,
    "deletedByCode" VARCHAR(50) NOT NULL,
    "deletedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "isRestored" BOOLEAN NOT NULL DEFAULT false,
    "restoredAt" TIMESTAMPTZ,
    "restoredById" UUID,
    "restoredByCode" VARCHAR(50),

    CONSTRAINT "recycle_bin_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recycle_bin_items_entityType_isRestored_idx" ON "recycle_bin_items"("entityType", "isRestored");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recycle_bin_items_expiresAt_isRestored_idx" ON "recycle_bin_items"("expiresAt", "isRestored");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "recycle_bin_items_itemIdentifier_idx" ON "recycle_bin_items"("itemIdentifier");
