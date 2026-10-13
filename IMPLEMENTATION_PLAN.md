# BookForge — Implementation Plan
**Owner:** BookForge project  
**Source of truth:** [PRD.md](./PRD.md)  
**Approach:** Phase-gated implementation; every phase must pass its exit criteria before the next phase is considered complete.

## Delivery rules
- Audit repository state before each major change.
- Make small commits with descriptive messages.
- Keep TypeScript strict; avoid `any`.
- Validate inputs at boundaries and enforce authorization server-side.
- Run lint, type-check, tests, and production build before marking a phase complete.
- Never claim tests passed unless they were actually run.
- Add or update docs, environment examples, and migrations with the feature.
- No real secrets in Git; provide `.env.example` only.
- Preserve existing working behavior and avoid unrelated refactors.

## Phase 0 — Repository and decisions
**Tasks**
- Inspect repository, branches, existing files, scripts, and CI.
- Confirm supported Node.js/package-manager versions and pin them.
- Create `PROJECT.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, and this plan.
- Decide canonical content representation, auth approach, storage abstraction, and initial ownership model.
- Create issue/checklist breakdown for each phase.

**Exit criteria**
- Architecture decisions documented.
- Clean baseline commands documented.
- No application feature is claimed complete without evidence.

## Phase 1 — Foundation and database
**Tasks**
- Set up Next.js App Router, TypeScript strict mode, Tailwind, linting, formatting, and test scripts.
- Add PostgreSQL and Prisma.
- Define initial User, Book, BookNode/Chapter, DesignProfile, Revision, MediaAsset, and ExportJob models as justified by MVP scope.
- Add schema validation with Zod and typed service boundaries.
- Add local Docker Compose for app/database where practical.
- Add migrations, seed data for development, health route, and safe error handling.
- Add CI workflow for lint, type-check, tests, and build.

**Exit criteria**
- Fresh clone can be installed and run using documented commands.
- Database migration and development seed work from a clean database.
- CI checks pass.
- No credentials committed.

## Phase 2 — Dashboard and book structure
**Tasks**
- Build responsive dashboard, empty/loading/error states, search and sorting.
- Create, rename, archive, restore, and delete books.
- Build book workspace navigation.
- Add chapter/part/front-matter/back-matter structure and ordering.
- Implement server-side ownership checks even before multi-user UI is finished.
- Add confirmation and undo/recovery patterns where appropriate.

**Exit criteria**
- Book and chapter CRUD works end-to-end.
- Reordering persists after refresh.
- Authorization and validation tests pass.

## Phase 3 — Dual-mode editor
**Tasks**
- Integrate TipTap visual editor and CodeMirror Markdown/source editor.
- Define supported formatting and conversion rules.
- Implement switching modes without silent loss of supported content.
- Add debounced autosave, visible save state, retry behavior, dirty-state navigation guard, and conflict detection.
- Add keyboard shortcuts, labels, focus behavior, and editor tests.
- Store content schema version.

**Exit criteria**
- Round-trip tests cover headings, paragraphs, emphasis, lists, quotes, links, and supported images.
- Save failure is visible and does not falsely report success.
- Reload restores saved content.

## Phase 4 — Import pipeline
**Tasks**
- Add Markdown import first, then DOCX, then ZIP package import.
- Build preview/confirmation UI before writing imported content.
- Define limits for size, archive entries, compression ratio, and allowed file types.
- Block path traversal and unsafe content; validate actual file type.
- Produce structured warnings for unsupported DOCX features.
- Test malformed files, oversized files, and ZIP-bomb/path-traversal cases.

**Exit criteria**
- Supported import matrix documented.
- Imports are transactional or safely recoverable.
- Invalid files fail with actionable messages.
- Import does not overwrite an existing book without confirmation.

## Phase 5 — Design system and book styles
**Tasks**
- Define validated design profile schema.
- Add page size, margins/gutter, font family/size, line height, paragraph spacing, alignment, page numbering, headers/footers, chapter-opening rules.
- Provide presets, including configurable 215 × 275 mm.
- Keep design profile changes separate from manuscript content.
- Preview and validate settings before applying.

**Exit criteria**
- Profiles can be created, edited, duplicated, and applied.
- Invalid values are rejected with useful feedback.
- Content remains unchanged when design settings change.

## Phase 6 — Print preview and PDF
**Tasks**
- Build print stylesheet and controlled HTML rendering template.
- Integrate Paged.js if needed and Chromium-based PDF generation.
- Support chapter and whole-book export.
- Add export job status, timeout/resource limits, failure reporting, and cleanup.
- Test fonts, Unicode, Bangla shaping, mixed-language text, images, page breaks, headers/footers, and page numbering.
- Add visual regression/sample-PDF review instructions.

**Exit criteria**
- Sample PDFs are manually inspected, not only generated.
- Export is repeatable with recorded settings.
- Missing fonts or unsupported layout is surfaced.
- Large exports do not block ordinary application requests indefinitely.

## Phase 7 — Authentication and revision history
**Tasks**
- Complete registration/sign-in/sign-out/password recovery as appropriate for selected auth provider.
- Add server-side authorization to every read/write/export/media path.
- Implement revisions, revision listing, preview, and restore-as-new-revision.
- Define retention policy and sensitive-data logging rules.
- Add tests for cross-user access and session expiration.

**Exit criteria**
- Cross-user isolation tests pass for books, chapters, revisions, media, and exports.
- Restore never destroys the revision being restored from.
- Auth flows have clear failure states.

## Phase 8 — Media library and hardening
**Tasks**
- Add secure media upload/list/delete and alt text.
- Implement storage adapter and private object access.
- Add rate limits, secure headers, upload limits, server-side validation, and dependency review.
- Check XSS, CSRF where applicable, SSRF, path traversal, archive abuse, and resource exhaustion.
- Add privacy/data export/deletion documentation.

**Exit criteria**
- Upload authorization and validation tests pass.
- Unsafe content is not rendered as executable HTML.
- Secrets and personal manuscript content are excluded from logs.

## Phase 9 — Production operations
**Tasks**
- Add Docker production build and health/readiness endpoints.
- Prepare Coolify deployment guide and environment variable reference.
- Configure HTTPS/domain guidance, least-privilege database user, persistent volumes, and migration procedure.
- Configure encrypted off-site backups and automated retention.
- Perform a database and media restore drill.
- Add monitoring, error reporting, log rotation, and incident runbook.
- Test clean deployment from documented steps.

**Exit criteria**
- Deployment succeeds from documented instructions.
- Backup restore is demonstrated.
- Rollback and recovery procedures are documented.
- CI is green on the release commit.

## Phase 10 — Release candidate
**Tasks**
- Run full regression and accessibility checks.
- Test desktop, tablet, and mobile critical journeys.
- Test Bangla-only, English-only, and mixed-language books.
- Test a short book and a large representative manuscript.
- Review privacy, license compliance, dependency vulnerabilities, and operational cost.
- Fix P0/P1 issues; publish known limitations.

**Exit criteria**
- Release checklist signed off.
- No known critical security/data-loss issue.
- All acceptance criteria in PRD are verified with evidence.

## Required deliverables
- `PROJECT.md`: scope, scripts, conventions, and onboarding.
- `PRD.md`: product requirements and acceptance criteria.
- `ARCHITECTURE.md`: modules, data flow, security boundaries, and decisions.
- `DESIGN_SYSTEM.md`: tokens, components, accessibility, and visual conventions.
- `IMPLEMENTATION_PLAN.md`: phases, tasks, exit criteria.
- `FEATURE_MATRIX.md`: feature status and test evidence.
- `.env.example`: names and safe placeholders only.
- `README.md`: setup, development, testing, and deployment links.

## Status tracking
A phase is **Planned** until implementation exists, **In Progress** while being built, and **Verified** only after its exit criteria have evidence. Do not use “complete” based on code generation alone.
