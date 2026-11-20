# Database Migration Strategy

## 1. Migration Governance
- All database modifications must be executed through reviewed Prisma migrations:
  ```bash
  npx prisma migrate dev --name <descriptive_change_name>
  ```
- Direct manual DDL changes on PostgreSQL are strictly forbidden in all environments.

## 2. Strict Development Safety Rules
1. **Never use `prisma db push`** as a shortcut in staging or production.
2. **Never execute `prisma migrate reset`** in environments with persistent business data.
3. **Never apply `--accept-data-loss`**.
4. Backward-compatible changes only (add nullable column first, backfill data, then apply NOT NULL constraint in separate migration).
5. Always perform a pg_dump snapshot prior to applying new migrations in production.
