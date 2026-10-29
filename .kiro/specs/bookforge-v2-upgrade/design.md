# Design Document

## Overview

BookForge v2 is an incremental, non-breaking upgrade layered on top of the v1.0 baseline. The architecture preserves the existing Next.js 15 App Router structure, Prisma 7 + PostgreSQL data layer, and scrypt session-auth, while adding eight new vertical slices: UI/UX overhaul, collaboration, publishing pipeline expansion, AI assistance, observability, background job queue, mobile/accessibility, and i18n improvements.

The central design principle is **vertical slice isolation**: each new capability lives in its own feature directory under `src/features/` and exposes a narrow API surface to the rest of the app. Shared primitives (logger, i18n, auth, db) are extended in place rather than replaced.

---

## Architecture

### High-Level Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js 15 App Router (src/app/)                               │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐   │
│  │  /dashboard  │  │  /books/[id]  │  │  /settings/members │   │
│  └──────┬───────┘  └──────┬────────┘  └────────┬───────────┘   │
│         └─────────────────┴───────────────────┘                 │
│                    React Client Shell                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  AppShell                                                │   │
│  │  ├── SidebarNav (collapsible, responsive)                │   │
│  │  ├── HeaderBar (theme toggle, locale, user menu)         │   │
│  │  └── MainContent                                         │   │
│  │       ├── PublisherDashboard (stats, export history)     │   │
│  │       ├── EditorContainer                                │   │
│  │       │    ├── ToolbarBar                                │   │
│  │       │    ├── DualModeEditor (TipTap / CodeMirror)      │   │
│  │       │    │    └── YjsBinding (real-time collab)        │   │
│  │       │    ├── TrackChangesPanel                         │   │
│  │       │    ├── InlineCommentLayer                        │   │
│  │       │    └── AIAssistantPanel                          │   │
│  │       ├── BookList / ChapterList                         │   │
│  │       └── DialogManager                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │  HTTP / WebSocket
┌────────────────────────────▼────────────────────────────────────┐
│  Next.js API Routes (src/app/api/)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  /auth/*     │  │  /books/*    │  │  /collab/[chapterId]  │ │
│  │  /users/me/* │  │  /ai/assist  │  │  (Yjs WebSocket)      │ │
│  │  /workspaces/│  │  /metrics    │  └───────────────────────┘ │
│  │  [id]/members│  └──────────────┘                            │
│  └──────────────┘                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │  Prisma 7
┌────────────────────────────▼────────────────────────────────────┐
│  PostgreSQL (existing schema + v2 migrations)                   │
│  users · sessions · workspaces · workspace_members              │
│  books · parts · chapters · document_history                    │
│  export_jobs · assets · import_logs · design_profiles           │
│  + NEW: workspace_invitations · inline_comments                 │
└─────────────────────────────────────────────────────────────────┘
                             │  Background
┌────────────────────────────▼────────────────────────────────────┐
│  JobQueue Worker (src/features/jobs/worker.ts)                  │
│  Polls export_jobs every 5s → PDF / EPUB / DOCX / PoD bundle   │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Flow

```
src/app/        → src/features/  → src/server/   → Prisma → PostgreSQL
                                → src/lib/
src/components/ → src/features/  → src/lib/
src/features/jobs/worker.ts      → src/features/publishing/
                                 → src/lib/logger
```

No circular dependencies. `src/server/` and `src/lib/` never import from `src/app/` or `src/components/`.

---

## New Feature Directories

```
src/
  features/
    collaboration/
      yjs-server.ts          # Yjs WebSocket server handler (hocuspocus or y-websocket)
      yjs-persistence.ts     # Persist YDoc to Chapter.canonicalJson on disconnect
      track-changes.ts       # TipTap extension: annotated insertions/deletions
      inline-comments.ts     # Create/resolve InlineComment records
      invitation.ts          # Send/accept workspace invitations
    publishing/
      epub-generator.ts      # EPUB 3 container builder
      docx-exporter.ts       # OOXML .docx builder
      pdf-cover.ts           # CoverPage + TOC HTML injection for Puppeteer PDF
      pod-bundle.ts          # Print-on-demand ZIP + ONIX 3.0 metadata
      (existing pdf-exporter.ts, print-renderer.ts retained)
    ai/
      ai-proxy.ts            # Server-side LLM streaming proxy
      rate-limiter.ts        # Per-user sliding-window rate limiter
    jobs/
      worker.ts              # Polling job queue processor
      dispatcher.ts          # Enqueue export jobs and return 202
      file-store.ts          # Write completed export to disk/object storage
    observability/
      sentry.ts              # Sentry-compatible error capture
      metrics.ts             # Prometheus counter/gauge registry
      prisma-middleware.ts   # Slow-query logger
    i18n/
      (extend existing src/lib/i18n/messages.ts in place)
  components/
    layout/
      AppShell.tsx
      SidebarNav.tsx
      HeaderBar.tsx
    workspace/
      BookList.tsx
      ChapterList.tsx
      EditorContainer.tsx
      ToolbarBar.tsx
      DialogManager.tsx
    dashboard/
      PublisherDashboard.tsx
      ExportHistoryTable.tsx
      BookStatsCard.tsx
      ExportStatusPoller.tsx
    collaboration/
      TrackChangesPanel.tsx
      InlineCommentLayer.tsx
      CollaboratorCursors.tsx
    ai/
      AIAssistantPanel.tsx
    settings/
      MembersList.tsx
      InviteMemberForm.tsx
```

---

## Database Schema Extensions

Two new tables are required. All existing tables remain unchanged.

### `workspace_invitations`

```sql
CREATE TABLE workspace_invitations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  invited_email    TEXT NOT NULL,
  role             workspace_role NOT NULL DEFAULT 'EDITOR',
  token_hash       TEXT NOT NULL UNIQUE,   -- SHA-256 of single-use token
  expires_at       TIMESTAMPTZ NOT NULL,
  accepted_at      TIMESTAMPTZ,
  created_by_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON workspace_invitations(workspace_id);
CREATE INDEX ON workspace_invitations(expires_at);
```

### `inline_comments`

```sql
CREATE TABLE inline_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  chapter_id      UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  text            TEXT NOT NULL,
  anchor_start    INT NOT NULL,
  anchor_end      INT NOT NULL,
  resolved_at     TIMESTAMPTZ,
  resolved_by_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX ON inline_comments(chapter_id);
CREATE INDEX ON inline_comments(workspace_id, chapter_id);
```

### `ExportJob` additions (alter existing table)

Add a `format` column to differentiate PDF / EPUB / DOCX / POD:

```sql
ALTER TABLE export_jobs
  ADD COLUMN format TEXT NOT NULL DEFAULT 'PDF',
  ADD COLUMN output_storage_key TEXT;
```

---

## Components and Interfaces

### AppShell

```typescript
// src/components/layout/AppShell.tsx
interface AppShellProps {
  locale: Locale;
  userId: string;
  workspaceId: string;
  children: React.ReactNode;
}
```

Renders the persistent three-column shell: `<SidebarNav>` (left), `<main>` (center), optional right panel. Manages sidebar collapsed state via `localStorage` under key `bf:sidebar:collapsed`.

### SidebarNav

```typescript
// src/components/layout/SidebarNav.tsx
interface SidebarNavProps {
  workspaceId: string;
  books: BookSummary[];
  activeBookId: string | null;
  activeChapterId: string | null;
  locale: Locale;
  collapsed: boolean;
  onCollapse: (next: boolean) => void;
}
```

On viewports ≥ 768 px: fixed left panel. On < 768 px: slide-over drawer triggered by a hamburger button in `HeaderBar`. Uses `<nav aria-label="Sidebar navigation">` landmark.

### EditorContainer

```typescript
// src/components/workspace/EditorContainer.tsx
interface EditorContainerProps {
  chapterId: string;
  bookId: string;
  workspaceId: string;
  locale: Locale;
  memberRole: WorkspaceRole;
  distractFreeMode: boolean;
  onExitDistractFree: () => void;
}
```

Owns the TipTap editor instance, Yjs binding, and autosave timer. Delegates rendering to `ToolbarBar`, `DualModeEditor`, `TrackChangesPanel`, `InlineCommentLayer`, and `AIAssistantPanel`.

### ToolbarBar

```typescript
// src/components/workspace/ToolbarBar.tsx
interface ToolbarBarProps {
  editor: Editor;           // TipTap Editor instance
  locale: Locale;
  memberRole: WorkspaceRole;
  trackChangesEnabled: boolean;
  onToggleTrackChanges: () => void;
  onToggleDistractFree: () => void;
  onTriggerExport: (format: ExportFormat) => void;
}

type ExportFormat = "PDF" | "EPUB" | "DOCX" | "POD";
```

On viewports < 640 px, groups secondary actions behind a `⋯` overflow menu button (`aria-label="More options"`).

### DialogManager

```typescript
// src/components/workspace/DialogManager.tsx
type DialogKind =
  | "createBook" | "renameBook" | "deleteBook"
  | "createChapter" | "renameChapter" | "deleteChapter"
  | "inviteMember" | "manageMembers";

interface DialogManagerProps {
  open: DialogKind | null;
  onClose: () => void;
  context: DialogContext;
}
```

All dialogs are native `<dialog>` elements with `aria-modal="true"` and focus trap using the `@radix-ui/react-focus-scope` pattern (or equivalent inert-based approach).

### PublisherDashboard

```typescript
// src/components/dashboard/PublisherDashboard.tsx
interface BookStats {
  bookId: string;
  title: string;
  totalWordCount: number;
  chapterCount: number;
  targetWordCount: number;
  progressPct: number;      // (totalWordCount / targetWordCount) * 100, capped at 100
  lastModifiedAt: Date;
}

interface PublisherDashboardProps {
  stats: BookStats[];
  exportHistory: ExportJobSummary[];
  locale: Locale;
}
```

### AIAssistantPanel

```typescript
// src/components/ai/AIAssistantPanel.tsx
interface AIAssistantPanelProps {
  editor: Editor;
  locale: Locale;
  chapterId: string;
  available: boolean;    // false when AI_PROVIDER_API_KEY is not set
}
```

Streams responses from `/api/ai/assist` using the Fetch Streams API. Renders in a collapsible side panel. When `available` is false, all controls are `disabled` and a notice is shown.

---

## API Routes (New)

### `POST /api/ai/assist`

```typescript
// Request
interface AIAssistRequest {
  prompt: string;
  action: "complete" | "translate";
  selectedText?: string;
  targetLocale?: Locale;
  chapterId: string;
}

// Response: text/event-stream (Server-Sent Events)
// Each event: data: {"delta": "..."}
// Final event: data: [DONE]
```

Rate-limited: 20 requests per user per 60-second sliding window. Returns HTTP 429 with `Retry-After` header when exceeded.

### `GET /api/collab/[chapterId]` (WebSocket upgrade)

Handled by the Yjs WebSocket server (hocuspocus or `y-websocket` server). Authenticates via session cookie before upgrading. Returns HTTP 401 if session is invalid.

### `POST /api/books/[bookId]/export`

```typescript
// Request
interface ExportRequest {
  format: "PDF" | "EPUB" | "DOCX" | "POD";
  scope: "BOOK" | "CHAPTER";
  chapterId?: string;
  publishingStatus?: "02" | "04";  // for POD/ONIX
}

// Response: HTTP 202
interface ExportResponse {
  exportJobId: string;
  pollUrl: string;    // "/api/books/{bookId}/export/{exportJobId}"
}
```

### `GET /api/books/[bookId]/export/[jobId]`

```typescript
// Response
interface ExportStatusResponse {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  format: string;
  fileSizeBytes?: number;
  pageCount?: number;
  downloadUrl?: string;   // present only when status=COMPLETED; valid 15 min
  errorMessage?: string;  // present only when status=FAILED
}
```

### `PATCH /api/users/me/locale`

```typescript
// Request
interface LocaleUpdateRequest { locale: Locale; }
// Response: HTTP 200 with updated User record fields
```

### `GET /api/workspaces/[id]/members`

Returns the list of `WorkspaceMember` records for the workspace. OWNER role required.

### `POST /api/workspaces/[id]/members/invite`

Creates a `WorkspaceInvitation` record and triggers an email send.

### `DELETE /api/workspaces/[id]/members/[userId]`

Removes a member. OWNER role required. Cannot remove the last OWNER.

### `GET /api/metrics`

Returns Prometheus text format metrics. No authentication required (intended for internal scrape).

---

## Data Models

### ExportJobRecord (v2 extension)

```typescript
interface ExportJobRecord {
  id: string;
  workspaceId: string;
  bookId: string;
  chapterId?: string | null;
  requestedById?: string | null;
  scope: "BOOK" | "CHAPTER";
  format: "PDF" | "EPUB" | "DOCX" | "POD";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  designProfileSnapshot: string;
  pageCount?: number | null;
  fileSizeBytes?: number | null;
  outputStorageKey?: string | null;
  warningsJson: string;
  errorMessage?: string | null;
  createdAt: Date;
  completedAt?: Date | null;
}
```

### WorkspaceInvitation

```typescript
interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  role: "EDITOR" | "VIEWER";
  tokenHash: string;
  expiresAt: Date;
  acceptedAt?: Date | null;
  createdById?: string | null;
  createdAt: Date;
}
```

### InlineComment

```typescript
interface InlineComment {
  id: string;
  workspaceId: string;
  chapterId: string;
  authorId?: string | null;
  text: string;
  anchorStart: number;
  anchorEnd: number;
  resolvedAt?: Date | null;
  resolvedById?: string | null;
  createdAt: Date;
}
```

---

## Real-Time Collaboration Architecture

### Yjs + WebSocket Binding

```
Browser (TipTap + y-prosemirror)
  │  WebSocket
  ▼
/api/collab/[chapterId]   ← Next.js route upgraded to WS
  │
  ▼
HocusPocus / y-websocket Server
  │  YDoc state
  ▼
YjsPersistence (src/features/collaboration/yjs-persistence.ts)
  │  on "change" + debounce(5000ms) + on "disconnect"
  ▼
Chapter.canonicalJson ← Prisma UPDATE
```

Each `chapterId` maps to one `YDoc`. The persistence adapter serialises the Y.Doc state as Uint8Array and stores it in a new `Chapter.yjsState` column (nullable `BYTEA`), while also updating `canonicalJson` and `markdown` for non-real-time readers.

### Track Changes Extension

The `TrackChanges` TipTap extension marks insertions with `<ins data-author-id="..." data-ts="...">` and deletions with `<del>` decorations in ProseMirror. Accepting a change removes the decoration and commits the text. Rejecting removes the inserted text or restores deleted text.

---

## Background Job Queue

### Worker Loop

```typescript
// src/features/jobs/worker.ts
async function runWorkerLoop(): Promise<void> {
  while (true) {
    const job = await claimNextPendingJob();   // atomic UPDATE ... RETURNING with FOR UPDATE SKIP LOCKED
    if (job) {
      await processJob(job);
    } else {
      await sleep(5_000);
    }
  }
}
```

The `claimNextPendingJob` function uses `SELECT ... FOR UPDATE SKIP LOCKED` to safely claim one job, immediately setting `status = 'PROCESSING'`. This prevents double-processing under concurrent workers.

### Dispatch Flow

```
Client POST /api/books/[bookId]/export
  → ExportDispatcher.enqueue(bookId, format, scope, ...)
      → prisma.exportJob.create({ status: "PENDING", format })
      → return { exportJobId, pollUrl }
  → HTTP 202

Worker picks up PENDING job
  → UPDATE status = "PROCESSING"
  → invoke PDF/EPUB/DOCX/PoD generator
  → FileStore.save(buffer, storageKey)
  → UPDATE status = "COMPLETED", outputStorageKey, fileSizeBytes, completedAt
  → (on error) UPDATE status = "FAILED", errorMessage
```

### File Storage

In development: write to `output/exports/{exportJobId}.{ext}` on disk.
In production: write to configured S3-compatible object storage via `AWS_S3_BUCKET` env var. Download URL is a pre-signed URL with 15-minute TTL.

---

## Publishing Pipeline — EPUB 3

### EPUB Container Structure

```
{bookTitle}.epub   (ZIP)
  ├── mimetype                         (uncompressed, first entry)
  ├── META-INF/
  │   └── container.xml
  └── OEBPS/
      ├── content.opf                  (package document)
      ├── nav.xhtml                    (TOC navigation document)
      ├── cover.xhtml                  (if cover image present)
      ├── fonts/
      │   ├── NotoSerifBengali.ttf
      │   └── NotoSansBengali.ttf
      ├── styles/
      │   └── bookforge.css
      └── chapters/
          ├── ch-{id}.xhtml            (one per Chapter)
          └── ...
```

### Builder API

```typescript
// src/features/publishing/epub-generator.ts
interface EpubBuildInput {
  book: BookRecord;
  chapters: ChapterRecord[];
  designProfile: DesignProfileRecord;
  coverImageBuffer?: Buffer;
  coverImageMimeType?: string;
}

interface EpubBuildResult {
  buffer: Buffer;              // ZIP bytes
  warnings: string[];
  isValid: boolean;
  validationError?: string;
}

async function buildEpub(input: EpubBuildInput): Promise<EpubBuildResult>;
```

Validation: after building, open the ZIP in memory and verify:
1. `mimetype` is the first uncompressed entry with value `application/epub+zip`
2. `META-INF/container.xml` exists and contains a valid `rootfile` path
3. The OPF `<manifest>` contains an entry for every referenced file
4. All `id` attributes in OPF are unique

---

## Publishing Pipeline — DOCX

Uses the `docx` npm package (pure JS, no LibreOffice dependency).

### Style Mapping

```typescript
// src/features/publishing/docx-exporter.ts
const STYLE_MAP: Record<string, string> = {
  "bn-body":     "BanglaBody",
  "bn-h1":       "BanglaHeading1",
  "bn-h2":       "BanglaHeading2",
  "bn-h3":       "BanglaHeading3",
  "en-body":     "LatinBody",
  "en-h1":       "LatinHeading1",
  "en-h2":       "LatinHeading2",
  "en-h3":       "LatinHeading3",
};
```

Text runs in `canonicalJson` carry a `lang` field (`"bn"` or `"en"`) set during TipTap editing. The DOCX exporter maps each run's `(lang, blockType)` pair to the corresponding named style.

---

## Observability

### Log Enrichment Middleware

```typescript
// src/lib/observability/request-context.ts
// AsyncLocalStorage-based context for requestId, userId, workspaceId
export const requestContext = new AsyncLocalStorage<RequestContext>();
```

The Next.js `middleware.ts` generates a `requestId` (UUID) and stores it in the request header `X-Request-ID`. Each API route handler wraps execution in `requestContext.run({ requestId, userId, workspaceId }, handler)`. The `logger` reads from `requestContext.getStore()` and merges the context fields into every log entry.

### Prisma Slow-Query Middleware

```typescript
// src/features/observability/prisma-middleware.ts
prisma.$use(async (params, next) => {
  const start = Date.now();
  const result = await next(params);
  const durationMs = Date.now() - start;
  if (durationMs > 1000) {
    logger.warn("db.slow_query", {
      model: params.model,
      action: params.action,
      durationMs,
    });
  }
  return result;
});
```

### Prometheus Metrics

```typescript
// src/features/observability/metrics.ts
export const metrics = {
  httpRequests: new Counter("bf_http_requests_total", ["route", "status"]),
  wsConnections: new Gauge("bf_ws_connections_active"),
  exportQueueDepth: new Gauge("bf_export_queue_depth"),
};
```

The `/api/metrics` route calls `metrics.exportQueueDepth.set(await countPendingJobs())` before serialising.

---

## Theme System

Tailwind CSS v4 CSS custom-property theming. All component-level colours reference CSS variables:

```css
/* src/app/globals.css — light theme (default) */
:root {
  --bf-bg:           #ffffff;
  --bf-surface:      #f8f7f5;
  --bf-border:       #e5e3de;
  --bf-text:         #1a1a1a;
  --bf-muted:        #6b7280;
  --bf-accent:       #f26b21;
  --bf-primary:      #123b6d;
}

/* dark theme */
[data-theme="dark"] {
  --bf-bg:           #0f1117;
  --bf-surface:      #1a1d24;
  --bf-border:       #2d3142;
  --bf-text:         #e8e6e1;
  --bf-muted:        #9ca3af;
  --bf-accent:       #f48c4a;
  --bf-primary:      #4a90d9;
}
```

Theme is stored in `localStorage` as `bf:theme` and applied via a blocking inline script in `<head>` (to prevent FOUC) that sets `document.documentElement.dataset.theme`.

---

## Internationalization

### Extended i18n Structure

```typescript
// src/lib/i18n/messages.ts — v2 additions (same structure as v1)
// New top-level keys added to both "bn" and "en" namespaces:
//   collaboration, ai, settings, observability, publishing.epub,
//   publishing.docx, publishing.pod, accessibility
```

All v2 components receive a `locale: Locale` prop and call `t = messages[locale]` to resolve strings. No component renders a string literal outside this lookup.

### Locale Persistence

On session hydration in `src/server/auth.ts`, `SessionContext.preferredLocale` is read from `User.preferredLocale` in the DB. When the user changes locale via the UI toggle, a `PATCH /api/users/me/locale` call updates the DB field. The response contains the new locale, and React state is updated client-side without a full reload.

---

## Accessibility Implementation

### ARIA Landmark Structure

```tsx
<body>
  <header role="banner">…</header>        {/* HeaderBar */}
  <nav aria-label="Sidebar navigation">…</nav>  {/* SidebarNav */}
  <main role="main">…</main>              {/* page content */}
  <aside role="complementary">…</aside>   {/* AI panel, comments */}
  <footer role="contentinfo">…</footer>   {/* optional */}
</body>
```

### Focus Management

All `<dialog>` elements use `useEffect` to call `dialogRef.current?.focus()` on open, and restore focus to the trigger element on close. A `<div data-inert>` or `inert` attribute is applied to content outside the open dialog.

### Live Regions

```tsx
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {autosaveMessage}
</div>
```

Error notifications use `aria-live="assertive"`.

---

## Mobile Responsiveness

### Breakpoint Strategy

| Breakpoint | Sidebar | Toolbar | Dashboard |
|---|---|---|---|
| < 640 px | Hidden (drawer) | Single row + overflow menu | Stacked cards |
| 640–767 px | Hidden (drawer) | Two rows | Stacked cards |
| 768–1023 px | Visible, narrow (200 px) | Full | 2-column grid |
| ≥ 1024 px | Visible, standard (260 px) | Full | 3-column grid |

All touch targets enforce `min-h-[44px] min-w-[44px]` via Tailwind utilities.

---

## AI Proxy

```typescript
// src/features/ai/ai-proxy.ts
export async function streamAIAssist(
  request: AIAssistRequest,
  userId: string
): Promise<ReadableStream<Uint8Array>> {
  rateLimiter.checkAndRecord(userId);   // throws HTTP 429 on exceed

  const response = await fetch(process.env.AI_PROVIDER_ENDPOINT!, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.AI_PROVIDER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildLLMPayload(request)),
  });

  if (!response.ok) {
    logger.error("ai.provider_error", { status: response.status, userId });
    throw new AppError("AI_PROVIDER_ERROR", `LLM returned ${response.status}`, 502);
  }

  return response.body!;   // forward the stream directly to the client
}
```

The API key (`AI_PROVIDER_API_KEY`) is read exclusively on the server. The client calls `/api/ai/assist` and receives a Server-Sent Events stream. The key never appears in any client bundle.

---

## Error Handling

| Layer | Mechanism |
|---|---|
| API routes | `try/catch` → `AppError` → structured JSON error response |
| Worker | Per-job `try/catch` → `UPDATE export_jobs SET status='FAILED'` + `logger.error` |
| Yjs WebSocket | Connection-level error handler → graceful close + client reconnect |
| AI proxy | Non-2xx LLM response → `AppError("AI_PROVIDER_ERROR")` → SSE error event |
| Client | React error boundary per major section; toast notifications via ARIA live region |

---

## Security Considerations

- **Role enforcement**: All mutation API routes check `WorkspaceMember.role !== "VIEWER"` before proceeding; returns HTTP 403 otherwise. Enforced in a shared `requireEditorOrOwner(session, workspaceId)` helper.
- **Invitation tokens**: Single-use SHA-256 hashed tokens stored in `workspace_invitations.token_hash`. Tokens expire after 72 hours.
- **AI key isolation**: `AI_PROVIDER_API_KEY` is read only in `src/features/ai/ai-proxy.ts` (server-side). `next.config.ts` does not expose it via `publicRuntimeConfig` or `NEXT_PUBLIC_` prefix.
- **Export file access**: Completed export files are served via time-limited pre-signed URLs (15-minute TTL), not as static public assets.
- **WebSocket auth**: The `/api/collab/[chapterId]` upgrade handler validates the session cookie before upgrading, rejecting unauthenticated upgrade requests with HTTP 401.
- **Path traversal**: All file storage keys are generated as `{workspaceId}/{exportJobId}.{ext}` UUIDs, never derived from user-supplied filenames.

---

## Migration Strategy

### v1 → v2 Without Downtime

1. Apply Prisma migrations (additive only: new tables, new columns with defaults).
2. Deploy new Next.js build (all new routes are additive; existing routes unchanged).
3. Start JobQueue worker process (separate `node` process or Docker service).
4. Existing synchronous PDF export route remains as a fallback until the async route is confirmed working.

### Component Decomposition Migration

`src/components/workspace.tsx` is replaced by a thin wrapper that renders the new `AppShell` + composed components. The wrapper maintains the same props interface as `workspace.tsx` (`{ initialLocale }`) so the existing `dashboard/page.tsx` import requires no change. The internal state management is distributed to the focused child components.

---

## Testing Strategy

### Unit Tests

Each new server-side module (`epub-generator.ts`, `docx-exporter.ts`, `ai-proxy.ts`, `worker.ts`, `invitation.ts`, `yjs-persistence.ts`) has:
- One happy-path test
- One error/failure-mode test
- Property-based tests for pure functions (serialization round-trips, structural invariants)

### Integration Tests

Each new API endpoint has an integration test verifying:
- HTTP 200/202 for authorized callers
- HTTP 401 for unauthenticated callers
- HTTP 403 for VIEWER-role callers on mutation endpoints

### Test Framework

Existing: Node's built-in `node:test` runner (invoked via `npm test`). New tests follow the same pattern as `tests/*.test.ts`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sidebar collapsed-state round-trip

*For any* boolean sidebar-collapsed value written to `localStorage` under key `bf:sidebar:collapsed`, reading the key immediately after writing returns the same boolean value.

**Validates: Requirements 1.2**

### Property 2: Theme persistence round-trip

*For any* theme value in `{"light", "dark", "system"}` stored in `localStorage` under key `bf:theme`, reading the key returns the identical value.

**Validates: Requirements 2.2**

### Property 3: Dashboard statistics accuracy

*For any* collection of Books each with N chapters and M total word-count, the `computeBookStats` function must return a `BookStats` record where `totalWordCount` equals the sum of all chapter `wordCount` values, `chapterCount` equals N, and `progressPct` equals `Math.min((totalWordCount / targetWordCount) * 100, 100)`.

**Validates: Requirements 3.1**

### Property 4: Export history truncation ordering

*For any* list of ExportJob records of arbitrary length, the `getRecentExportJobs(limit=20)` function must return at most 20 records ordered by `createdAt` descending, with the most recent record first.

**Validates: Requirements 3.3**

### Property 5: VIEWER role blocks all mutations

*For any* mutation API endpoint (`/api/books/*` POST/PATCH/DELETE, `/api/books/[id]/chapters/*` POST/PATCH/DELETE, `/api/import`) called with a session whose `WorkspaceMember.role` is `VIEWER`, the response status must be 403.

**Validates: Requirements 5.6**

### Property 6: Invitation record creation

*For any* valid (email, role) pair submitted to `POST /api/workspaces/[id]/members/invite` by an OWNER, exactly one `WorkspaceInvitation` record is created with `invitedEmail` equal to the submitted email, `role` equal to the submitted role, and `expiresAt` within the range `[now + 71h, now + 73h]`.

**Validates: Requirements 5.2**

### Property 7: WebSocket exponential backoff

*For any* sequence of N consecutive reconnection failures (N ≥ 1), the retry delay before attempt N must equal `Math.min(1000 * Math.pow(2, N - 1), 30000)` milliseconds.

**Validates: Requirements 6.5**

### Property 8: TrackChanges annotation completeness

*For any* text insertion or deletion made while TrackChanges is enabled, the resulting ProseMirror decoration or mark must contain a `data-author-id` attribute equal to the current user's ID and a `data-ts` attribute representing a valid ISO 8601 timestamp.

**Validates: Requirements 7.1, 7.2**

### Property 9: InlineComment round-trip

*For any* InlineComment created with fields `(chapterId, text, anchorStart, anchorEnd, authorId)`, retrieving the comment by ID must return a record where all five fields are equal to the submitted values.

**Validates: Requirements 7.4, 7.5**

### Property 10: InlineComment resolution preserves history

*For any* InlineComment in the resolved state, a query filtering `WHERE resolved_at IS NULL` must NOT return that comment, while a query with no resolved-state filter must return it.

**Validates: Requirements 7.7**

### Property 11: EPUB structural completeness

*For any* Book with N chapters and any set of metadata fields, the generated EPUB ZIP buffer must contain: the `mimetype` file as the first entry, `META-INF/container.xml`, `OEBPS/content.opf`, `OEBPS/nav.xhtml`, and exactly N `OEBPS/chapters/ch-*.xhtml` files.

**Validates: Requirements 8.1**

### Property 12: EPUB Bengali font embedding

*For any* Book whose `language` field equals `"bn"`, the generated EPUB ZIP must contain entries for both `OEBPS/fonts/NotoSerifBengali.ttf` and `OEBPS/fonts/NotoSansBengali.ttf`.

**Validates: Requirements 8.2**

### Property 13: EPUB TOC completeness

*For any* Book with N chapters, the generated `nav.xhtml` must contain exactly N `<li>` elements, each with an `<a href>` pointing to the corresponding chapter XHTML file and text content equal to the chapter's title.

**Validates: Requirements 8.3**

### Property 14: EPUB cover image inclusion

*For any* Book that has a cover image asset, the generated EPUB's `content.opf` must contain an `<item>` element with `properties="cover-image"` and a `<guide>` element with `type="cover"`.

**Validates: Requirements 8.4**

### Property 15: DOCX chapter title ordering

*For any* ordered list of chapters `[c1, c2, ..., cN]`, the generated DOCX document must contain exactly N `Heading1` paragraphs appearing in the same order as the input chapter list, with text equal to each chapter's title.

**Validates: Requirements 9.4**

### Property 16: DOCX style mapping correctness

*For any* text run in `canonicalJson` with `lang = "bn"` and `blockType = "body"`, the corresponding DOCX run element must reference the `BanglaBody` named style; and for any run with `lang = "en"` and `blockType = "body"`, it must reference `LatinBody`. The same pattern holds for all heading levels 1–3.

**Validates: Requirements 9.2**

### Property 17: PDF cover page content

*For any* Book with a `title`, an optional `subtitle`, and an `author`, the rendered PDF HTML string must contain a cover-page section whose inner text includes the exact `title` value, the exact `author` value, and — when `subtitle` is non-null — the exact `subtitle` value.

**Validates: Requirements 10.1, 10.2**

### Property 18: PDF TOC completeness

*For any* Book with N chapters, the rendered PDF HTML must contain a TOC section with exactly N entries, each containing the chapter's title string.

**Validates: Requirements 10.3**

### Property 19: PDF chapter anchor presence

*For any* Chapter in a Book's chapter list, the rendered PDF HTML must contain an element with `id` equal to `"ch-{chapterId}"` (or an equivalent deterministic anchor derived from the chapter ID).

**Validates: Requirements 10.4**

### Property 20: ONIX metadata field mapping

*For any* Book record with non-empty `title`, `author`, `language`, and `description` fields, the generated ONIX 3.0 XML string must contain: `<TitleText>` equal to `book.title`, `<PersonName>` equal to `book.author`, `<LanguageCode>` equal to `book.language`, and `<Text>` equal to `book.description`.

**Validates: Requirements 11.2**

### Property 21: PoD bundle ZIP structure

*For any* valid Book with required metadata, the generated print-on-demand ZIP archive must contain exactly three entries: a file with extension `.pdf`, a file with extension `.xml`, and `README.txt`.

**Validates: Requirements 11.1**

### Property 22: AI LLM error propagation

*For any* HTTP error status code (4xx or 5xx) returned by a mocked LLM provider, the `streamAIAssist` function must throw an `AppError` with code `"AI_PROVIDER_ERROR"`, and `logger.error` must be called exactly once with a `meta.status` field equal to that status code.

**Validates: Requirements 12.4**

### Property 23: AI rate limiting

*For any* user ID that makes more than 20 `POST /api/ai/assist` requests within a 60-second window, every request beyond the 20th must receive an HTTP 429 response.

**Validates: Requirements 12.6**

### Property 24: Request log context enrichment

*For any* authenticated HTTP request processed by an API route handler, every log entry emitted during that request's handler must include a `requestId` field equal to the value of the `X-Request-ID` header and a `userId` field equal to the authenticated user's ID.

**Validates: Requirements 13.1**

### Property 25: API handler duration logging

*For any* request to `/api/books/[bookId]/export` or `/api/ai/assist`, at least one log entry emitted during the handler must contain a `durationMs` field whose value is a non-negative integer.

**Validates: Requirements 13.3**

### Property 26: Prisma slow-query warning

*For any* Prisma query whose wall-clock execution time exceeds 1000 ms (simulated via test mock), `logger.warn` must be called with a `meta` object containing non-empty `model`, `action`, and `durationMs` fields.

**Validates: Requirements 13.4**

### Property 27: Export job returns HTTP 202 with job ID

*For any* valid export request body `(bookId, format, scope)` sent to `POST /api/books/[bookId]/export`, the response status must be 202 and the JSON body must contain an `exportJobId` field that matches the ID of a newly created `ExportJob` record with `status = "PENDING"`.

**Validates: Requirements 14.1**

### Property 28: Job status transitions are monotonic

*For any* ExportJob that transitions through PENDING → PROCESSING → COMPLETED (or FAILED), the sequence of `status` values recorded in the database must follow this order without any backwards transition (e.g., COMPLETED → PENDING is forbidden).

**Validates: Requirements 14.3, 14.4, 14.5**

### Property 29: ARIA landmarks on all pages

*For any* rendered authenticated page, the DOM must contain exactly one element with `role="main"`, at least one element with `role="navigation"`, and exactly one element with `role="banner"`.

**Validates: Requirements 16.1**

### Property 30: Form controls have accessible names

*For any* rendered `<input>`, `<select>`, or `<textarea>` element in the application, the element must have either an associated `<label>` (via `for`/`id` pairing), a non-empty `aria-label` attribute, or a non-empty `aria-labelledby` attribute referencing an existing element.

**Validates: Requirements 16.2**

### Property 31: Notification live regions

*For any* autosave status change, error banner appearance, or success toast rendered in the application, the notification text must be contained within an element that has an `aria-live` attribute set to either `"polite"` or `"assertive"`.

**Validates: Requirements 16.4**

### Property 32: Locale persistence round-trip

*For any* locale value in `{"bn", "en"}` submitted via `PATCH /api/users/me/locale`, loading the authenticated session immediately after the PATCH must return a `SessionContext` whose `preferredLocale` field equals the submitted locale.

**Validates: Requirements 17.2**

### Property 33: Date formatting per locale

*For any* `Date` value formatted by the `formatDate(date, locale)` utility function, when `locale = "bn"` the output string must contain Bangla-script digit characters (Unicode range U+09E6–U+09EF), and when `locale = "en"` the output must contain only ASCII digit characters.

**Validates: Requirements 17.4**
