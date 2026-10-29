# BookForge — Feature Matrix

| Area | Feature | Priority | Phase | Acceptance evidence | Status |
|---|---|---|---|---|---|
| Foundation | Next.js, TypeScript strict, lint, tests, CI | P0 | 1,14 | `package.json`, `tsconfig.json`, `.github/workflows/ci.yml` | Verified |
| Data | PostgreSQL + Prisma migrations | P0 | 1,11 | `prisma/schema.prisma`, `prisma/migrations/20261022000000_baseline/migration.sql` | Verified |
| Dashboard | Book list, create, rename, delete | P0 | 2 | `src/features/books/service.ts` + `tests/books-and-chapters.test.ts` | Verified |
| Structure | Chapters and transactional ordering | P0 | 2 | `reorderChapters` transactional tests | Verified |
| Editor | Visual TipTap + Canonical block editor | P0 | 3 | `src/features/editor/DualModeEditor.tsx` | Verified |
| Editor | Markdown/source mode round-trip conversion | P0 | 3 | `tests/editor-and-markdown.test.ts` | Verified |
| Editor | Autosave and conflict handling | P0 | 3 | `EditorAutosaveService` conflict & retry tests | Verified |
| Import | Markdown import with quality audit | P0 | 4 | `parseMarkdownImport` & `tests/import-security.test.ts` | Verified |
| Import | DOCX import with warnings | P1 | 4 | `parseDocxStructuredImport` warning fixtures | Verified |
| Import | Secure ZIP import (path traversal & zip-bomb guard) | P1 | 4 | `validateAndParseZipArchive` malicious archive tests | Verified |
| Design | Reusable print profiles (215×275mm Master Book, A5, Trade) | P0 | 5 | `src/features/design/schema.ts` & `presets.ts` | Verified |
| Design | Mirror margins, gutter, Bangla/Latin typography, headers/footers | P0 | 5 | `buildPrintStylesheet` & `tests/design-and-export.test.ts` | Verified |
| Preview | Print preview and pagination | P0 | 6 | `renderPrintHtmlDocument` | Verified |
| Export | Chapter and full-book PDF export pipeline | P0 | 6,13 | `PdfExportService` with resource & page limits; `generatePdfBuffer` (puppeteer-core) | Verified |
| Export | Real PDF bytes via Chromium | P0 | 13 | `POST /api/books/[bookId]/export { format:"pdf" }` → `application/pdf` | Implemented |
| Localization | Bangla and English UI/content | P0 | 1-6 | `src/lib/i18n/messages.ts` | Verified |
| Auth | Session resolution & dev identity guard in production | P0 | 7,12 | `src/server/auth.ts` + `src/server/prisma-auth.ts` (`/api/auth/*`) | Verified |
| Security | Resource-level workspace ownership checks | P0 | 2, 7, 8 | Cross-workspace denial tests in `tests/books-and-chapters.test.ts` | Verified |
| Revisions | Revision list, preview, restore-as-new-revision | P1 | 7 | `restoreRevisionAsNew` non-destructive history tests | Verified |
| Media | Secure upload, MIME/SVG XSS validation, SHA-256 storage key | P1 | 8,13 | `MediaService.uploadValidatedAsset` + `POST /api/media` + `GET /api/media/[id]` | Verified |
| Operations | Docker, Docker Compose, `/api/health`, Coolify docs | P0 | 9 | `Dockerfile`, `docker-compose.yml`, `docs/coolify-deployment.md` | Verified |
| CI | GitHub Actions (postgres:17 service, lint/typecheck/validate/test/build) | P0 | 14 | `.github/workflows/ci.yml` | Implemented |
| Security headers | CSP, HSTS (prod), Permissions-Policy, nosniff, DENY | P0 | 14 | `next.config.ts` headers + `middleware.ts` request IDs | Implemented |
