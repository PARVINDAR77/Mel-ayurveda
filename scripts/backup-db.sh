#!/usr/bin/env bash
# ==============================================================================
# MELAYURVEDA CRM - AUTOMATED DATABASE BACKUP SCRIPT
# Creates timestamped, gzipped, checksummed PostgreSQL dumps
# ==============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/var/backups/melayurveda_crm}"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
BACKUP_FILENAME="melayurveda_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

POSTGRES_HOST="${POSTGRES_HOST:-127.0.0.1}"
POSTGRES_PORT="${POSTGRES_PORT:-5433}"
POSTGRES_USER="${POSTGRES_USER:-melayurveda_user}"
POSTGRES_DB="${POSTGRES_DB:-melayurveda_crm}"

# Ensure backup destination exists
mkdir -p "${BACKUP_DIR}"

echo "[INFO] [$(date)] Starting Melayurveda CRM database backup..."
echo "[INFO] Database: ${POSTGRES_DB} on ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "[INFO] Destination: ${BACKUP_PATH}"

# Execute pg_dump with compression
PGPASSWORD="${POSTGRES_PASSWORD:-melayurveda_dev_pass_change_in_prod}" pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --format=plain \
  --no-owner \
  --no-privileges \
  | gzip -9 > "${BACKUP_PATH}"

# Generate SHA-256 checksum for tamper-proof verification
sha256sum "${BACKUP_PATH}" > "${BACKUP_PATH}.sha256"

BACKUP_SIZE="$(du -h "${BACKUP_PATH}" | cut -f1)"
echo "[SUCCESS] [$(date)] Backup completed successfully. Size: ${BACKUP_SIZE}"
echo "[INFO] Checksum: $(cat "${BACKUP_PATH}.sha256")"

# Purge backups older than retention threshold
echo "[INFO] Purging backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "melayurveda_backup_*.sql.gz*" -mtime +"${RETENTION_DAYS}" -delete

echo "[INFO] Backup process finished."
