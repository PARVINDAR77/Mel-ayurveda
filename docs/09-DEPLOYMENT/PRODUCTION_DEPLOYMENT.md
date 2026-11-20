# Production Deployment Architecture

## 1. Cloud Infrastructure
- **Compute**: Managed Kubernetes (EKS / GKE) or Container Services (AWS ECS / Google Cloud Run).
- **Database**: Managed PostgreSQL (AWS RDS / GCP Cloud SQL) with Multi-AZ automated failover and daily snapshots.
- **Edge**: Cloudflare CDN & WAF providing DDoS shielding, SSL termination, and rate-limiting.

## 2. Zero-Downtime Rolling Updates
- Kubernetes rolling deployment strategy (`maxSurge: 1`, `maxUnavailable: 0`).
- Health readiness probe (`/api/v1/health/ready`) ensures new pods are fully warmed before receiving traffic.
