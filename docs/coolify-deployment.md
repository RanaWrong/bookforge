# Coolify & Docker Production Deployment Guide

## Services in `docker-compose.yml`
1. `db`: PostgreSQL 17 Alpine with UTF-8 initialization and `pg_isready` health check.
2. `migrate`: One-shot Prisma migration container (`target: migrate`) that runs `npm run db:deploy` once `db` is healthy.
3. `app`: Next.js standalone runner on port `3000` with `NODE_ENV=production` (which automatically disables `BOOKFORGE_DEV_IDENTITY`).

## Health Endpoint
Configure Coolify health checks against `GET /api/health` (returns HTTP 200 with JSON database status).
