# ARCHIVED — superseded by 20261022000000_baseline

This migration (`User`/`Book`/`Chapter` with `ownerId`, `content JSONB`, `sourceMarkdown`,
`revision`) conflicts with the workspace model adopted in
`20261014000000_init`. Its SQL has been superseded by the single baseline
`20261022000000_baseline/migration.sql`, which merges:

- the workspace model (10 tables: users, sessions, workspaces, workspace_members,
  design_profiles, books, parts, chapters, document_history, assets, import_logs,
  export_jobs) from `20261014000000_init`, plus
- the `sessions` table required by `src/server/auth.ts` (bf_session / scrypt /
  SHA-256), plus
- the `content` / `contentSchemaVersion` / `sourceMarkdown` / `revision` columns
  required by `src/modules/books/service.ts:libraryForOwner`.

Fresh databases must use `20261022000000_baseline`. Older checkouts should run

  npm run db:generate

and, on an empty database,

  npx prisma migrate reset

Do NOT run `prisma migrate deploy` against the two archived 2026-10-13/14
migrations without first resetting.
