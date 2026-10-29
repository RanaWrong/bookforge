# BookForge — Bilingual (বাংলা + English) Book Writing & Publishing Workspace

BookForge is a modular monolithic Next.js 15 application for authoring, structuring, importing, designing, and exporting bilingual (Bangla + English) books to print-ready PDF.

## Completed Architecture & Feature Modules

- **Foundation & Infrastructure (`Dockerfile`, `docker-compose.yml`, `prisma/schema.prisma`)**: PostgreSQL 17 + Prisma relational schema with strict `workspace_id` isolation, one-shot migration container, and `/api/health` readiness endpoint.
- **Book & Manuscript Domain (`src/features/books/`)**: Full CRUD for books and chapters, frontmatter/body/backmatter organization, word/character count tracking, and transactional chapter reordering.
- **Dual-Mode Editor & Revisions (`src/features/editor/`)**: Visual (TipTap) + Markdown Source (CodeMirror) editor sharing a versioned canonical block schema (`schemaVersion: 1`), round-trip Markdown serialization without silent content loss, optimistic concurrency conflict detection, and non-destructive revision history (`restoreRevisionAsNew`).
- **Secure Import Pipeline (`src/features/import/`)**: Markdown, DOCX (with structured formatting warning reports), and ZIP package importer with path-traversal, executable-file, and zip-bomb ratio protection, plus automated manuscript quality checks (raw LaTeX, foreign script OCR artifacts, and chatbot residue).
- **Design System & Print Profiles (`src/features/design/`)**: Versioned print layout profiles independent from manuscript content, including the **Master Book (215 × 275 mm)** preset with mirror margins (`18mm` top, `20mm` bottom, `22mm` inside + `5mm` gutter, `16mm` outside), `Noto Serif Bengali` + `Noto Sans Bengali` + `Inter` typography, and Navy (`#123B6D`) / Orange (`#F26B21`) callout boxes.
- **Print Preview & PDF Engine (`src/features/publishing/`)**: Paged CSS `@page :left` and `@page :right` mirror-margin stylesheet renderer, running headers/footers, and chapter or full-book PDF export pipeline.
- **Authentication, Workspace Isolation & Media Security (`src/server/auth.ts`, `src/features/media/`)**: Role-based workspace access (`OWNER`, `EDITOR`, `VIEWER`), `BOOKFORGE_DEV_IDENTITY` automatically blocked in `production`, and SVG/MIME media upload sanitization.

## Quick Start

```bash
cp .env.example .env
npm install
npm run db:generate
npm test
npm run dev
```
