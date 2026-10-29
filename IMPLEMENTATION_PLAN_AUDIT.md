# BookForge — Implementation Plan: Audit & Next Steps

**Date:** 22 October 2026  
**Repository:** `RanaWrong/bookforge` · Next.js 15 · TypeScript strict · Prisma 7 · PostgreSQL 17  
**Languages:** Bangla + English  
**Author:** Codebase audit (read-only analysis of `prisma/`, `src/`, `tests/`, `docker-compose.yml`, `Dockerfile`, `docs/`)  
**Audience:** Executive summary + Technical appendix (stakeholder + engineering)

---

## 1. Executive Summary

BookForge is a bilingual (বাংলা + English) book writing and publishing workspace — manuscript structure, dual-mode editing, secure import, design profiles, print preview/PDF, revision history and workspace-scoped access. Documentation marks v1.0 / Phases 1–10 as complete.

**Audit verdict:** The core product logic is substantially implemented and well-tested at the unit level, but the codebase currently carries **two parallel persistence stacks** that must be consolidated before production. The in-memory domain (`src/server/db.ts` + `src/features/*`) powers the JSON API routes, while the Prisma domain (`src/lib/db/client.ts` + `src/modules/books/*` + `src/app/dashboard/*`) powers the dashboard. The Prisma schema on disk has drifted from the checked-in migrations. PDF export renders paged HTML/CSS correctly but does not yet run headless Chromium, and media upload issues storage keys without writing bytes to disk. None of these block a demo, but all block a confident go-live.

**Recommended next sequence (4–6 weeks, one engineer + part-time review):**

1. **Phase 11 — Persistence Convergence** (P0, ~1.5 weeks): Make Prisma the single source of truth; retire the in-memory repository from request paths.
2. **Phase 12 — Auth & API Wiring** (P0, ~1 week): Wire `AuthService` (scrypt + HttpOnly session) to Prisma `User`/`Session`, add login/register routes, and put every mutation behind server-derived identity.
3. **Phase 13 — Real PDF & Media Storage** (P0, ~1 week): Add Chromium rendering (Puppeteer/Chromium in Docker) and S3-compatible or volume-backed media storage with cleanup.
4. **Phase 14 — CI, Hardening & Observability** (P1, ~1 week): GitHub Actions (lint → typecheck → prisma validate → test → build), security-header middleware, rate-limit & CSRF on mutating routes, structured logs without manuscript leakage.
5. **Phase 15 — Backup, Restore & Coolify Cutover** (P1, ~0.5 week): Documented `pg_dump`/`pg_restore` with retention, health-check contract, migration runbook and rollback checklist.

After Phase 13 the product can accept real users on a staging Coolify deployment; after Phase 14–15 it is defensible for production.

---

## 2. How This Audit Was Conducted

Every file listed under `Grep` was sampled. The following were read in full: `package.json`, `tsconfig.json`, `next.config.ts`, `prisma.config.ts`, `priva/schema.prisma`, all three `prisma/migrations/*.sql`, `src/server/auth.ts`, `src/server/db.ts`, `src/lib/db/client.ts`, `src/lib/auth/development.ts`, `src/lib/config/env.ts`, `src/lib/errors.ts`, `src/lib/logger.ts`, `src/modules/books/*`, `src/features/books/*`, `src/features/editor/*`, `src/features/import/*`, `src/features/design/*`, `src/features/publishing/*`, `src/features/media/*`, `src/app/**/*`, `src/components/workspace.tsx`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `docs/*.md`, and `tests/*.test.ts`. No code was executed and no secrets were accessed; conclusions are based on static analysis.

---

## 3. Current Architecture (As Found)

```
                    ┌─────────────────────┐
                    │   Next.js 15 App    │
                    │  (standalone)       │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     / (page.tsx)   /dashboard    /api/books, /api/import,
     Client mock    Server actions /api/books/[id]/export, /api/health
     (1800+ lines,  libraryForOwner  ▲
      local state)  (Prisma)        │  BookService / EditorAutosave /
                                    │  ImportService / PdfExportService
                                    │  MediaService  (in-memory repo)
                                    └──────────┬──────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                     BookForgeRepository   PrismaClient    File system / tmp
                     (Map-backed, seed)  (adapter-pg)    (ZIP staging, rmSync)
```

**Two domains, one product:**

| Concern | In-memory domain (`src/server/*` + `src/features/*`) | Prisma domain (`src/lib/db/*` + `src/modules/books/*`) |
|---|---|---|
| User & session | `UserRecord`, `SessionRecord` in `Map`, `AuthService` with scrypt + `bf_session` cookie | `User` table via `PrismaClient`, `requireIdentity()` dev shim, `libraryForOwner(ownerId)` |
| Book / chapter | `BookRecord`/`ChapterRecord` with `userId`, `BookService`, `EditorAutosaveService` | `Book`/`Chapter` with `ownerId`, `content JSONB`, `revision`, `libraryForOwner` transactions |
| Ownership check | `assertOwnership(session, resourceUserId)` | `where: { ownerId }` + `FOR UPDATE` row locks |
| Design settings | `BookDesignSettings` (`BookDesignSettings` table) | Not persisted via Prisma path (dashboard has no design UI) |
| Import / export | `ManuscriptImportService`, `PdfExportService` (HTML string, no Chromium) | No import/export coverage |
| Tests | `books-and-chapters.test.ts`, `editor-and-markdown.test.ts`, `import-security.test.ts`, `design-and-export.test.ts` (in-memory) | `library.test.ts`, `ownership.test.ts`, `library.integration.test.ts` (Prisma) |

Both stacks enforce ownership, both have tests, but they do not share storage. A book created via `/api/books` is invisible to `/dashboard` and vice versa.

---

## 4. Phase-by-Phase Verification (Phases 1–10)

| Phase | Claim in docs | Verdict | Evidence |
|---|---|---|---|
| **1 — Repo & infra** | Next.js 15, TS strict, Tailwind v4, Dockerfile, Compose, Prisma + migration | **Verified** | `package.json` (next `^15.5.0`, `strict: true`), `Dockerfile` (multi-stage deps→migrate→builder→runner, non-root `nextjs`, `dumb-init`, fonts), `docker-compose.yml` (db healthcheck, migrate one-shot, app 1536M limit), `next.config.ts` (`poweredByHeader: false`, security headers, `output: standalone`) |
| **2 — Manuscript CRUD** | Books/chapters, `workspace_id` scoping, transactional reorder | **Partial — dual stack** | `src/features/books/service.ts` + `src/server/db.ts:reorderChapters` correctly validate and compact `1..N`; `src/modules/books/service.ts:libraryForOwner.mutate` does `SELECT … FOR UPDATE` + parked `setOrder()` to avoid `UNIQUE(bookId,position)` collisions. Gap: two independent implementations, no shared migration. |
| **3 — Dual-mode editor** | Canonical block model `schemaVersion: 1`, bidirectional Markdown, autosave with conflict detection, revision history | **Verified (logic) / Partial (wiring)** | `src/features/editor/schema.ts` + `markdown-converter.ts` (never silently drops; `unsupported_raw` + warnings), `DualModeEditor.tsx` + `chapter-editor.tsx` + `autosave.ts` (`Autosave` class: dirty/inFlight/error states, `expectedVersionNumber` conflict, `schedule` debounce), `tests/editor-and-markdown.test.ts` asserts round-trip and conflict. Gap: `src/app/page.tsx` re-implements `renderMd()` inline rather than reusing `markdown-converter.ts`; `workspace.tsx` plain-text editor does not exercise the rich `EditorDocument` path. |
| **4 — Import pipeline** | Markdown/DOCX/ZIP with path-traversal & zip-bomb guards | **Verified (logic)** | `src/features/import/import-service.ts` (executable/MIME blocklist, `MAX_FILE_SIZE_BYTES 15 MB`, `MAX_COMPRESSION_RATIO 25:1`, `MAX_ZIP_ENTRIES 60`, `withTemporaryImportStagingDir` + `finally rmSync`), quality audit (`RAW_LATEX_DETECTED`, `FOREIGN_SCRIPT_INTRUSION`, `CHATBOT_RESIDUE_DETECTED`), `tests/import-security.test.ts` covers traversal, bombs, reordering/rename/exclude. Gap: ZIP parsing is descriptor-driven; real `yauzl`/`unzipper` wiring not shown in route (`src/app/api/import/route.ts` parses JSON `content` only). |
| **5 — Design system** | Validated profiles incl. 215×275 mm Master Book mirror margins | **Verified** | `src/features/design/schema.ts` (`validateBookDesignSettings` with range checks 100–420 mm, hex color, 9–16 pt), `presets.ts` (`MASTER_BOOK_DESIGN_PRESET` exactly `215×275`, `18/20/22/16/5`, `Noto Serif Bengali` + `Noto Sans Bengali` + `Inter`, `#123B6D`/`#F26B21`), `DESIGN_SYSTEM.md` matches. |
| **6 — Print preview & PDF** | `@page :left`/`:right` mirror margins, running headers/footers, chapter & book export | **Partial** | `src/features/publishing/print-renderer.ts` (`buildPrintStylesheet` emits correct `@page :left/:right`, `renderPrintHtmlDocument` with TOC, headers/footers, watermark, `sanitizeRenderResourceUrl` SSRF block for `file:`, `169.254.169.254`, `10/192.168/172.16-31`), `pdf-exporter.ts` (limits `MAX_PAGE_COUNT 2000`, `MAX_OUTPUT_SIZE_BYTES 50 MB`, concurrency 2, `safeFilename`). Gap: no Chromium invocation — export route returns `{ html, estimatedPages }` stored as `ExportJob.htmlOutput`, not a PDF binary; `Dockerfile` already installs `chromium` + `font-noto-bengali` but no `puppeteer-core` dependency. |
| **7 — Auth & revisions** | Workspace ownership, `BOOKFORGE_DEV_IDENTITY` block in prod, `restoreRevisionAsNew` | **Partial** | `src/server/auth.ts` (`hashPassword` scrypt 64-byte + `timingSafeEqual`, `hashSessionToken` SHA-256, `HttpOnly; SameSite=Lax; Secure` in prod, `AuthRateLimiter 5/60s`, `authenticateRequest` never trusts `userId` header), `src/features/editor/autosave.ts:restoreChapterVersion` non-destructive, `src/lib/auth/development.ts:assertDevelopmentIdentity` throws `IDENTITY_DISABLED` unless `NODE_ENV=development && BOOKFORGE_DEV_IDENTITY=true`, `tests/actions.test.ts` + `library.test.ts` prove block. Gap: no `/api/auth/*` routes wired; `requireIdentity()` dev shim is the only Prisma auth path. |
| **8 — Media & hardening** | MIME whitelist, SVG script sanitizer, SHA-256 private keys, security headers | **Partial** | `src/features/media/media-service.ts` (`image/png|jpeg|webp|svg+xml`, `10 MB`, regex `/<script|onload=|onerror=|javascript:/i` on SVG, `storageKey private/${userId}/${sha16}-${cleanName}`), `next.config.ts` headers (`nosniff`, `DENY`, `strict-origin-when-cross-origin`), `print-renderer.ts` SSRF guard. Gap: `createMediaAsset` writes a DB row only; no bytes written to volume/S3; no CSRF token on mutating server actions; `AuthRateLimiter` not attached to routes. |
| **9 — Production ops** | `/api/health`, `scripts/check-db.ts`, Coolify docs | **Verified (skeleton)** | `src/app/api/health/route.ts` (`repo.ping()` + memory/disk, `200` vs `503`), `scripts/check-db.ts` (`loadAppConfig` + `repo.ping`), `docs/coolify-deployment.md` + `docs/database-verification.md` + `docs/management-verification.md` (correct service map, `migrate` then `app`). Gap: no backup/restore script, no `pg_dump` cron example, no rollback runbook. |
| **10 — Release readiness** | Full automated test suite | **Verified (unit), Partial (integration/CI)** | 8 test files, `npm test` (`node --import tsx --test tests/*.test.ts`), cross-workspace denial, idempotency (`revision+1` + `JSON.stringify(current)===JSON.stringify(command.document)`), `movedIds` boundaries. Gap: Postgres integration tests skip without `TEST_DATABASE_URL`; no GitHub Actions workflow; `prisma/schema.prisma` ≠ `prisma/migrations/` (see §5.1). |

---

## 5. Critical Gaps & Risks (Ranked)

### P0 — Must fix before production

**5.1 Prisma schema / migration drift (highest risk)**  
`prisma/schema.prisma` defines a compact model (`User`, `Session`, `Book` with `userId`, `BookDesignSettings`, `Chapter` with `canonicalJson`, `ImportJob`, `ExportJob`) while `prisma/migrations/20261014000000_init/migration.sql` creates a 10-table workspace model (`workspaces`, `workspace_members`, `design_profiles`, `books` with `workspace_id`, `parts`, `chapters` with `canonical_json`, `document_history`, `assets`, `import_logs`, `export_jobs`) and `20261013000000_initial` / `20261014000000_chapter_revision` create the legacy `Book`/`Chapter(ownerId, revision)` shape. `prisma validate` will not match the deployed history. Any `prisma migrate deploy` on a fresh database will diverge from what the app queries.

*Fix:* Choose one model as canonical (recommendation: the `workspace`-based `20261014000000_init` model — it is the only one that supports `Parts`, `DesignProfile` versioning, and `document_history` as specified in Phase 10). Regenerate `schema.prisma` from it, squash migrations into a single `init` baseline, and re-generate `src/generated/prisma/client`.

**5.2 Persistence duality**  
Two complete book/chapter stacks with different identity keys (`userId` vs `ownerId`, `workspace_id` naming) and different content columns (`markdown`+`canonicalJson` vs `content JSONB`+`sourceMarkdown`). Mutations on one stack are invisible to the other.

*Fix:* Phase 11 convergence (below). Shortest path: promote `src/modules/books/service.ts:libraryForOwner` (Prisma + row-lock transactions) as the sole writer; adapt `src/features/*` services to call it instead of `BookForgeRepository`.

**5.3 Auth not end-to-end**  
`AuthService.register/login/logout/authenticateRequest` is implemented and correct (scrypt, `timingSafeEqual`, SHA-256 token hash, 7-day TTL, `HttpOnly` cookie), but there are no route handlers exposing it and no middleware attaching `SessionContext` to dashboard or API routes. `workspace.tsx` and `page.tsx` assume a shared dev identity.

*Fix:* Add `src/app/api/auth/{register,login,logout}/route.ts`, a `middleware.ts` that populates `x-user-id` from the session cookie, and replace `requireIdentity()` calls with `authenticateRequest()` on every mutating handler.

**5.4 PDF is HTML, not PDF**  
`PdfExportService.generateExport` enforces page/size/concurrency limits and calls `renderPrintHtmlDocument`, but the output is stored as `htmlOutput` text and returned as JSON. No `puppeteer-core`/`chromium --headless --print-to-pdf` step exists, so Coolify has nothing to serve as `application/pdf`.

*Fix:* Add `puppeteer-core` (reuse `CHROMIUM_PATH=/usr/bin/chromium-browser` already in `Dockerfile`), render `rendered.html` to PDF with `page.pdf({ printBackground: true, preferCSSPageSize: true })`, enforce `TIMEOUT_MS 30000` with `AbortController`, write bytes to a private volume/S3 key, and return a signed URL.

**5.5 Media bytes not stored**  
`MediaService.uploadValidatedAsset` validates and derives `sha256` + `storageKey` but only inserts a row. Uploaded buffers are dropped.

*Fix:* Write `input.bytes` to `process.env.MEDIA_DIR/private/<sha16>-<name>` or S3 (`@aws-sdk/client-s3`) and record the key. Add a `GET /api/media/[id]` handler that checks ownership before streaming.

### P1 — Should fix before scale

* **Routing sprawl:** Three workspace UIs (`page.tsx` client mock, `books/[bookId]/page.tsx`, `components/workspace.tsx`) duplicate i18n keys and markdown rendering. Pick `workspace.tsx` (plain-text, already wired to `libraryForOwner`) as the interactive shell and fold the Master Book preview tabs into it; retire the `page.tsx` mock logic or gate it behind `NODE_ENV=development`.
* **Security middleware gaps:** `X-Content-Type-Options: nosniff` / `X-Frame-Options: DENY` are set globally, but `Content-Security-Policy`, `Strict-Transport-Security` (prod), CSRF double-submit, and per-IP rate limiting on `POST /api/books` / `/api/import` are missing.
* **Observability:** `logger` emits JSON lines but no request ID propagation, no audit log for `deleteBook`/`restoreRevision`, no metric export for `metrics.activeExportJobs`.
* **CI:** No `.github/workflows/ci.yml`. The repo cannot currently prove `lint && typecheck && prisma validate && test && build` on every PR.
* **i18n drift:** `src/lib/i18n/messages.ts` and `src/lib/i18n/workspace.ts` overlap (both contain `bn`/`en` dashboard strings). Consolidate on one dictionary.
* **ZIP import route:** `src/app/api/import/route.ts` accepts JSON `content` for convenience; the file-upload (`multipart/form-data`) path that a real browser form needs is not implemented.

### P2 — Nice to have

Full-text search on chapters, collaborative presence, per-chapter comment threads, DOCX style mapping beyond warning emission, Paged.js polyfill for browsers without `@page` support, TOC page-number accuracy via Chromium's `pageNumber` CSS counters.

---

## 6. Recommended Consolidated Architecture

Keep the **Prisma workspace model as the system of record** and treat the in-memory repository as a test double only.

```
Browser ──► middleware.ts (session cookie → SessionContext)
                  │
                  ▼
         Server Actions / Route Handlers
         (authenticateRequest + assertOwnership)
                  │
                  ▼
         PrismaClient (adapter-pg, pg 17)
         User ──< WorkspaceMember >── Workspace ──< Book ──< Chapter
                                    ├── DesignProfile (versioned)
                                    ├── DocumentHistory (revision)
                                    ├── Asset (SHA-256 key)
                                    ├── ImportLog
                                    └── ExportJob (PDF bytes ref)
                  │
                  ▼
         Services (pure, no Map):
         BookService, EditorAutosaveService,
         ManuscriptImportService, PdfExportService (Chromium),
         MediaService (disk/S3)
```

Rules that already exist and should be kept: (a) never trust `userId` from client, (b) never silently discard unsupported blocks (emit `unsupported_raw` + warnings), (c) `FOR UPDATE` row locks for reorder/save races, (d) `BOOKFORGE_DEV_IDENTITY` blocked in production, (e) SSRF allowlist in print renderer.

---

## 7. Forward Roadmap (Phases 11–15)

Each phase is shippable independently and has a measurable acceptance check.

### Phase 11 — Persistence Convergence (P0, 8–10 days)

*Goal:* One database, one book/chapter domain.

* Deliverables:
  - Regenerate `prisma/schema.prisma` from `20261014000000_init` (workspace model) + reconcile `Chapter.revision` column addition; squash to a single `init` migration.
  - Port `BookDesignSettings` → `DesignProfile` mapping (Master Book preset unchanged: `215×275`, `18/20/22/16/5`).
  - Refactor `src/server/db.ts:BookForgeRepository` to an interface with two adapters: `PrismaBookForgeRepository` (prod) and `InMemoryBookForgeRepository` (tests). Route handlers depend on the interface, not the Map.
  - Migrate `import-service.ts`, `pdf-exporter.ts`, `media-service.ts`, `autosave.ts:EditorAutosaveService` to use `PrismaClient` transactions in place of Map ops.
  - Keep the in-memory adapter for fast unit tests (`createIsolatedRepository(false)` → `createIsolatedPrismaMock()`).
* Acceptance: `npm run db:validate && npm run db:deploy` on a fresh `bookforge_test` DB succeeds; `npm test` passes with `TEST_DATABASE_URL` pointing at it; `GET /api/books` created via one stack is visible from the other.

### Phase 12 — Authentication & API Wiring (P0, 5–7 days)

*Goal:* Real login, no shared dev identity in any deployed environment.

* Deliverables:
  - `POST /api/auth/register`, `POST /api/auth/login` (rate-limited via `AuthRateLimiter`), `POST /api/auth/logout`, `GET /api/auth/me`.
  - `middleware.ts` that resolves `bf_session` cookie and injects `SessionContext`; `401` on missing/expired session, `403` on `IDENTITY_DISABLED`.
  - Replace every `requireIdentity()` and every `getRepository()` call on request paths with `authenticateRequest()` + Prisma adapter.
  - Add `SESSION_SECRET` rotation note to `docs/coolify-deployment.md`; enforce `SESSION_SECRET.length >= 32` in production (already done in `loadAppConfig`).
  - Negative tests: user A cannot `GET /api/books/:bId`, `POST /api/import`, `POST /api/books/:bId/export`, `GET /api/media/:id` for user B's resources (extend `ownership.test.ts` pattern).
* Acceptance: Playwright or `curl` script performs register → login → createBook → createChapter → export → logout → `401` on next export; `BOOKFORGE_DEV_IDENTITY=true` in production build still yields `403`.

### Phase 13 — Real PDF & Media Storage (P0, 5–7 days)

*Goal:* Bytes on disk that a user can download.

* Deliverables:
  - Add `puppeteer-core@^22` (no `puppeteer` download; reuse `chromium` from `Dockerfile` runner stage). Render `renderPrintHtmlDocument(...).html` with `page.setContent(html, { waitUntil: 'networkidle0' })` + `page.pdf({ preferCSSPageSize: true, printBackground: true })`.
  - `EXPORT_LIMITS.TIMEOUT_MS 30000` enforced via `Promise.race`; `MAX_PAGE_COUNT`/`MAX_OUTPUT_SIZE_BYTES` checked before and after render; temp file cleaned in `finally`.
  - Media: write validated bytes to `MEDIA_DIR` volume or S3 bucket (`STORAGE_DRIVER=local|s3`), keyed by `private/<userId>/<sha16>-<name>`; serve via `GET /api/media/[assetId]` with ownership check and `Content-Disposition: inline`.
  - Wire `import-service.ts:withTemporaryImportStagingDir` to real `yauzl` extraction for ZIP uploads (descriptor path already supports it).
* Acceptance: `POST /api/books/:id/export { scope: "BOOK" }` returns a `200` with `Content-Type: application/pdf` and Bangla glyphs render (Noto fonts present per `fc-cache -f`); `GET /api/media/:id` returns `200` for owner, `404` for non-owner.

### Phase 14 — CI, Hardening & Observability (P1, 5–6 days)

*Goal:* Every PR proves correctness and security; prod emits useful logs without leaking content.

* Deliverables:
  - `.github/workflows/ci.yml`: `npm ci` → `eslint` → `tsc --noEmit` → `prisma validate` → `npm test` (with `TEST_DATABASE_URL` service container `postgres:17-alpine`) → `npm run build` → `docker build` (smoke).
  - Middleware: `Content-Security-Policy` (default-src self, fonts.googleapis.com, no inline scripts beyond Next.js nonce), `Strict-Transport-Security` in prod, CSRF token on `POST/PUT/DELETE` (double-submit cookie), per-IP rate limits on auth & import routes.
  - Logger: add `requestId` (`crypto.randomUUID()` per request, propagated via `AsyncLocalStorage`), redact `password`, `tokenHash`, `markdown` fields.
  - Health: `/api/health` already covers `dbStatus` + `resources`; add `ready` vs `live` distinction (live = process up, ready = DB + disk + Chromium available).
* Acceptance: A PR that breaks a type or test fails CI; `curl -i` shows `Strict-Transport-Security` and `Content-Security-Policy` in production mode; logs contain `requestId` without manuscript snippets.

### Phase 15 — Backup, Restore & Coolify Cutover (P1, 3–4 days)

*Goal:* Operators can recover without the engineer who built it.

* Deliverables:
  - `scripts/backup.sh` (`pg_dump --format=custom --compress=9`) + `scripts/restore.sh` (`pg_restore --clean --if-exists`), both reading `DATABASE_URL` from env, writing to a Coolify volume `postgres_backups` with `0700`.
  - Coolify scheduled task: nightly `pg_dump` + 7-day retention (7 daily, 4 weekly) + `sha256sum` manifest; docs in `docs/coolify-deployment.md` (domain, HTTPS via Coolify/LetsEncrypt, `DOCKER_DATABASE_URL` wiring, migration one-shot).
  - Runbook: deploy → `migrate` → `health` → `backup verify` on a disposable `_test` DB → rollback (`docker compose down && docker compose up -d db && pg_restore`).
* Acceptance: `scripts/backup.sh && scripts/restore.sh` round-trips a seeded DB on staging and the restored book count matches; Coolify health check URL is `GET /api/health` with `200 healthy`.

---

## 8. Technical Appendix — File-Level Task Breakdown

### Must-change files (Phase 11–13)

| File | Action | Why |
|---|---|---|
| `prisma/schema.prisma` + `prisma/migrations/` | Regenerate from workspace model; squash to one `init` | Drift is the top blocker |
| `src/generated/prisma/**` | `prisma generate` after schema fix | Client must match adapter-pg usage |
| `src/server/db.ts` | Convert `BookForgeRepository` to interface; keep Map as `InMemoryAdapter` for tests | Convergence needs seam |
| `src/features/books/service.ts`, `src/features/editor/autosave.ts`, `src/features/import/import-service.ts`, `src/features/publishing/pdf-exporter.ts`, `src/features/media/media-service.ts` | Inject `BookForgeRepository` interface; swap Map calls for Prisma `tx.*` | Single transaction story |
| `src/app/api/auth/*/route.ts` (new) | `register`/`login`/`logout`/`me` via `AuthService` + Prisma | Real auth |
| `middleware.ts` (new) | Session cookie → `SessionContext` | Remove dev shim |
| `src/app/api/import/route.ts` | Add `multipart/form-data` parsing (`formData()` → `Buffer`) + real ZIP extraction | Browser file upload |
| `src/features/publishing/pdf-exporter.ts` + `Dockerfile` | Add `puppeteer-core`, render HTML→PDF, clean temp | Real PDF |
| `src/features/media/media-service.ts` | Write bytes to `MEDIA_DIR`/S3 | Real storage |
| `.github/workflows/ci.yml` (new) | lint→typecheck→validate→test(with PG service)→build | CI gate |
| `docs/coolify-deployment.md` | Add env table, domain/HTTPS, health, migration, backup, rollback | Operator runbook |
| `prisma.config.ts` + `.env.example` | Add `MEDIA_DIR`, `STORAGE_DRIVER`, `S3_*` placeholders | New env surface |

### Should-change files (readability / tech debt)

| File | Action |
|---|---|
| `src/app/page.tsx` (1800+ lines) | Extract `I18N`, `INITIAL_DESIGN`, `INITIAL_BOOKS`, `renderMd` into `src/features/preview/render.ts` and `src/lib/i18n/*`; shrink page to composition. |
| `src/components/workspace.tsx` + `src/app/books/[bookId]/page.tsx` + `src/app/page.tsx` | Converge on one workspace shell; remove duplicate chapter lists. |
| `src/lib/i18n/messages.ts` + `src/lib/i18n/workspace.ts` | Merge into single dictionary; share with `DESIGN_SYSTEM.md` labels. |
| `src/app/api/health/route.ts` | Split `live` (process up) vs `ready` (DB+Chromium+disk) per Phase 14. |

### Test plan per phase

* Phase 11: `library.integration.test.ts` (already asserts ownership, Unicode, `P2002`/`P2003` constraints) becomes the primary gate; add `TEST_DATABASE_URL` to CI service.
* Phase 12: Extend `ownership.test.ts` with cross-user `POST /api/import` and `POST /api/books/:id/export` denials; add `auth.test.ts` for scrypt, cookie flags, rate limit, session expiry.
* Phase 13: `design-and-export.test.ts` gains a Chromium smoke (A4 + 215×275, mirror margins, header/footer, TOC, watermark) and `media-service` round-trip (upload → `GET /api/media/:id` 200 owner / 404 non-owner).
* Phase 14: Add `security.test.ts` for CSP/HSTS/CSRF/rate-limit headers; add logger redaction test.

---

## 9. Dependency & Tooling Notes

* Node: `^22.12.0 || >=24.0.0` pinned — keep. Add `puppeteer-core` (not `puppeteer`) to reuse the `chromium` already in the runner image; no extra download.
* Tailwind: v4 (`@tailwindcss/postcss ^4.1.0`) — no action.
* Prisma: `7.10.0` + `@prisma/adapter-pg` — after schema fix, run `prisma generate` and `prisma validate` in CI.
* Editor: `@tiptap/* 3.32.0` + `@codemirror/*` — keep; no new editor deps.
* Optional later: `@aws-sdk/client-s3` if `STORAGE_DRIVER=s3`; otherwise `fs`-backed volume is sufficient for Coolify VPS.

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Migration squash breaks existing dev DBs | Data loss on `migrate deploy` | Announce a one-time `prisma migrate reset` for dev; prod gets fresh deploy on new VPS volume, not an in-place drift fix. |
| Chromium PDF memory spike on 2000-page book | OOM kill (app limit 1536M) | Enforce `MAX_PAGE_COUNT 2000` before render; render in a worker or a short-lived container; set `PUPPETEER_OOM_GUARD` and `activeExportJobs` semaphore already exists. |
| SVG XSS bypass via encoded payloads | Stored XSS in media | Keep strict regex plus `DOMPurify` or `svg-sanitizer` second pass; serve SVGs as `Content-Disposition: attachment` or rasterize thumbnails. |
| Session secret rotation invalidates cookies | Forced logout | Support `SESSION_SECRET` as comma-separated list (primary + previous) during rotation window. |
| ZIP bomb via many small entries | Disk fill | Already covered by `MAX_ZIP_ENTRIES 60` + `MAX_FILE_SIZE_BYTES 15 MB` + ratio `25:1`; add per-entry `MAX_ENTRY_BYTES 5 MB` and total temp-dir quota. |

---

## 11. Open Questions (Need Owner Decision)

1. **Tenant model:** Docs say `workspace_id`, but Prisma's workspace model has `Workspace` + `WorkspaceMember(role: OWNER|EDITOR|VIEWER)` while `src/server/auth.ts` only has single-owner `userId`. Confirm whether multi-user workspaces are in scope for v1.1 or single-owner workspaces suffice.
2. **Pricing/export quotas:** `EXPORT_LIMITS.MAX_CONCURRENT_JOBS 2` is global; should it be per-user/per-workspace?
3. **DOCX fidelity:** Current DOCX path emits warnings and strips to text; is faithful paragraph/table/style preservation a v1.1 requirement or is warning + clean text acceptable?
4. **Media hosting:** Coolify volume vs S3-compatible (MinIO/Cloudflare R2) — which fits the VPS budget?

---

## 12. How to Use This Plan

* Engineers: work phases in order; each phase's *Acceptance* line is the definition of done. Do not start Phase 12 until `prisma validate` passes on a fresh DB.
* Reviewers / stakeholders: Phase 11–13 are the critical path; Phases 14–15 can overlap with QA. A single-engineer estimate is **4–6 weeks** to reach production-ready on Coolify; adding a second reviewer for PRs and a staging Coolify instance shortens wall-clock time by ~1 week.
* Operators: until Phase 15 ships, treat any Coolify deployment as **staging** — nightly `pg_dump` manually and keep `DATABASE_URL` off Git.

---

*Generated from static analysis on 22 October 2026. No tests were executed, no credentials accessed, no files modified beyond this audit document. Re-run `npm run lint && npm run typecheck && prisma validate && npm test && npm run build` locally before acting on this plan.*

