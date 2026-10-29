# BookForge — Architectural Specification

## 1. Context and Architectural Goals
BookForge is a modular monolithic Next.js 15 application providing manuscript management, dual-mode editing (Visual and Markdown), layout styling, and PDF generation for bilingual (Bangla + English) print books.

## 2. Domain Boundaries
- `src/server/auth.ts`: Workspace-scoped session resolution and role enforcement (`OWNER`, `EDITOR`, `VIEWER`), blocking `BOOKFORGE_DEV_IDENTITY` in production.
- `src/server/db.ts` & `prisma/schema.prisma`: Relational persistence layer enforcing `workspace_id` ownership on every query.
- `src/features/books/`: Book and chapter CRUD, metrics, and transactional chapter reordering.
- `src/features/editor/`: Canonical block schema (`schemaVersion: 1`), bidirectional Markdown converter (preserving unsupported blocks with warnings), conflict-detecting autosave, and non-destructive revision restore.
- `src/features/import/`: Markdown, DOCX, and ZIP parsers with archive security validation and manuscript quality warning audits.
- `src/features/design/`: Versioned print profiles (215 × 275 mm Master Book, Trade Paperback, Academic A5) independent from manuscript content.
- `src/features/publishing/`: Paged CSS `@page :left` / `@page :right` mirror margin print renderer and PDF export service.
- `src/features/media/`: Validated private media upload with MIME checks, SVG XSS sanitization, and SHA-256 storage keys.
