# Performance & Load Testing Specification

## 1. Benchmarks & Target SLAs
- Concurrent Tele-callers: 200 simultaneous users.
- Read Endpoints (`GET /leads`, `GET /calling/logs`): p95 < 150ms.
- Write Endpoints (`POST /calling/logs`, `POST /orders/confirm`): p95 < 250ms.
- Database Connection Pool: Max 20 connections per backend replica.

## 2. Load Testing Scenarios (k6 / Artillery)
- Simulate 50 leads/minute webhook ingestion concurrent with 100 salespeople logging call outcomes. Assert zero database deadlock errors and zero memory leaks.
