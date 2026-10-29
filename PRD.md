# BookForge — Product Requirements Document (PRD)
**Status:** Implemented v1.0
**Product:** BookForge
**Repository:** https://github.com/RanaWrong/bookforge
**Languages:** Bengali and English
**Document version:** 1.0

## 1. Product vision
BookForge is a bilingual, web-based workspace for writing, organizing, designing, importing, and publishing books. It helps authors move from manuscript to consistent, print-ready output without repeatedly fixing layout manually.

## 2. Core Features
1. **Workspace & Book Structure:** Books, Parts, Chapters (Frontmatter, Body Chapters, Backmatter), transactional chapter reordering, word and character metrics.
2. **Dual-Mode Editor:** Visual (TipTap) and Markdown Source (CodeMirror) modes sharing a canonical block model (`schemaVersion: 1`), with conflict-aware autosave.
3. **Secure Import Pipeline:** Markdown (`.md`), Word (`.docx`) with formatting warnings, and ZIP packages with path-traversal and zip-bomb ratio enforcement.
4. **Typography & Layout Design System:** Reusable print profiles including the 215 × 275 mm Master Book preset with mirror margins (`18mm` top, `20mm` bottom, `22mm` inside + `5mm` gutter, `16mm` outside) and Bangla/English font pairings.
5. **Print Preview & PDF Export:** Paged CSS mirror-margin stylesheet, running headers/footers, and chapter or full-book PDF export.
6. **Revision Control & Security:** Workspace-scoped ownership (`workspace_id`), non-destructive `restoreRevisionAsNew`, and media upload sanitization.
