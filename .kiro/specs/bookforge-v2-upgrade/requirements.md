# Requirements Document

## Introduction

BookForge v2 is a comprehensive upgrade of the existing bilingual (Bangla + English) book writing and publishing web application. The v1.0 baseline is fully operational across 14 verified phases: authentication, book/chapter CRUD, TipTap + CodeMirror dual-mode editor, print design profiles, synchronous PDF export via puppeteer-core, Markdown/DOCX/ZIP import, revision history, media uploads, and Docker-based deployment.

v2 delivers eight interconnected upgrade areas on top of that baseline without breaking existing functionality:

1. **UI/UX Overhaul** — Notion-style sidebar navigation, pro dark/light themes, distraction-free writing mode, publisher analytics dashboard, and decomposition of the monolithic `src/components/workspace.tsx` into focused, testable components.
2. **Collaboration & Multi-user** — Team invitation by email (leveraging the existing `WorkspaceMember` schema with OWNER/EDITOR/VIEWER roles), real-time co-editing via Yjs + WebSocket, and a review workflow with inline comments and tracked changes.
3. **Publishing Pipeline Expansion** — EPUB 3 export, DOCX export, print-on-demand metadata bundles (IngramSpark/KDP), improved PDF with cover page, auto-generated table of contents, and bookmarks.
4. **AI Writing Assistance** — Contextual suggestions, autocomplete, and translation-aid for bilingual content, routed through a server-side proxy to an LLM provider.
5. **Observability** — Structured logging enrichment, error monitoring integration (e.g., Sentry-compatible), and performance tracing for slow API paths.
6. **Background Job Queue** — Asynchronous processing of PDF and EPUB export jobs (currently blocking the request thread) using a persistent queue backed by the existing `ExportJob` table.
7. **Mobile-responsive UI and Accessibility** — WCAG 2.1 AA compliance, responsive layouts for tablet and mobile viewports, and keyboard-navigable components.
8. **Internationalization Improvements** — Replace hardcoded locale branches with a centralised i18n dictionary covering all new v2 UI strings, and support user-level locale preference persistence.

## Glossary

- **System**: The BookForge v2 web application server and its client-side React components collectively.
- **Workspace**: A named tenant boundary (existing `workspaces` table) that contains members, books, chapters, assets, and export jobs.
- **WorkspaceMember**: A user-to-workspace association with a `WorkspaceRole` of OWNER, EDITOR, or VIEWER (existing `workspace_members` table).
- **Book**: A publishable document consisting of ordered Parts and Chapters (existing `books` table).
- **Chapter**: A single content unit within a Book, stored as Markdown and canonical JSON (existing `chapters` table).
- **ExportJob**: A persistent record of a requested export operation with status PENDING → PROCESSING → COMPLETED | FAILED (existing `export_jobs` table).
- **DesignProfile**: A reusable print/typography configuration associated with a Workspace (existing `design_profiles` table).
- **Locale**: One of `"bn"` (Bangla) or `"en"` (English), corresponding to the `User.preferredLocale` field.
- **Sidebar**: The persistent left-side navigation panel listing workspaces, books, and chapters.
- **DistractFreeMode**: A full-screen, chrome-hidden writing mode that surfaces only the editor canvas and an autosave indicator.
- **PublisherDashboard**: A dedicated view displaying writing-progress statistics, export history, and word-count analytics per book.
- **YjsDocument**: A Conflict-free Replicated Data Type (CRDT) document managed by the Yjs library, used for real-time co-editing.
- **JobQueue**: A server-side queue that picks up PENDING ExportJobs and processes them asynchronously outside the HTTP request lifecycle.
- **AIAssistant**: A server-side proxy component that forwards writing-assist requests to a configured LLM API endpoint and streams responses back to the client.
- **TrackChanges**: An editor extension that records each contributor's insertions and deletions as annotated spans, allowing review and acceptance or rejection.
- **InlineComment**: A content-anchored annotation attached to a selection within a Chapter, visible to EDITOR and OWNER members.
- **EPUB3**: The EPUB 3.3 standard ebook container format produced by the publishing pipeline.
- **DOCXExport**: A Microsoft Word `.docx` file produced by the publishing pipeline.
- **CoverPage**: A designed first page of an exported PDF or EPUB that includes the book title, subtitle, author name, and optionally a cover image asset.
- **TOC**: Auto-generated Table of Contents derived from Chapter headings, embedded in PDF (bookmarks), EPUB (nav document), and DOCX (Word field).
- **RateLimit**: Request-frequency throttling applied per IP or per authenticated user to prevent abuse.
- **WCAG 2.1 AA**: Web Content Accessibility Guidelines version 2.1, conformance level AA.
- **Sentry-compatible**: An error-monitoring integration that emits events in the Sentry envelope format, compatible with self-hosted Sentry or Glitchtip.

---

## Requirements

### Requirement 1: UI/UX Overhaul — Persistent Sidebar Navigation

**User Story:** As a writer, I want a persistent, collapsible sidebar that shows my workspaces, books, and chapters so that I can navigate without losing my current editing position.

#### Acceptance Criteria

1. THE System SHALL render a collapsible left-side Sidebar on all authenticated routes displaying the active Workspace name, a list of Books, and — when a Book is expanded — its ordered Chapter list.
2. WHEN the user collapses the Sidebar, THE System SHALL persist the collapsed state in `localStorage` and restore it on the next page load.
3. WHEN a Chapter is selected in the Sidebar, THE System SHALL navigate to the chapter editor route without performing a full page reload.
4. WHILE the Sidebar is visible, THE System SHALL highlight the currently active Book and Chapter entry with a distinct visual indicator.
5. THE System SHALL render the Sidebar layout correctly on viewport widths of 768 px and above, and SHALL collapse the Sidebar to a slide-over drawer on viewport widths below 768 px.

### Requirement 2: UI/UX Overhaul — Dark/Light Theme and Distraction-Free Mode

**User Story:** As a writer, I want switchable dark and light themes and a distraction-free writing mode so that I can adapt the interface to my environment and focus deeply on my manuscript.

#### Acceptance Criteria

1. THE System SHALL provide a theme toggle control accessible from the application header that switches between "light", "dark", and "system" (OS preference) modes.
2. WHEN the user selects a theme, THE System SHALL persist the selection in `localStorage` and apply it on subsequent sessions without a flash of unstyled content.
3. THE System SHALL apply the active theme using Tailwind CSS v4 CSS custom properties so that all components — including editor surfaces, sidebar, and dialogs — reflect the chosen colours.
4. THE System SHALL provide a "Distraction-Free Mode" toggle in the editor toolbar that hides the Sidebar, application header, and all secondary controls, leaving only the editor canvas and the autosave status indicator visible.
5. WHEN Distraction-Free Mode is active, THE System SHALL restore all hidden UI elements when the user presses the `Escape` key or clicks a visible exit control.
6. THE System SHALL ensure all interactive controls in both themes meet the WCAG 2.1 AA minimum colour contrast ratio of 4.5:1 for normal text and 3:1 for large text and UI components.

### Requirement 3: UI/UX Overhaul — Publisher Analytics Dashboard

**User Story:** As a publisher, I want a dashboard view with writing-progress statistics so that I can monitor manuscript completion, word-count trends, and export history.

#### Acceptance Criteria

1. THE System SHALL provide a PublisherDashboard route at `/dashboard` that displays, for each Book in the active Workspace: total word count, chapter count, target word count, progress percentage towards the target, and last-modified date.
2. WHEN a Book's word count changes due to a chapter save, THE System SHALL update the PublisherDashboard statistics within 60 seconds of the save completing.
3. THE System SHALL display an export history table on the PublisherDashboard showing the last 20 ExportJob records for the active Workspace with columns: format, scope, status, file size (bytes), page count, and creation timestamp.
4. THE System SHALL render the PublisherDashboard layout responsively so that all data tables and metric cards reflow correctly at viewport widths of 320 px and above.

### Requirement 4: UI/UX Overhaul — Workspace Component Decomposition

**User Story:** As a developer, I want `src/components/workspace.tsx` decomposed into focused, single-responsibility components so that the codebase is maintainable and individually testable.

#### Acceptance Criteria

1. THE System SHALL replace the monolithic `src/components/workspace.tsx` with a minimum of six focused components: `SidebarNav`, `BookList`, `ChapterList`, `EditorContainer`, `ToolbarBar`, and `DialogManager`.
2. THE System SHALL ensure each decomposed component exports only its own props type and does not import the full `Workspace` state object.
3. THE System SHALL maintain full feature parity with the existing `workspace.tsx` behaviour after decomposition, verified by the existing test suite passing without modification to test files.

### Requirement 5: Collaboration — Team Invitation and Role Management

**User Story:** As a workspace owner, I want to invite collaborators by email and assign them roles so that my team can contribute to books with appropriate permissions.

#### Acceptance Criteria

1. THE System SHALL provide a Workspace Settings UI at `/settings/members` where a WorkspaceMember with role OWNER can enter an email address and select a role (EDITOR or VIEWER) to send an invitation.
2. WHEN the OWNER submits an invitation, THE System SHALL create a pending invitation record and send an invitation email to the specified address containing a single-use acceptance link that expires after 72 hours.
3. WHEN an invited user clicks the acceptance link, THE System SHALL create a `WorkspaceMember` record with the assigned role and redirect the user to the Workspace dashboard.
4. WHEN an invited user's email already has a `WorkspaceMember` record for the same Workspace, THE System SHALL return an error response with HTTP status 409 and SHALL NOT create a duplicate record.
5. THE System SHALL allow a WorkspaceMember with role OWNER to change any other member's role or remove any non-OWNER member from the Workspace via the `/settings/members` UI.
6. WHILE a user's WorkspaceMember role is VIEWER, THE System SHALL prevent any mutation API call (chapter save, book create, chapter create, import) from succeeding and SHALL return HTTP status 403.

### Requirement 6: Collaboration — Real-Time Co-editing

**User Story:** As a collaborator, I want to see other editors' cursors and changes appear in real time so that we can work on the same chapter simultaneously without conflicts.

#### Acceptance Criteria

1. THE System SHALL integrate Yjs to provide a YjsDocument for each Chapter, synchronised over a WebSocket endpoint at `/api/collab/[chapterId]`.
2. WHEN two or more WorkspaceMembers with role OWNER or EDITOR open the same Chapter, THE System SHALL display each collaborator's named cursor in a distinct colour within the editor canvas.
3. WHEN a collaborator makes a text change, THE System SHALL propagate the change to all other connected clients within 500 ms under normal network conditions.
4. WHEN a collaborator disconnects, THE System SHALL persist the current YjsDocument state to the Chapter's `canonicalJson` field within 5 seconds of the disconnect.
5. IF the WebSocket connection is interrupted, THE System SHALL attempt reconnection with exponential backoff starting at 1 second, up to a maximum of 30 seconds between attempts.
6. WHILE a Chapter is open for real-time co-editing, THE System SHALL disable the existing optimistic-concurrency conflict detection to prevent false conflict alerts.

### Requirement 7: Collaboration — Review Workflow with Comments and Track Changes

**User Story:** As an editor, I want to leave inline comments and track my changes so that authors can review, accept, or reject contributions before publishing.

#### Acceptance Criteria

1. THE System SHALL provide a TrackChanges toggle in the editor toolbar that, when enabled, marks each insertion and deletion with the contributing WorkspaceMember's identity and timestamp.
2. WHEN TrackChanges is active and a WorkspaceMember with role EDITOR makes a text change, THE System SHALL record the change as a tracked annotation rather than modifying the canonical text directly.
3. THE System SHALL allow a WorkspaceMember with role OWNER to accept or reject individual tracked changes, which SHALL update the canonical Chapter content accordingly.
4. THE System SHALL allow any WorkspaceMember with role OWNER or EDITOR to create an InlineComment anchored to a selected text range within a Chapter.
5. WHEN an InlineComment is created, THE System SHALL store the comment text, the anchor range (start offset, end offset), the author's user ID, and the creation timestamp.
6. THE System SHALL display a resolved and unresolved InlineComment count badge on each Chapter entry in the Sidebar.
7. THE System SHALL allow any WorkspaceMember with role OWNER or EDITOR to mark an InlineComment as resolved, which SHALL hide the comment from the default view but retain it in the history.

### Requirement 8: Publishing Pipeline — EPUB 3 Export

**User Story:** As an author, I want to export my book as an EPUB 3 ebook so that readers can open it on e-readers and reading apps.

#### Acceptance Criteria

1. THE System SHALL generate a valid EPUB3 container for a Book when the user requests an EPUB export, including the required OPF package document, NCX navigation, and XHTML content files per chapter.
2. THE System SHALL embed the Noto Serif Bengali and Noto Sans Bengali fonts in the EPUB3 container when the Book's primary language is `"bn"`, so that text renders correctly on e-readers without system font dependencies.
3. THE System SHALL include a generated TOC as the EPUB3 `nav.xhtml` document derived from Chapter titles and any heading nodes (`h1`–`h3`) within chapter content.
4. WHEN a CoverPage asset is associated with the Book, THE System SHALL include a `<guide type="cover">` reference and an OPF `<item>` for the cover image in the EPUB3 package.
5. THE System SHALL validate the generated EPUB3 archive against the EPUB 3.3 structural rules (valid OPF, unique identifiers, correct media types) before delivering the file to the client.
6. WHEN EPUB generation fails validation, THE System SHALL record the failure in the ExportJob with `status: "FAILED"` and `errorMessage` containing the first validation error encountered.

### Requirement 9: Publishing Pipeline — DOCX Export

**User Story:** As an author, I want to export my book or a single chapter as a Microsoft Word document so that collaborators without the application can edit or review the manuscript.

#### Acceptance Criteria

1. THE System SHALL produce a `.docx` file for a Book or individual Chapter export request by converting the Chapter's `canonicalJson` content to Word paragraph and run elements using the OOXML format.
2. THE System SHALL map Bangla and Latin text runs to the correct named styles (`BanglaBody`, `BanglaHeading1`–`BanglaHeading3`, `LatinBody`, `LatinHeading1`–`LatinHeading3`) defined in the generated document's styles part.
3. THE System SHALL embed an auto-generated TOC field (`\o "1-3"`) at the beginning of a whole-book DOCX export so that Microsoft Word can populate the table of contents on document open.
4. WHEN a DOCX export is requested for a Book with more than 0 chapters, THE System SHALL include each chapter's title as a `Heading1` paragraph followed by the chapter body content in document order.

### Requirement 10: Publishing Pipeline — Improved PDF with Cover, TOC, and Bookmarks

**User Story:** As a publisher, I want exported PDFs to include a designed cover page, a linked table of contents, and PDF bookmarks so that readers can navigate the book professionally.

#### Acceptance Criteria

1. WHEN a full-book PDF export is requested, THE System SHALL render a CoverPage as the first page of the PDF containing the Book's title, subtitle (if present), and author name styled using the active DesignProfile typography.
2. WHEN a CoverPage asset (image) is associated with the Book, THE System SHALL include the image on the CoverPage at full bleed within the page dimensions defined by the DesignProfile.
3. THE System SHALL generate a printable TOC page after the CoverPage and before Chapter content, listing each chapter's title and its starting page number, formatted using the active DesignProfile.
4. THE System SHALL embed named PDF destination anchors for each Chapter heading so that PDF viewer bookmark panels display the chapter structure as a navigable outline.
5. THE System SHALL apply the DesignProfile's `runningHeaderLeft` and `runningHeaderRight` fields as running headers on all body pages of the PDF export.

### Requirement 11: Publishing Pipeline — Print-on-Demand Metadata Bundle

**User Story:** As an author, I want to generate a print-on-demand metadata package so that I can submit my book to IngramSpark or Amazon KDP without manually reformatting metadata.

#### Acceptance Criteria

1. THE System SHALL produce a print-on-demand metadata bundle as a ZIP archive containing: the PDF export, a metadata XML file conforming to the ONIX 3.0 short-tag format, and a `README.txt` with submission instructions.
2. THE System SHALL populate the ONIX 3.0 metadata file from the Book fields: `title`, `subtitle`, `author`, `isbn`, `language`, `description`, and the DesignProfile's `pageSize`.
3. WHEN the Book's `isbn` field is empty, THE System SHALL include a placeholder `<ProductIdentifier>` element in the ONIX file and SHALL add a warning to the ExportJob's `warningsJson` indicating the ISBN is missing.
4. THE System SHALL set the ONIX `<PublishingStatus>` to `"04"` (Active) by default and SHALL expose a UI toggle to switch it to `"02"` (Forthcoming) before generating the bundle.

### Requirement 12: AI Writing Assistance

**User Story:** As a writer, I want contextual AI writing suggestions and translation help so that I can overcome writer's block and maintain bilingual consistency.

#### Acceptance Criteria

1. THE System SHALL provide an AIAssistant panel in the editor that accepts a user-submitted prompt and returns a streamed text completion from a configured LLM API endpoint.
2. WHEN the user selects text in the editor and invokes the "Translate" AI action, THE System SHALL submit the selected text and the target Locale to the AIAssistant and insert the returned translation at the cursor position or replace the selection.
3. THE System SHALL route all AIAssistant requests through a server-side API endpoint at `/api/ai/assist` and SHALL NOT expose the LLM provider API key to the client.
4. WHEN the LLM provider API returns a non-2xx response, THE System SHALL display an error message in the AIAssistant panel and SHALL log the failure with `logger.error` including the HTTP status code.
5. WHERE the `AI_PROVIDER_API_KEY` environment variable is not set, THE System SHALL disable all AIAssistant UI controls and display a "AI features unavailable" notice in the AIAssistant panel.
6. THE System SHALL apply a RateLimit of 20 AIAssistant requests per authenticated user per 60-second window, returning HTTP 429 when the limit is exceeded.

### Requirement 13: Observability — Structured Logging, Error Monitoring, and Tracing

**User Story:** As an operator, I want structured logs, error monitoring events, and performance traces so that I can diagnose production issues quickly.

#### Acceptance Criteria

1. THE System SHALL enrich every server-side log entry produced by `logger` with a `requestId` field matching the request-ID header set by `middleware.ts`, a `workspaceId` field when a Workspace context is available, and a `userId` field when an authenticated session is active.
2. WHEN an unhandled exception propagates to a Next.js API route handler, THE System SHALL capture the exception via the Sentry-compatible SDK and emit it as a Sentry envelope event including the stack trace, requestId, and userId.
3. THE System SHALL instrument API route handlers for `/api/books/[bookId]/export`, `/api/ai/assist`, and `/api/collab/[chapterId]` with a performance span that records the handler execution duration in milliseconds as a log field named `durationMs`.
4. WHEN a database query executed via Prisma takes longer than 1000 ms, THE System SHALL emit a `warn`-level log entry containing the query model name, operation, and `durationMs`.
5. THE System SHALL expose a Prometheus-compatible `/api/metrics` endpoint that reports: total HTTP request count by route and status code, active WebSocket connection count, and job queue depth (count of PENDING ExportJobs).

### Requirement 14: Background Job Queue for Exports

**User Story:** As a user, I want export jobs to process asynchronously so that large book exports do not block the browser or time out the HTTP connection.

#### Acceptance Criteria

1. WHEN a user requests a PDF, EPUB, or DOCX export, THE System SHALL immediately create an ExportJob record with `status: "PENDING"` and return HTTP 202 with the `exportJobId` in the response body.
2. THE System SHALL run a JobQueue worker process that polls the `export_jobs` table for PENDING jobs at an interval of no more than 10 seconds and processes each job to completion, updating `status` to PROCESSING, then COMPLETED or FAILED.
3. WHEN the JobQueue worker begins processing an ExportJob, THE System SHALL update the job's `status` to `"PROCESSING"` before invoking the export function, preventing duplicate processing if a second worker polls concurrently.
4. WHEN the export function completes successfully, THE System SHALL set `status: "COMPLETED"`, record `fileSizeBytes`, `pageCount` (for PDF), and `completedAt` on the ExportJob record, and store the output file so it is retrievable via a signed download URL.
5. WHEN the export function throws an unhandled error, THE System SHALL set `status: "FAILED"` and record the error message in `errorMessage`, then emit a `logger.error` entry with the `exportJobId` and error details.
6. THE System SHALL provide a `/api/books/[bookId]/export/[jobId]` endpoint that returns the ExportJob's current `status`, and — when status is COMPLETED — a time-limited download URL valid for 15 minutes.
7. THE System SHALL provide a polling UI component in the PublisherDashboard that checks job status every 3 seconds and displays a progress indicator while an export is PROCESSING.

### Requirement 15: Mobile-Responsive UI

**User Story:** As a writer using a tablet or phone, I want the application to adapt its layout to my screen size so that I can read and make light edits comfortably.

#### Acceptance Criteria

1. THE System SHALL render all pages using a fluid, responsive CSS layout so that no horizontal scrollbar appears on any page at viewport widths from 320 px to 1920 px.
2. THE System SHALL present the Sidebar as a slide-over drawer triggered by a visible menu button on viewport widths below 768 px, and as a fixed left panel on 768 px and above.
3. THE System SHALL ensure all interactive touch targets (buttons, links, form controls) have a minimum hit area of 44 × 44 CSS pixels on mobile viewports.
4. THE System SHALL display the editor toolbar in a compact, scrollable single row on viewport widths below 640 px, with overflow items accessible via a "more options" overflow menu.

### Requirement 16: Accessibility (WCAG 2.1 AA)

**User Story:** As a user relying on assistive technology, I want the application to meet WCAG 2.1 AA standards so that I can use it with a screen reader and keyboard navigation.

#### Acceptance Criteria

1. THE System SHALL assign correct ARIA landmark roles (`main`, `navigation`, `complementary`, `banner`, `contentinfo`) to all top-level layout regions.
2. THE System SHALL ensure all form inputs, buttons, and custom controls have an accessible name provided by a `<label>`, `aria-label`, or `aria-labelledby` attribute.
3. THE System SHALL ensure all dialog elements use the native `<dialog>` element or a component with `role="dialog"`, `aria-modal="true"`, and focus management that traps focus within the dialog while it is open.
4. WHEN a status notification (autosave indicator, error banner, or success toast) appears, THE System SHALL use an ARIA live region (`aria-live="polite"` or `"assertive"` as appropriate) to announce the message to screen readers.
5. THE System SHALL provide a visible keyboard focus indicator on all interactive elements that meets the WCAG 2.1 AA Focus Appearance (minimum) requirement of a focus ring with at least 2 CSS pixels offset.
6. THE System SHALL ensure the complete primary user workflow (create book → create chapter → write content → export) is completable using keyboard navigation alone, without requiring a pointing device.

### Requirement 17: Internationalization Improvements

**User Story:** As a developer, I want all UI strings — including those from new v2 features — registered in the centralised i18n dictionary so that no text is hardcoded in components.

#### Acceptance Criteria

1. THE System SHALL extend `src/lib/i18n/messages.ts` with Bangla and English translations for all new v2 UI strings introduced by requirements 1–16, ensuring no v2 component renders a hardcoded string outside the i18n dictionary.
2. THE System SHALL persist the authenticated user's Locale preference in the `User.preferredLocale` database field and load it from the server on session hydration rather than relying solely on browser `Accept-Language`.
3. WHEN the user changes their Locale via the UI toggle, THE System SHALL update `User.preferredLocale` via a PATCH request to `/api/users/me/locale` and re-render affected UI strings without a full page reload.
4. THE System SHALL format all date and number values displayed in the UI using the active Locale's conventions (e.g., Bangla digit characters for `"bn"`, ISO date formatting for `"en"`).
5. THE System SHALL ensure that all Bangla text rendered by the editor, Sidebar, and dashboard uses the Noto Serif Bengali or Noto Sans Bengali font loaded via `next/font` to guarantee consistent rendering across platforms.

### Requirement 18: Test Coverage Expansion

**User Story:** As a developer, I want test coverage for all new v2 features so that regressions are caught before production deployment.

#### Acceptance Criteria

1. THE System SHALL include unit tests for each new server-side module introduced by v2 (EPUB generator, DOCX exporter, AI proxy handler, job queue worker, invitation service, Yjs persistence hook) with at least one passing test and one failure/edge-case test per module.
2. THE System SHALL include integration tests for each new API endpoint introduced by v2 (`/api/ai/assist`, `/api/collab/[chapterId]`, `/api/books/[bookId]/export/[jobId]`, `/api/users/me/locale`, `/api/workspaces/[id]/members`) that verify correct HTTP status codes for both authorised and unauthorised callers.
3. THE System SHALL run all new and existing tests in the GitHub Actions CI workflow defined in `.github/workflows/ci.yml` without modifying the existing CI configuration beyond adding new test file paths.
4. WHEN any new test in the test suite fails, THE System SHALL cause the CI build to exit with a non-zero status code, blocking merge to the main branch.
