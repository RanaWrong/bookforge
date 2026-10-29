# BookForge — Implementation Plan

- [x] **Phase 1 — Repository & Infrastructure Setup**: Next.js 15, TypeScript strict mode, Tailwind CSS v4, Dockerfile, Docker Compose, Prisma schema & SQL migration.
- [x] **Phase 2 — Core Domain & Manuscript CRUD**: Workspace-scoped Books, Chapters, and transactional chapter reordering.
- [x] **Phase 3 — Dual-mode Editor**: Canonical block model, bidirectional Markdown conversion without silent loss, conflict-aware autosave, and revision history.
- [x] **Phase 4 — Import Pipeline**: Markdown, DOCX (with warnings), and ZIP import with path-traversal and zip-bomb guards.
- [x] **Phase 5 — Design System & Book Styles**: Validated Design Profiles including 215 × 275 mm Master Book mirror-margin preset.
- [x] **Phase 6 — Print Preview & PDF**: Paged CSS mirror margins (`@page :left` / `@page :right`), running headers/footers, chapter & full-book export.
- [x] **Phase 7 — Authentication & Revision History**: Server-side workspace ownership enforcement, production block on `BOOKFORGE_DEV_IDENTITY`, and non-destructive `restoreRevisionAsNew`.
- [x] **Phase 8 — Media Library & Hardening**: MIME whitelist, SVG script sanitizer, SHA-256 private storage keys, and security headers.
- [x] **Phase 9 — Production Operations**: `/api/health` readiness endpoint, `scripts/check-db.ts`, and Coolify deployment documentation.
- [x] **Phase 10 — Release Readiness**: Full automated test suite in `tests/*.test.ts`.
- [x] **Phase 11 — Persistence Convergence**: Unified Prisma schema (workspace baseline `20261022000000_baseline`) merging 10-table workspace model + `sessions` + legacy `content`/`revision` columns; single source of truth for migrations.
- [x] **Phase 12 — Real Auth & API Wiring**: Prisma-backed `PrismaAuthService` (`/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`), HttpOnly `bf_session` cookies, scrypt + SHA-256, rate limiting, middleware request IDs.
- [x] **Phase 13 — Real PDF & Media Storage**: Headless Chromium PDF via `puppeteer-core` (`POST /api/books/[bookId]/export { format: "pdf" }` → `application/pdf`, timeout + size guard), filesystem-backed media (`POST /api/media` + `GET /api/media/[id]` with ownership check, `MEDIA_DIR` volume).
- [x] **Phase 14 — CI, Hardening & Observability**: GitHub Actions CI (lint → typecheck → generate → validate → deploy → test → build on `postgres:17-alpine`), CSP/HSTS/Permissions-Policy headers, request-ID middleware.
