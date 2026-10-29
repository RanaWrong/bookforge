# Implementation Plan: BookForge v2 Upgrade

## Overview

This plan organises the BookForge v2 upgrade into 15 task groups sequenced by technical dependency. Task group 1 (infrastructure and DB schema) must land first because every other group depends on the new error codes, permission helper, and logger context. Groups 2–5 (UI overhaul) can proceed in parallel with groups 8–11 (publishing pipeline) once group 1 is complete. Groups 6–7 (collaboration) depend on the decomposed editor from group 2. Groups 12–14 (AI, observability, i18n) are largely independent and can be woven in at any point after group 2. Group 15 (tests) is written concurrently with its corresponding feature group.

The dominant language is **TypeScript**. All new files are `.ts` or `.tsx`. The existing Node.js `node --test` runner is used for all tests — no new test framework is introduced.

## Tasks

- [x] 1. Shared Infrastructure & DB Schema
  - [x] 1.1 Add additive fields to `ExportJob` in `prisma/schema.prisma`: `format String @default("PDF")` and `downloadUrl String? @map("download_url")`
    - Also add `outputStorageKey String? @map("output_storage_key")` and `warningsJson String @default("[]") @map("warnings_json")`
    - _Requirements: 14.1, 14.4_
  - [x] 1.2 Add `WorkspaceInvite` model to `prisma/schema.prisma` with fields: `id`, `workspaceId`, `email`, `role`, `token` (unique), `expiresAt`, `createdAt`
    - Store `tokenHash` (SHA-256 of single-use token, not raw token) per security design
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 1.3 Add `YjsSnapshot` model to `prisma/schema.prisma` with fields: `id`, `chapterId` (unique), `snapshot` (Bytes), `updatedAt`
    - Add `yjsSnapshot` relation to `Chapter`
    - _Requirements: 6.4_
  - [x] 1.4 Add `Comment` model to `prisma/schema.prisma` with fields: `id`, `chapterId`, `workspaceId`, `authorId`, `anchorStart`, `anchorEnd`, `body`, `resolvedAt`, `resolvedById`, `createdAt`
    - Add `comments` back-relations to `Chapter` and `User`
    - _Requirements: 7.4, 7.5, 7.7_
  - [x] 1.5 Create and run `prisma migrate dev` to apply schema changes; commit the generated migration SQL file
    - _Requirements: 1.1–18.4_
  - [x] 1.6 Create `src/lib/auth/permissions.ts` exporting `checkPermission(session, workspaceId, requiredRole)` that queries `WorkspaceMember` and throws `AppError("FORBIDDEN", …, 403)` when the caller's role is insufficient
    - Also export `requireEditorOrOwner(session, workspaceId)` convenience wrapper
    - _Requirements: 5.6, 7.3_
  - [x] 1.7 Extend `src/lib/errors.ts` (or equivalent) to add new `ErrorCode` values: `FORBIDDEN`, `AI_DISABLED`, `AI_PROVIDER_ERROR`, `EXPORT_FORMAT_UNSUPPORTED`, `INVITE_EXPIRED`
    - _Requirements: 5.6, 12.1, 12.5_
  - [x] 1.8 Extend `src/lib/logger.ts` with `AsyncLocalStorage`-based request context (`requestId`, `userId`, `workspaceId`) and update `middleware.ts` to wrap each request with `requestContext.run({ requestId: crypto.randomUUID() }, next)`
    - _Requirements: 13.1_
  - [x] 1.9 Create `src/lib/monitoring.ts` with `captureException(err, context?)` — Sentry-compatible HTTP envelope forward when `ERROR_MONITORING_DSN` is set, silent no-op otherwise
    - _Requirements: 13.2_
  - [x] 1.10 Create `src/lib/tracing.ts` with `startSpan<T>(name, fn)` — wraps `fn` in an OpenTelemetry span when `OTEL_EXPORTER_OTLP_ENDPOINT` is set, direct `fn()` call otherwise
    - _Requirements: 13.3_

- [ ] 2. UI/UX Overhaul — Component Decomposition & Theming
  - [x] 2.1 Create `src/components/workspace/state.ts` defining `WorkspaceAction` discriminated union and `WorkspaceState` interface
    - _Requirements: 4.1, 4.2_
  - [x] 2.2 Create `src/components/workspace/WorkspaceProvider.tsx` implementing `WorkspaceContext` with `useReducer` over `WorkspaceAction`; expose `useWorkspace()` hook
    - _Requirements: 4.1, 4.2_
  - [~] 2.3 Create `src/components/workspace/ModalDialog.tsx` — generic controlled `<dialog>` wrapper with `aria-modal="true"`, focus trap (iterate focusable children), and focus-return on close
    - _Requirements: 4.1, 16.3_
  - [~] 2.4 Create `src/components/workspace/BookCard.tsx` rendering a single book row with title, chapter count, last-edited timestamp, word count, and rename/delete/open action buttons
    - Disable action buttons when `memberRole === "VIEWER"`
    - _Requirements: 4.1, 5.6_
  - [~] 2.5 Create `src/components/workspace/BookList.tsx` mapping over `BookSummary[]` and rendering `BookCard` items in a vertical list
    - _Requirements: 4.1_
  - [~] 2.6 Create `src/components/workspace/ChapterCard.tsx` rendering a single chapter row with position, title, word count badge, up/down/rename/delete action buttons
    - _Requirements: 4.1, 5.6_
  - [~] 2.7 Create `src/components/workspace/ChapterList.tsx` mapping over a book's chapters and rendering `ChapterCard` items in an ordered list with cumulative word count
    - _Requirements: 4.1_
  - [~] 2.8 Create `src/components/workspace/StatusBar.tsx` displaying current word count, autosave status, and revision label; wrap content in `role="status" aria-live="polite"` region
    - _Requirements: 4.1, 16.4_
  - [~] 2.9 Create `src/components/workspace/EditorPane.tsx` as a shell that renders `DualModeEditor` when a chapter is active, or a "select a chapter" empty state otherwise
    - _Requirements: 4.1_
  - [~] 2.10 Create `src/components/workspace/TopBar.tsx` with logo link, locale switcher, theme toggle button (light/dark/system), and Focus Mode toggle button; assign `role="banner"` to wrapping `<header>`
    - _Requirements: 2.1, 4.1, 17.3_
  - [~] 2.11 Create `src/components/workspace/WorkspaceRoot.tsx` composing the full layout from `TopBar`, `Sidebar`, `EditorPane`, `StatusBar`, and `ModalDialog` with Focus Mode class logic; assign correct ARIA landmark roles to all top-level regions
    - _Requirements: 4.1, 16.1_
  - [~] 2.12 Create `src/components/workspace/index.tsx` re-exporting `WorkspaceRoot` as `Workspace` to maintain backward compatibility with `src/app/dashboard/page.tsx`
    - _Requirements: 4.3_
  - [x] 2.13 Add dark-theme CSS custom property overrides to `src/app/globals.css` under `[data-theme="dark"]` selector, mirroring every `--bf-*` variable already defined for the light theme; verify all colour pairs meet WCAG AA 4.5:1 contrast ratio
    - _Requirements: 2.3, 2.6_
  - [x] 2.14 Inject FOUC-prevention script in `src/app/layout.tsx` via `<Script strategy="beforeInteractive">` that reads `localStorage.getItem("bf-theme")` and sets `document.documentElement.dataset.theme` before hydration
    - _Requirements: 2.2_
  - [~] 2.15 Implement theme toggle in `TopBar.tsx`: clicking cycles through light/dark/system, updates `WorkspaceProvider` state, sets `document.documentElement.dataset.theme`, and persists to `localStorage("bf-theme")`
    - _Requirements: 2.1, 2.2_

- [ ] 3. UI/UX — Sidebar & Focus Mode
  - [~] 3.1 Create `src/components/workspace/Sidebar.tsx` as the resizable, collapsible container; persist collapsed state to `localStorage("bf:sidebar:collapsed")`; implement drag-resize via pointer events and persist width to `localStorage("bf-sidebar-width")`; use `<nav aria-label="Sidebar navigation">` landmark
    - _Requirements: 1.1, 1.2, 1.4, 15.2_
  - [~] 3.2 Install `@dnd-kit/core` and `@dnd-kit/sortable` (exact pinned versions); add `<DndContext>` and `<SortableContext>` inside `ChapterList.tsx`; call the existing `moveChapter` Server Action in `onDragEnd`
    - _Requirements: 4.1_
  - [~] 3.3 Add word-count badge to `ChapterCard.tsx` reading from `chapter.wordCount`; add cumulative word count to the book-level heading in `ChapterList.tsx`
    - _Requirements: 3.1_
  - [~] 3.4 Implement mobile sidebar collapse in `Sidebar.tsx`: `useMediaQuery("(max-width: 767px)")` hook; when true, render as `position: fixed` off-canvas drawer with backdrop overlay; add hamburger toggle button to `TopBar.tsx`
    - _Requirements: 1.5, 15.2_
  - [~] 3.5 Implement Focus Mode in `WorkspaceRoot.tsx`: when `focusMode === true` apply opacity/pointer-events transitions to `Sidebar`, `TopBar`, and `StatusBar`; constrain `EditorPane` to `max-w-[720px] mx-auto`; add floating "Exit Focus" button; register `Escape` key listener via `useEffect`
    - _Requirements: 2.4, 2.5_

- [ ] 4. Publisher Dashboard
  - [~] 4.1 Extend `src/app/dashboard/page.tsx` (Server Component) to query and display per-book stats grid: total word count (sum of `Chapter.wordCount`), chapter count, last-edited timestamp, and completed export count from `ExportJob`
    - _Requirements: 3.1, 3.2_
  - [~] 4.2 Create a `WritingProgressChart` Client Component in `src/app/dashboard/` that derives daily word-count additions from `DocumentHistory.createdAt` timestamps (last 30 days) and renders an SVG `<polyline>` chart; no external chart library
    - _Requirements: 3.1_
  - [~] 4.3 Add an `ExportJobList` Server Component with `<Suspense>` boundary to the dashboard listing the last 20 `ExportJob` rows for the workspace with status badges and download links for `COMPLETED` jobs
    - _Requirements: 3.3_
  - [~] 4.4 Add `ExportStatusPoller` Client Component that polls `/api/books/[bookId]/export/[jobId]` every 3 seconds while a job is PROCESSING and updates the UI with a progress indicator
    - _Requirements: 14.7_

- [ ] 5. Team Management UI
  - [~] 5.1 Create `src/app/workspace/settings/page.tsx` — workspace settings page visible only to OWNER role (server-side `checkPermission` call)
    - _Requirements: 5.1_
  - [~] 5.2 Create `POST /api/workspaces/[id]/members/invite` API route: validate email, generate UUID invite token, hash with SHA-256, write `WorkspaceInvite` row with 72-hour expiry, send email via `sendInvitationEmail`, return `{ inviteId }`; return HTTP 409 if email already a member
    - _Requirements: 5.2, 5.4_
  - [~] 5.3 Create `src/app/invite/[token]/page.tsx` — invite acceptance page: hash inbound token, look up `WorkspaceInvite`, check expiry, create `WorkspaceMember` row, mark invite as accepted, redirect to dashboard
    - _Requirements: 5.3_
  - [~] 5.4 Create `PATCH /api/workspaces/[id]/members/[memberId]` route: OWNER-only; update `WorkspaceMember.role`
    - _Requirements: 5.5_
  - [~] 5.5 Create `DELETE /api/workspaces/[id]/members/[memberId]` route: OWNER-only; reject self-removal; delete `WorkspaceMember` row
    - _Requirements: 5.5_
  - [~] 5.6 Install `nodemailer` and `@types/nodemailer` (exact pinned versions); create `src/lib/email.ts` with `sendInvitationEmail(to, inviteUrl)` wrapping Nodemailer with `SMTP_*` env vars
    - _Requirements: 5.2_
  - [~] 5.7 Apply role enforcement in `EditorPane.tsx` and all mutation Server Actions: pass `WorkspaceRole` from context; disable all write controls for VIEWER; hide workspace settings link for non-OWNER
    - _Requirements: 5.6_

- [ ] 6. Real-time Collaboration (Yjs)
  - [~] 6.1 Install `yjs`, `y-websocket`, `@tiptap/extension-collaboration`, `@tiptap/extension-collaboration-cursor` (all exact pinned versions)
    - _Requirements: 6.1_
  - [~] 6.2 Create `scripts/yjs-server.ts`: import `setupWSConnection` from `y-websocket/bin/utils`, create HTTP server, validate `bf_session` cookie on each WebSocket upgrade, persist Yjs snapshots to `YjsSnapshot` table on document update with 5-second debounce
    - _Requirements: 6.1, 6.4_
  - [~] 6.3 Update `src/features/editor/DualModeEditor.tsx` to accept an optional `yjsDoc: Y.Doc | null` prop; when provided, register `Collaboration` and `CollaborationCursor` TipTap extensions and create a `WebsocketProvider` connecting to `NEXT_PUBLIC_YJS_WS_URL`; implement exponential backoff reconnection (1 s base, 30 s max)
    - _Requirements: 6.1, 6.2, 6.5, 6.6_
  - [~] 6.4 Create `src/features/editor/AwarenessPanel.tsx` reading `provider.awareness.getStates()` and rendering a colour-coded initial avatar per connected user
    - _Requirements: 6.2_
  - [~] 6.5 Extend `src/features/editor/autosave.ts` to call `flushYjsSnapshot(chapterId, doc)` after each successful `saveChapter` autosave cycle, upserting the Yjs binary snapshot; disable optimistic-concurrency conflict detection while a Yjs session is active
    - _Requirements: 6.4, 6.6_
  - [~] 6.6 Load the existing `YjsSnapshot` snapshot (if present) when initialising the `WebsocketProvider` to restore offline changes on reconnect
    - _Requirements: 6.4_

- [ ] 7. Review Workflow (Comments & Suggest Mode)
  - [~] 7.1 Create `src/features/editor/CommentMarkExtension.ts` — custom TipTap extension storing a `commentId` attribute on a text range and rendering with a yellow highlight decoration
    - _Requirements: 7.4_
  - [~] 7.2 Add "Add Comment" button to TipTap toolbar; on click with active text selection, call `createComment` Server Action, receive `commentId`, apply `CommentMark` to the selection
    - _Requirements: 7.4_
  - [~] 7.3 Create Server Actions `createComment`, `resolveComment`, `listComments(chapterId)` in `src/app/comments/actions.ts`; `resolveComment` sets `resolvedAt`/`resolvedById` rather than deleting the row
    - _Requirements: 7.4, 7.5, 7.7_
  - [~] 7.4 Create `src/features/editor/CommentThreadPanel.tsx` displaying unresolved comments for the active chapter with author name, timestamp, body text, and "Resolve" button; include "Show resolved" toggle; add unresolved comment count badge to `ChapterCard.tsx`
    - _Requirements: 7.4, 7.6, 7.7_
  - [~] 7.5 Implement Suggest Mode: add `suggestMode` boolean to `WorkspaceProvider`; when true, wrap each autosave in a `DocumentHistory` revision with `label: "suggest"`; add TrackChanges toggle to `ToolbarBar` that sets `suggestMode`
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 8. Publishing Pipeline — Async Queue & Enhanced PDF
  - [~] 8.1 Create `scripts/worker.ts`: poll `ExportJob` table every 5 s for `PENDING` jobs using `SELECT … FOR UPDATE SKIP LOCKED`; mark `PROCESSING` before starting; dispatch to the appropriate exporter by `format`; mark `COMPLETED` with `fileSizeBytes`, `pageCount`, `completedAt`, and `outputStorageKey`; mark `FAILED` with `errorMessage` on throw; handle `SIGTERM`
    - _Requirements: 14.2, 14.3, 14.4, 14.5_
  - [~] 8.2 Create `GET /api/books/[bookId]/export/[jobId]` API route returning `{ status, downloadUrl, errorMessage, pageCount, fileSizeBytes }`; enforce workspace ownership check; `downloadUrl` is a time-limited pre-signed or signed URL valid for 15 minutes
    - _Requirements: 14.6_
  - [~] 8.3 Update all export-triggering UI to POST to `POST /api/books/[bookId]/export` (returns HTTP 202 with `{ exportJobId, pollUrl }`), then poll the status endpoint via React state
    - _Requirements: 14.1_
  - [~] 8.4 Extend `src/features/publishing/print-renderer.ts` with `renderCoverPage(book, designProfile)` generating cover page HTML with title, subtitle, author, ISBN, and optional cover image (full-bleed)
    - _Requirements: 10.1, 10.2_
  - [~] 8.5 Extend `src/features/publishing/print-renderer.ts` with `renderTableOfContents(chapters)` generating a `<nav>` TOC section; update `renderPrintHtmlDocument` to prepend cover page and TOC before chapter content; add named anchor `id="ch-{chapterId}"` to each chapter section
    - _Requirements: 10.3, 10.4, 10.5_
  - [ ] 8.6 Create `src/lib/storage.ts` with `writeExportFile(jobId, ext, buffer)` and `getDownloadUrl(jobId, ext, ttlSeconds)`: write to `output/exports/` on local disk by default; use AWS SDK v3 S3 pre-signed URL when `STORAGE_PROVIDER=s3`
    - _Requirements: 14.4, 14.6_
  - [~] 8.7 Add `worker` and `yjs-server` services to `docker-compose.yml` and `docker-compose.dev.yml`
    - _Requirements: 14.2_

- [ ] 9. EPUB 3 Export
  - [~] 9.1 Install `jszip` and `opentype.js` (exact pinned versions)
    - _Requirements: 8.1_
  - [~] 9.2 Create `src/features/publishing/epub-exporter.ts` with class `EpubExporter` and public method `export(book, chapters, designProfile, coverImageBuffer?): Promise<EpubBuildResult>` orchestrating EPUB ZIP assembly
    - _Requirements: 8.1_
  - [~] 9.3 Implement `buildMimetype()` — returns the uncompressed `mimetype` entry (`application/epub+zip`) as the first ZIP member
    - _Requirements: 8.1_
  - [~] 9.4 Implement `buildOpf(book, chapters)` — generates `content.opf` with `<manifest>`, `<spine>`, and `<metadata>` (dc:title, dc:creator, dc:language, ISBN); include `<item properties="cover-image">` and `<guide type="cover">` when cover image is present
    - _Requirements: 8.1, 8.4_
  - [~] 9.5 Implement `buildNav(chapters)` — generates `nav.xhtml` with `<nav epub:type="toc">` listing all chapters with hrefs; one `<li>` per chapter with text equal to chapter title
    - _Requirements: 8.3_
  - [~] 9.6 Implement `buildChapterXhtml(chapter)` — converts `chapter.canonicalJson` ProseMirror nodes to valid XHTML 1.1 fragments; one file per chapter
    - _Requirements: 8.1_
  - [~] 9.7 Implement `buildCss(designProfile)` — generates `styles.css` with `@font-face` declarations for Noto Serif Bengali and Noto Sans Bengali fonts from `public/fonts/`
    - _Requirements: 8.2_
  - [~] 9.8 Implement EPUB validation before delivery: verify `mimetype` is first entry, `META-INF/container.xml` exists, OPF `<manifest>` references every file, all OPF `id` attributes are unique; set `isValid = false` and `validationError` on failure
    - _Requirements: 8.5, 8.6_
  - [~] 9.9 Register EPUB export format in the worker dispatcher; add "Export EPUB" button to the editor toolbar and dashboard export menu
    - _Requirements: 8.1_

- [ ] 10. DOCX Export
  - [~] 10.1 Install `docx` npm package (exact pinned version)
    - _Requirements: 9.1_
  - [~] 10.2 Create `src/features/publishing/docx-exporter.ts` with class `DocxExporter` and public method `export(book, chapters): Promise<Buffer>`
    - _Requirements: 9.1_
  - [~] 10.3 Implement the ProseMirror-to-docx visitor: recursively walk `chapter.canonicalJson` nodes, mapping `heading`, `paragraph`, `bulletList`, `orderedList`, `codeBlock`, and all inline marks to their `docx` equivalents; map `(lang, blockType)` pairs to named styles per `STYLE_MAP`
    - _Requirements: 9.1, 9.2_
  - [~] 10.4 Set `eastAsia` font to the Bangla body font and `hAnsi`/`cs` fonts to the Latin font from `DesignProfile` in the DOCX default style; add TOC field `\o "1-3"` at document start for whole-book exports; apply `PageBreak: true` on the first paragraph of each chapter; ensure chapter titles use `Heading1` style
    - _Requirements: 9.3, 9.4_
  - [~] 10.5 Register DOCX export format in the worker dispatcher; add "Export DOCX" button to the dashboard export menu
    - _Requirements: 9.1_

- [ ] 11. Print-on-Demand Guidance & Bundle
  - [~] 11.1 Create `src/features/publishing/pod-requirements.ts` with typed constants for KDP and IngramSpark trim sizes, margin minimums, and cover specs; implement `validateDesignProfile(profile, platform)` returning `{ field, message, severity }[]`
    - _Requirements: 11.1, 11.2_
  - [~] 11.2 Create `src/features/publishing/pod-bundle.ts` with `buildPodBundle(book, pdfBuffer, publishingStatus)`: generate ONIX 3.0 XML from Book fields; if `book.isbn` is empty, include placeholder and add warning to `warningsJson`; assemble ZIP with PDF, ONIX XML, and `README.txt`
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [~] 11.3 Create `src/features/publishing/PodGuide.tsx` displaying the PoD checklist and `validateDesignProfile` warnings for the active book's design profile; add a `publishingStatus` toggle (Active/Forthcoming); add it to the publishing tab in the workspace
    - _Requirements: 11.4_

- [ ] 12. AI Writing Assistance
  - [~] 12.1 Create `src/app/ai/actions.ts` with `aiSuggest` Server Action: read `AI_PROVIDER` and `AI_API_KEY` from `process.env`; return `{ ok: false, code: "AI_DISABLED" }` when provider is `"disabled"` or key is unset; forward to OpenAI/Anthropic client otherwise; log non-2xx responses with `logger.error`
    - _Requirements: 12.1, 12.4, 12.5_
  - [~] 12.2 Create `src/app/api/ai/assist/route.ts` wrapping `aiSuggest` as a streaming `POST` endpoint using Server-Sent Events; apply rate limiter (20 req / 60 s per `userId`); return HTTP 429 with `Retry-After` header when exceeded; never expose `AI_API_KEY` to client
    - _Requirements: 12.3, 12.6_
  - [~] 12.3 Create `src/features/editor/AIAssistPanel.tsx`: toolbar button opens slide-in panel; user selects Improve / Summarize / Expand / Translate action; result shown as character-level diff (`<ins>` / `<del>` spans); Accept button calls `replaceSelection`; Discard closes panel; disable all controls and show "AI features unavailable" when `available === false`
    - _Requirements: 12.1, 12.2, 12.5_
  - [~] 12.4 Create `src/features/editor/AutocompleteExtension.ts`: TipTap extension debouncing `transaction` events by 500 ms, calling `aiSuggest({ action: "complete" })`, rendering ghost text via ProseMirror decoration; `Tab` accepts, any other key dismisses
    - _Requirements: 12.1_
  - [~] 12.5 Add `AI_PROVIDER` and `AI_API_KEY` entries to `.env.example` with explanatory comments; add both to `docker-compose.yml` environment section; add i18n keys for AI panel strings (`ai.*`) to both `bn` and `en` namespaces in `src/lib/i18n/messages.ts`
    - _Requirements: 12.5, 17.1_

- [ ] 13. Observability Integration
  - [~] 13.1 Add `startSpan` calls from `src/lib/tracing.ts` around `PdfExportService.generatePdfBuffer`, `EpubExporter.export`, `DocxExporter.export`, and chapter load/save Server Actions; log `durationMs` for `/api/books/[bookId]/export` and `/api/ai/assist` handlers
    - _Requirements: 13.3_
  - [~] 13.2 Register Prisma slow-query middleware in `src/server/db.ts` using the pattern in `src/features/observability/prisma-middleware.ts`: emit `logger.warn("db.slow_query", { model, action, durationMs })` for any query exceeding 1000 ms
    - _Requirements: 13.4_
  - [~] 13.3 Create `GET /api/metrics` route returning Prometheus text-format metrics: `bf_http_requests_total` by route and status, `bf_ws_connections_active` gauge, `bf_export_queue_depth` gauge (queries count of PENDING ExportJobs)
    - _Requirements: 13.5_
  - [~] 13.4 Create `src/components/ErrorBoundary.tsx` React error boundary whose `componentDidCatch` calls a `reportError` Server Action invoking `captureException`; wrap root layout content in `ErrorBoundary` in `src/app/layout.tsx`
    - _Requirements: 13.2_
  - [~] 13.5 Add `ERROR_MONITORING_DSN` and `OTEL_EXPORTER_OTLP_ENDPOINT` to `.env.example` with comments
    - _Requirements: 13.2, 13.3_

- [ ] 14. Mobile, Accessibility & i18n
  - [~] 14.1 Audit all new and decomposed components for missing `aria-label`, `role`, and `aria-describedby` attributes; ensure all `<input>`, `<select>`, and `<textarea>` elements have an accessible name; ensure all dialogs use `<dialog>` with `aria-modal="true"` and working focus traps
    - _Requirements: 16.1, 16.2, 16.3_
  - [~] 14.2 Ensure all interactive touch targets have `min-h-[44px] min-w-[44px]` Tailwind utilities; verify layout at 360 px viewport for horizontal overflow; add overflow menu to `ToolbarBar` for viewports below 640 px
    - _Requirements: 15.1, 15.3, 15.4_
  - [~] 14.3 Add visible keyboard focus rings to all interactive elements: `focus-visible:ring-2 focus-visible:ring-offset-2` Tailwind utilities meeting WCAG AA Focus Appearance; verify the full create-book → create-chapter → write → export workflow is completable by keyboard alone
    - _Requirements: 16.5, 16.6_
  - [~] 14.4 Replace all ad-hoc `toLocaleString` calls across the codebase with `new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", opts).format(date)` using locale from context; create a shared `formatDate(date, locale)` utility in `src/lib/i18n/format.ts`
    - _Requirements: 17.4_
  - [~] 14.5 Add all new v2 message key namespaces to `src/lib/i18n/messages.ts` for both `bn` and `en`: `sidebar`, `theme`, `focus`, `team`, `export` (extended), `ai`, `comments`, `dashboard`; verify no v2 component renders a hardcoded UI string
    - _Requirements: 17.1_
  - [~] 14.6 Create `PATCH /api/users/me/locale` API route updating `User.preferredLocale` in the DB; update `src/server/auth.ts` to read `preferredLocale` from DB on session hydration; update locale toggle in `TopBar.tsx` to call this endpoint and update React state without a full reload
    - _Requirements: 17.2, 17.3_
  - [~] 14.7 Verify that all Bangla text in the editor, Sidebar, and dashboard uses the Noto Serif Bengali or Noto Sans Bengali font loaded via `next/font`; add `font-[NotoSerifBengali]` class to all Bangla text regions
    - _Requirements: 17.5_

- [ ] 15. Test Coverage Expansion
  - [~] 15.1 Create `tests/workspace-components.test.ts`: unit tests for `BookCard` (renders title, disables buttons for VIEWER role), `ChapterCard` (renders position and word-count badge), `ModalDialog` (opens/closes, focus trap)
    - _Requirements: 18.1, 4.2_
  - [ ]* 15.2 Write property test for `computeBookStats` (Property 3)
    - **Property 3: Dashboard statistics accuracy**
    - **Validates: Requirements 3.1**
  - [~] 15.3 Create `tests/epub-exporter.test.ts`: integration test calling `EpubExporter.export()` with a two-chapter fixture; assert buffer is a valid ZIP, `mimetype` is first entry, `content.opf`, `nav.xhtml`, and two `*.xhtml` chapter files are present
    - _Requirements: 18.1, 8.1_
  - [ ]* 15.4 Write property test for EPUB structural completeness (Property 11)
    - **Property 11: EPUB structural completeness**
    - **Validates: Requirements 8.1**
  - [ ]* 15.5 Write property test for EPUB Bengali font embedding (Property 12)
    - **Property 12: EPUB Bengali font embedding**
    - **Validates: Requirements 8.2**
  - [ ]* 15.6 Write property test for EPUB TOC completeness (Property 13)
    - **Property 13: EPUB TOC completeness**
    - **Validates: Requirements 8.3**
  - [~] 15.7 Create `tests/docx-exporter.test.ts`: integration test calling `DocxExporter.export()` with a fixture containing headings, bold, italic, and Bangla text; assert the buffer is a valid DOCX ZIP and chapter section uses page-break paragraph
    - _Requirements: 18.1, 9.1_
  - [ ]* 15.8 Write property test for DOCX chapter title ordering (Property 15)
    - **Property 15: DOCX chapter title ordering**
    - **Validates: Requirements 9.4**
  - [ ]* 15.9 Write property test for DOCX style mapping correctness (Property 16)
    - **Property 16: DOCX style mapping correctness**
    - **Validates: Requirements 9.2**
  - [~] 15.10 Create `tests/export-queue.test.ts`: unit tests for worker loop with mocked Prisma client; assert PENDING → PROCESSING → COMPLETED state transitions and FAILED state on exporter throw; assert no backwards status transitions
    - _Requirements: 18.1, 14.3_
  - [ ]* 15.11 Write property test for job status monotonicity (Property 28)
    - **Property 28: Job status transitions are monotonic**
    - **Validates: Requirements 14.3, 14.4, 14.5**
  - [~] 15.12 Create `tests/yjs-collab.test.ts`: unit tests with two in-memory `Y.Doc` instances; apply concurrent inserts; exchange updates; assert merged text equality
    - _Requirements: 18.1, 6.1_
  - [~] 15.13 Create `tests/ai-actions.test.ts`: mock `fetch`; call `aiSuggest` with `AI_PROVIDER=openai`; assert result does not contain the mock API key; call with `AI_PROVIDER=disabled`; assert `{ ok: false, code: "AI_DISABLED" }`
    - _Requirements: 18.1, 12.5_
  - [ ]* 15.14 Write property test for AI rate limiting (Property 23)
    - **Property 23: AI rate limiting**
    - **Validates: Requirements 12.6**
  - [~] 15.15 Create `tests/api-routes.test.ts`: integration tests for all new API endpoints (`/api/ai/assist`, `/api/books/[bookId]/export/[jobId]`, `/api/users/me/locale`, `/api/workspaces/[id]/members`); verify HTTP 200/202 for authorised callers, HTTP 401 for unauthenticated, HTTP 403 for VIEWER-role callers on mutation endpoints
    - _Requirements: 18.2_
  - [ ]* 15.16 Write property test for VIEWER role blocking mutations (Property 5)
    - **Property 5: VIEWER role blocks all mutations**
    - **Validates: Requirements 5.6**
  - [ ]* 15.17 Write property test for invitation record creation (Property 6)
    - **Property 6: Invitation record creation**
    - **Validates: Requirements 5.2**
  - [ ]* 15.18 Write property test for request log context enrichment (Property 24)
    - **Property 24: Request log context enrichment**
    - **Validates: Requirements 13.1**
  - [~] 15.19 Verify all new and existing tests run in the GitHub Actions CI workflow (`.github/workflows/ci.yml`) without modifying the CI configuration beyond adding new test file paths; confirm non-zero exit on failure
    - _Requirements: 18.3, 18.4_

- [~] 16. Final Checkpoint
  - Ensure all tests pass and all new API endpoints return correct status codes for both authorised and unauthorised callers. Ask the user if questions arise.

## Notes

- Pin all new npm dependencies to exact versions in `package.json` before committing.
- Run `prisma migrate dev` locally after each schema change in task group 1; commit the generated migration file.
- The Yjs WebSocket server (`scripts/yjs-server.ts`) and background worker (`scripts/worker.ts`) run as separate Node.js processes. Do NOT import them from the Next.js module graph.
- When `AI_PROVIDER` is absent or set to `"disabled"`, all AI-related code paths MUST be no-ops; no network calls are made and no errors are thrown.
- EPUB font subsetting (task 9.8 in the original plan) is a nice-to-have optimisation; skip it if `opentype.js` subsetting proves complex — include full font files and note it as a follow-up.
- WCAG AA contrast ratios for the dark theme (task 2.13) MUST be verified against a contrast checker before the theme PR is merged; failing values MUST be adjusted, not documented as known issues.
- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation.
- Property tests validate universal correctness properties defined in the design document.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5"] },
    { "id": 2, "tasks": ["1.6", "1.7", "1.8", "1.9", "1.10"] },
    { "id": 3, "tasks": ["2.1", "2.2", "2.13", "2.14", "8.6"] },
    { "id": 4, "tasks": ["2.3", "2.4", "2.5", "2.6", "2.7", "2.8", "2.9", "2.10", "9.1", "10.1", "11.1", "12.5", "13.5"] },
    { "id": 5, "tasks": ["2.11", "2.12", "2.15", "3.1", "4.1", "5.6", "8.1", "8.4", "8.5", "9.2", "10.2", "11.2", "12.1", "12.2", "13.2", "13.3", "13.5"] },
    { "id": 6, "tasks": ["3.2", "3.3", "3.4", "3.5", "4.2", "4.3", "4.4", "5.1", "5.2", "5.3", "5.4", "5.5", "5.7", "8.2", "8.3", "8.7", "9.3", "9.4", "9.5", "9.6", "9.7", "10.3", "11.3", "12.3", "12.4", "13.1", "13.4"] },
    { "id": 7, "tasks": ["6.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "7.1", "9.8", "9.9", "10.4", "10.5", "14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7"] },
    { "id": 9, "tasks": ["6.4", "6.5", "6.6", "7.2", "7.3"] },
    { "id": 10, "tasks": ["7.4", "7.5"] },
    { "id": 11, "tasks": ["15.1", "15.3", "15.7", "15.10", "15.12", "15.13", "15.15"] },
    { "id": 12, "tasks": ["15.2", "15.4", "15.5", "15.6", "15.8", "15.9", "15.11", "15.14", "15.16", "15.17", "15.18"] },
    { "id": 13, "tasks": ["15.19"] }
  ]
}
```
