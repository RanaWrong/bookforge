# BookForge — Product Requirements Document (PRD)
**Status:** Planning baseline  
**Product:** BookForge  
**Repository:** https://github.com/RanaWrong/bookforge  
**Languages:** বাংলা and English  
**Document version:** 1.0  
**Last updated:** 2026-10-13

## 1. Product vision
BookForge is a bilingual, web-based workspace for writing, organizing, designing, importing, and publishing books. It should help authors move from manuscript to consistent, print-ready output without repeatedly fixing layout manually.

## 2. Problem statement
Authors often write in multiple tools, maintain formatting inconsistently, and struggle to import manuscripts or export books with reliable pagination. BookForge centralizes manuscript content, reusable design settings, revision history, and publishing output.

## 3. Goals
- Create and manage books, parts, chapters, and manuscript content.
- Offer both a visual editor and a Markdown/source editor.
- Keep content independent from typography and page design.
- Import DOCX and Markdown, with ZIP as a packaged import option.
- Preview print layout and export chapter or full-book PDF.
- Support Bangla and English content, Unicode fonts, and mixed-language documents.
- Provide secure accounts, revision history, and dependable backups.
- Run locally and deploy using Docker/Coolify on a VPS.

## 4. Non-goals for the first release
- A full collaborative Google Docs-style real-time editor.
- Direct distribution to Amazon KDP or other marketplaces.
- Native mobile applications.
- AI-generated writing as a required core dependency.
- Guaranteed support for every DOCX layout feature.
- Complex enterprise billing and organization management.

## 5. Target users
1. Independent authors writing in Bangla or English.
2. Editors managing manuscripts and chapter structure.
3. Book designers creating repeatable page styles.
4. Small publishers preparing print-ready PDFs.

## 6. Product principles
- Content is canonical; styling is a separate layer.
- Every destructive action should be recoverable where practical.
- UI components do not own business rules.
- Validate imports and sanitize rendered content.
- Preserve Unicode and Bangla text through editing, preview, and export.
- Prefer small, testable modules over premature microservices.
- Never commit secrets or production credentials.
- Provide clear error messages and visible save status.

## 7. Proposed technology
- Application: Next.js App Router + TypeScript
- Styling: Tailwind CSS
- Visual editing: TipTap
- Source editing: CodeMirror with Markdown
- Database: PostgreSQL + Prisma
- Validation: Zod
- Authentication: Auth.js or another maintained, compatible solution selected during implementation
- Import: maintained DOCX parser and secure ZIP processing
- Print: semantic HTML/CSS, Paged.js where suitable, Chromium-based PDF rendering
- Testing: Vitest, React Testing Library, and Playwright
- Operations: Docker, Coolify, VPS, automated backups and CI

Technology versions must be pinned and checked for compatibility during implementation.

## 8. Information architecture
- Public/authentication: Sign in, Sign up, password recovery
- Workspace: Dashboard, recent books, search
- Book workspace: Overview, manuscript, chapters, design, preview, export, history
- Editor: Visual mode, Source mode, preview, save status
- Settings: Language, account, editor preferences
- Administration/operations: health checks, logs and backup procedures (not public-facing)

## 9. Functional requirements

### FR-01 — Account and workspace
- Users can register, sign in, sign out, and recover access.
- Every book belongs to an authorized owner/workspace.
- Unauthorized users cannot read or modify another user's books.
- Authentication and authorization are enforced on the server.

### FR-02 — Dashboard
- List books with title, language, status, updated time, and optional cover.
- Create, rename, archive, restore, and delete books.
- Search and sort books.
- Show useful empty, loading, and error states.
- Confirm destructive actions.

### FR-03 — Book structure
- A book has title, subtitle, language, metadata, design profile, and status.
- Organize content into front matter, parts, chapters, and back matter.
- Create, rename, reorder, duplicate, archive, and delete chapters.
- Store ordering explicitly and validate it.
- Autosave changes without losing edits.

### FR-04 — Dual-mode editor
- Visual mode supports headings, paragraphs, emphasis, lists, quotes, links, and images where supported.
- Source mode edits Markdown.
- Switching modes preserves content and supported formatting.
- Unsupported formatting is reported rather than silently destroyed.
- Display saving/saved/error states and last-save time.
- Handle concurrent or stale edits safely; do not silently overwrite newer content.
- Keyboard shortcuts and accessible controls are provided.
- Unsaved changes are protected during navigation.

### FR-05 — Content model
- Store canonical structured content and provide a deterministic Markdown representation where possible.
- Separate manuscript data from page layout settings.
- Store content format/schema version for future migrations.
- Sanitize HTML and validate links and uploaded media.
- Track word and character counts with documented counting rules.

### FR-06 — Import
- Import Markdown files.
- Import DOCX files with a clear supported-feature matrix.
- Import ZIP packages only after validating paths, file types, size, and archive limits.
- Preview detected title, chapters, images, and warnings before committing an import.
- Import should not overwrite an existing book without explicit confirmation.
- Report errors and skipped/unsupported elements.
- Reject malicious archives, path traversal, oversized files, and unsafe content.

### FR-07 — Design settings
- Configure trim/page size, margins, gutter, typography, line height, paragraph spacing, alignment, page numbering, headers, footers, and chapter-opening styles.
- Save reusable design profiles.
- Apply a profile to a book or selected output.
- Keep design settings versioned and separate from manuscript content.
- Validate incompatible or out-of-range settings.
- Provide sensible print presets, including a configurable 215 × 275 mm preset.

### FR-08 — Preview and pagination
- Preview page layout before export.
- Support page breaks, chapter starts, running headers/footers, and page numbering where technically reliable.
- Warn about overflow, missing fonts, broken images, and unsupported layout.
- Keep preview and PDF output as consistent as possible.
- Make clear that browser preview may differ slightly from final Chromium rendering.

### FR-09 — PDF export
- Export one chapter or the full book.
- Generate PDFs using print CSS and a controlled rendering pipeline.
- Support Unicode and embedded fonts when licensing and renderer capabilities allow.
- Include metadata and consistent page numbering.
- Show export progress/status and useful failure messages.
- Record export settings and output metadata.
- Test Bangla glyph shaping, punctuation, mixed Bangla/English text, page breaks, and image rendering.
- Do not claim print readiness until visual regression and real PDF inspection pass.

### FR-10 — Version history
- Create revisions at defined save/checkpoint intervals.
- Show revision time and optional user/message.
- Preview and restore a prior revision.
- Restoring creates a new revision rather than erasing history.
- Apply retention limits configurable by environment.
- Version history is not a substitute for infrastructure backups.

### FR-11 — Media library
- Upload and manage book images and cover assets.
- Validate file size, MIME type, and actual file content.
- Use randomized storage keys; do not trust user filenames.
- Prevent unauthorized access and unsafe SVG/HTML execution.
- Provide alt text and image dimensions where available.
- Configure storage through an adapter so local storage can later be replaced with S3-compatible storage.

### FR-12 — Localization and accessibility
- UI supports Bengali and English.
- Store manuscript language separately from UI language.
- Preserve Unicode and correct text direction where needed.
- Use semantic HTML, keyboard navigation, visible focus, labels, and accessible dialogs.
- Do not translate manuscript content automatically.

### FR-13 — Security and privacy
- Validate all server inputs.
- Enforce ownership checks for every book, chapter, revision, upload, and export.
- Apply rate limits to authentication and expensive export endpoints.
- Protect against XSS, CSRF where applicable, SSRF through remote imports, path traversal, ZIP bombs, and resource exhaustion.
- Keep secrets in environment variables.
- Use secure cookies, TLS, least-privilege database credentials, and safe production headers.
- Define data export and deletion behavior.
- Log operational events without logging manuscript contents or credentials unnecessarily.

### FR-14 — Reliability and operations
- Provide health/readiness checks.
- Use structured logs and actionable errors.
- Configure database migrations and rollback/recovery procedures.
- Schedule encrypted off-site backups and periodically test restoration.
- Document deployment, updates, environment variables, and incident recovery.
- Add CI checks for lint, type-check, tests, and production build.

## 10. Core data model (initial)
- User: id, name, email, password/auth provider metadata, timestamps
- Workspace: id, name, ownerId, timestamps (optional for initial single-user MVP)
- Membership: workspaceId, userId, role (when workspace support is introduced)
- Book: id, owner/workspace reference, title, subtitle, language, status, metadata, designProfileId, timestamps
- BookNode: id, bookId, parentId, type, title, position, timestamps
- ChapterContent: nodeId, format/schemaVersion, structuredContent, plainText/derived data, updatedAt
- DesignProfile: id, owner/workspace reference, name, settings JSON validated by schema, version, timestamps
- Revision: id, bookId/nodeId, content snapshot, revision number, createdBy, createdAt, note
- MediaAsset: id, owner/workspace reference, storageKey, mimeType, size, dimensions, altText, timestamps
- ExportJob: id, bookId, format, settings snapshot, status, error code, output key, timestamps
- AuditEvent: id, actorId, action, resource type/id, minimal metadata, createdAt

Use UUID/CUID identifiers, explicit foreign keys, indexes, uniqueness constraints, and deletion rules. Final schema must be reviewed before migrations.

## 11. UX requirements
- Responsive layouts for desktop, tablet, and mobile; editor optimized first for desktop.
- Fast initial dashboard and clear loading states.
- No fake buttons or dead-end controls.
- Confirm destructive operations.
- Preserve unsaved content during recoverable failures.
- Use plain language for import/export errors.
- Empty states should explain the next useful action.
- Keep editor controls focused; advanced print settings may live in a separate panel.

## 12. Acceptance criteria for MVP
- User can create a book and manage at least several chapters.
- Content can be edited in visual and source modes without silent loss of supported formatting.
- Markdown import works with automated tests.
- DOCX import provides clear warnings for unsupported elements.
- Design profiles can be saved and applied independently of content.
- A full book can be exported to PDF.
- Bangla and English mixed content renders correctly in inspected sample PDFs.
- Authorization tests prove cross-user data isolation.
- Production build, lint, type-check, and tests pass.
- Backup restoration is documented and tested before production launch.

## 13. Product metrics
- Time from creating a book to first successful export.
- Import success rate and warning/error rate.
- Autosave failure rate.
- PDF export success rate and median duration.
- Number of export retries.
- User-reported formatting/data-loss incidents.
- Backup restore success in scheduled drills.
Do not collect manuscript content for analytics.

## 14. Risks and mitigations
- Bangla font/shaping inconsistencies: test representative fonts and real PDF output early.
- DOCX complexity: publish a supported-feature matrix and show import warnings.
- Pagination mismatch: use one controlled renderer for final export and visual regression tests.
- Large books: background export jobs, limits, timeouts, and progress states.
- Data loss: autosave, revisions, backup monitoring, restore drills.
- Scope growth: enforce MVP/non-goal boundary and phase gates.

## 15. Decisions to confirm during implementation
- Auth.js versus another maintained auth provider.
- Local media storage versus S3-compatible storage for first deployment.
- Exact canonical content representation and Markdown conversion rules.
- Background queue technology if export jobs exceed request limits.
- Single-user ownership model versus workspace/membership from the beginning.
- Exact print presets and supported DOCX features.
These decisions must be documented with rationale before implementation depends on them.
