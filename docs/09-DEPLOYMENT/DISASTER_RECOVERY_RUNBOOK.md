# Enterprise Disaster Recovery & Operational Runbook

**Client**: MELAYURVEDA INDIA PVT. LTD.  
**System**: Melayurveda Enterprise Ayurvedic CRM System  
**Document Version**: 1.0 (Production Release)  
**Classification**: Confirmed Operational Protocol  

---

## 1. Executive Summary & Recovery Objectives

This document establishes the operational procedures for business continuity, database backup, disaster recovery (DR), and incident management for the Melayurveda CRM production environment.

### Target Recovery Metrics:
- **Recovery Point Objective (RPO)**: **< 15 minutes** (maximum data loss window via continuous PostgreSQL Write-Ahead Log [WAL] archiving to encrypted off-site cloud storage).
- **Recovery Time Objective (RTO)**: **< 2 hours** (maximum downtime from incident declaration to verified operational restoration in secondary region).
- **Availability Target**: **99.9% uptime** across all 5 operational panels.

---

## 2. Backup Topology & Architecture

```
+--------------------------------------------------------------------+
|                         PRIMARY CLOUD REGION                       |
|                                                                    |
|  +--------------------+   Continuous WAL   +--------------------+  |
|  |  PostgreSQL 16     | -----------------> |  Encrypted S3      |  |
|  |  Primary Instance  |   Archiving        |  Backup Vault      |  |
|  +--------------------+                    |  (AES-256 + WORM)  |  |
|            |                               +--------------------+  |
|            | Async Streaming Replication             |             |
|            v                                         |             |
+------------|-----------------------------------------|-------------+
             |                                         | Cross-Region
             v                                         v Replication
+--------------------------------------------------------------------+
|                        SECONDARY CLOUD REGION                      |
|                                                                    |
|  +--------------------+                    +--------------------+  |
|  |  PostgreSQL 16     |                    |  Secondary Backup  |  |
|  |  Hot Standby       |                    |  Replication Vault |  |
|  +--------------------+                    +--------------------+  |
+--------------------------------------------------------------------+
```

### Automated Backup Schedule:
1. **Full Physical Database Dumps**: Executed daily at `02:00 AM IST` via automated cron task invoking `scripts/backup-db.sh`.
2. **Point-In-Time Recovery (PITR)**: Continuous WAL streaming to encrypted S3 with Object Lock (35-day retention).
3. **Cryptographic Hardening**: Backups encrypted at rest with AES-256 (KMS-managed keys) and immutable Write-Once-Read-Many (WORM) storage.

---

## 3. Disaster Recovery Failover Procedure (Step-by-Step)

In the event of total primary region failure or severe corruption:

### Step 1: Incident Declaration & Verification (< 10 minutes)
1. Synthetic monitoring alerts trigger on consecutive 5xx errors from primary health endpoints (`/api/v1/health` and `/healthz`).
2. Incident Commander (Lead DevOps Engineer) verifies primary region unavailability.
3. Formally declare **SEV-1 Disaster Recovery Incident**.

### Step 2: Secondary Database Promotion (< 15 minutes)
1. Verify WAL replay status on the secondary region hot standby:
   ```bash
   pg_controldata /var/lib/postgresql/data
   ```
2. Promote the secondary PostgreSQL standby instance to standalone read-write primary:
   ```bash
   pg_ctl promote -D /var/lib/postgresql/data
   ```
3. Run quick health verification:
   ```sql
   SELECT pg_is_in_recovery(); -- Must return FALSE
   SELECT COUNT(*) FROM leads;
   ```

### Step 3: Application Cluster Activation (< 20 minutes)
1. Update database connection secret in secondary Kubernetes / Docker cluster:
   ```bash
   DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@secondary-postgres:5432/${POSTGRES_DB}?schema=public&connection_limit=20&pool_timeout=30"
   ```
2. Scale secondary application replicas from 0 to full capacity:
   ```bash
   kubectl scale deployment melayurveda-backend --replicas=4 -n production
   kubectl scale deployment melayurveda-frontend --replicas=4 -n production
   ```
3. Verify backend readiness via probe:
   ```bash
   curl -I https://dr-api.melayurveda.com/api/v1/health
   ```

### Step 4: Edge DNS Traffic Rerouting (< 15 minutes)
1. Access Cloudflare DNS dashboard or execute automated DNS failover script.
2. Update CNAME record `crm.melayurveda.com` to point to secondary cluster ingress.
3. Purge Cloudflare edge cache for immediate propagation.

### Step 5: Post-Failover Integrity Verification (< 30 minutes)
Execute the automated post-recovery audit suite:
```bash
npm run test:e2e:system
```
Verify the following operational checks:
- Super Admin login succeeds.
- Tele-sales personnel can query assigned leads with 100% Lead Source Privacy intact.
- Pending review queue and approval engine claim locks operate without collisions.
- Warehouse inventory transaction balances match current stock levels.
- Immutable audit log table records the disaster recovery event.

---

## 4. Database Restoration Drill Protocol

Restoration drills must be conducted on the **1st Sunday of every month** on an isolated staging database.

### Restoration Procedure:
```bash
# 1. Download target timestamped snapshot
aws s3 cp s3://melayurveda-crm-backups/melayurveda_backup_20261120_020000.sql.gz /tmp/

# 2. Verify SHA-256 integrity checksum
sha256sum -c /tmp/melayurveda_backup_20261120_020000.sql.gz.sha256

# 3. Execute restoration script against isolated staging instance
TARGET_DB=melayurveda_crm_staging ./scripts/restore-db.sh /tmp/melayurveda_backup_20261120_020000.sql.gz

# 4. Execute automated integration suite against restored staging DB
npm run test:e2e:system
```

---

## 5. Security & Secret Rotation Protocol

All production secrets must undergo mandatory quarterly rotation:
1. **JWT Access & Refresh Secrets**: Rotate using dual-key grace periods (new secret signs new tokens; existing tokens accepted until expiration).
2. **PostgreSQL Master Passwords**: Updated during scheduled maintenance windows with zero active connections.
3. **Argon2id Hash Upgrades**: Password hashes automatically rehash upon user login if algorithm parameters are upgraded.
