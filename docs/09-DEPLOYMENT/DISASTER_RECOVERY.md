# Disaster Recovery (DR) Plan

## 1. Key Recovery Metrics
- **Recovery Point Objective (RPO)**: < 15 minutes (via continuous WAL replication).
- **Recovery Time Objective (RTO)**: < 2 hours (automated container spin-up and DNS failover).

## 2. Failover Protocol
1. Primary cloud region failure detected by synthetic monitors.
2. Promote read-replica PostgreSQL instance in secondary region to primary.
3. Update database connection string in Kubernetes secrets.
4. Route Cloudflare DNS to secondary cluster ingress.
5. Post-recovery verification of data consistency.
