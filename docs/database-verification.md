# Database & Migration Verification Guide

## Schema Overview
`prisma/schema.prisma` defines 10 relational models enforcing strict `workspace_id` ownership boundaries:
- `User`, `Workspace`, `WorkspaceMember`
- `DesignProfile`, `Book`, `Part`, `Chapter`
- `DocumentRevision` (`document_history`), `MediaAsset` (`assets`), `ImportLog`, `ExportJob`

## Running Migrations
1. Start local PostgreSQL 17:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
   ```
2. Apply migrations:
   ```bash
   npm run db:deploy
   ```
3. Run health check:
   ```bash
   npm run db:check
   ```
