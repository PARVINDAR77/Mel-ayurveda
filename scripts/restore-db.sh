#!/usr/bin/env bash
# ==============================================================================
# MELAYURVEDA CRM - AUTOMATED DATABASE RESTORATION SCRIPT
# Restores gzipped PostgreSQL dump with checksum verification & safety guards
# ==============================================================================

set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <path_to_backup.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_USER="${POSTGRES_USER:-melayurveda_user}"
POSTGRES_DB="${POSTGRES_DB:-melayurveda_crm}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "[ERROR] Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

# Verify SHA-256 Checksum if file exists
if [ -f "${BACKUP_FILE}.sha256" ]; then
  echo "[INFO] Verifying SHA-256 checksum..."
  sha256sum -c "${BACKUP_FILE}.sha256"
  echo "[SUCCESS] Checksum verified."
else
  echo "[WARN] No checksum file found. Proceeding with caution..."
fi

echo "[WARNING] You are about to restore into database: ${POSTGRES_DB} on ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "[WARNING] Existing data will be overwritten!"

export PGPASSWORD="${POSTGRES_PASSWORD:-melayurveda_dev_pass_change_in_prod}"

# Terminate active client connections to target database
echo "[INFO] Terminating active client connections to ${POSTGRES_DB}..."
psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" || true

# Execute restoration
echo "[INFO] Decompressing and applying SQL dump..."
gunzip -c "${BACKUP_FILE}" | psql \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --single-transaction \
  --echo-errors

# Run sanity check
echo "[INFO] Verifying database integrity..."
RECORD_COUNT=$(psql -h "${POSTGRES_HOST}" -p "${POSTGRES_PORT}" -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -t -c "SELECT COUNT(*) FROM leads;")
echo "[SUCCESS] Restoration complete. Total verified leads: $(echo "${RECORD_COUNT}" | tr -d ' ')"
