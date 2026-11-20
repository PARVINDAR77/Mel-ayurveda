# Backup & Recovery Procedures

## 1. Backup Schedule
- **Full Database Dumps**: Daily at 02:00 AM IST via automated `pg_dump`.
- **Write-Ahead Log (WAL) Archiving**: Continuous point-in-time recovery (PITR) up to 35 days.
- **Storage**: Backups encrypted with AES-256 and replicated to an off-site S3 bucket with Object Lock (WORM compliance).

## 2. Restoration Drill
- Monthly automated restoration verification on an isolated staging database to guarantee backup integrity.
