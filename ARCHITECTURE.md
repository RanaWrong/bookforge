# Architecture

## Phase 1 deployment shape
Browser → Next.js application → (future) application services → PostgreSQL
                                         ↘ private file storage
                                         ↘ export worker / Chromium

Start as a modular monolith. Do not split into microservices until workload requires it.

## Modules
- `app`: routes and page composition
- `components`: shared UI
- `features/books`: books and chapter workflows
- `features/editor`: canonical content model and editor adapters
- `features/import`: DOCX, Markdown, ZIP parsers and validation reports
- `features/design`: versioned design profiles
- `features/publishing`: pagination and PDF export pipeline
- `lib/i18n`: Bangla/English message dictionaries
- `lib/config`: environment validation
- `server`: database and server-only services

## Canonical content model
Store document structure as validated JSON blocks, with Markdown import/export adapters. Keep `content` separate from `designProfile`. Do not treat DOCX as the database format.

## Data boundaries
- PostgreSQL is private; only the application network can reach it.
- Book assets are private by default and served through authorized routes.
- Exports run with time, memory, page-count and file-size limits.
- Every book/chapter query must be scoped to the authorized workspace.
- Import ZIP files must reject path traversal and unexpected executable content.

## Future database entities
`users`, `workspaces`, `workspace_members`, `books`, `chapters`, `documents`, `design_profiles`, `assets`, `document_versions`, `import_jobs`, `export_jobs`.

## Phase 1
No database is connected yet. Add PostgreSQL + Prisma in the next implementation slice after the starter runs locally.
