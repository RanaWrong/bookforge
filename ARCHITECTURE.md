# BookForge — Architecture
**Status:** Proposed baseline; update decisions as implementation validates them.

## 1. Architecture style
Use a **modular monolith**. One Next.js application and one PostgreSQL database are sufficient for the MVP. Keep module boundaries explicit so expensive PDF rendering or background jobs can later move to a worker without rewriting domain logic.

## 2. Logical modules
- **Identity & Access:** sessions, account lifecycle, authorization policies.
- **Library:** books, book metadata, ownership, archive/delete.
- **Manuscript:** hierarchy, chapter content, ordering, content schema versions.
- **Editor:** TipTap/CodeMirror UI and content conversion adapters.
- **Import:** file validation, parsers, preview, warnings, import transaction.
- **Design:** validated print profile schema and preset management.
- **Rendering:** safe content-to-HTML transformation, print CSS, pagination, PDF.
- **Media:** upload validation, storage adapter, metadata, access checks.
- **Revisions:** snapshots, comparison/preview, restore-as-new-revision.
- **Exports:** job state, renderer orchestration, output storage, cleanup.
- **Operations:** health checks, structured logs, backup/deployment docs.

## 3. Suggested source layout
```text
src/
  app/
    (auth)/
    (workspace)/
    api/
  components/
    ui/
    layout/
    editor/
    books/
    chapters/
    design/
  modules/
    identity/
    books/
    manuscript/
    editor/
    imports/
    design/
    rendering/
    media/
    revisions/
    exports/
  lib/
    db/
    auth/
    validation/
    errors/
    logging/
    config/
  styles/
prisma/
  schema.prisma
  migrations/
tests/
  unit/
  integration/
  e2e/
docs/
  decisions/
  runbooks/
```
Adapt this to the actual Next.js repository and avoid duplicate layers without a clear purpose.

## 4. Dependency direction
UI and route handlers call module services. Services validate inputs and enforce policy, then call repositories/adapters. Domain logic must not import React components. Rendering and import parsers must not bypass ownership or validation rules.

```text
UI / Server Actions / Route Handlers
              |
        Module Services
        /      |       \\
   Policies  Validation  Domain rules
              |
      Repositories / Adapters
       |       |        |
   PostgreSQL Storage  Renderer
```

## 5. Content and design separation
- Manuscript content is canonical and versioned.
- Design profiles are independent, validated settings.
- Print HTML is a derived artifact, never the only saved manuscript.
- Markdown conversion is an adapter with a documented supported-feature matrix.
- Unsupported content must trigger warnings rather than silent loss.
- Export jobs store a snapshot of the content revision and design settings used.

## 6. Data and persistence
PostgreSQL is the system of record for users, books, hierarchy, design profiles, revision metadata, media metadata, and export-job status. Large media and generated PDFs should use a storage adapter rather than database blobs. Local disk may be used for development; production should use persistent storage with a backup policy and ideally off-site replication.

Use foreign keys, indexes for ownership and ordering, transactions for imports and hierarchy updates, and migrations committed to Git. Do not expose database queries directly from UI components.

## 7. Security boundaries
- Treat all uploaded/imported content as untrusted.
- Authenticate and authorize every resource access on the server.
- Validate requests using schemas at API/action boundaries.
- Sanitize content before HTML rendering.
- Do not fetch arbitrary remote URLs from the server without an explicit safe allowlist/SSRF strategy.
- Validate ZIP paths, entry count, uncompressed size, compression ratio, and allowed file types.
- Keep export rendering isolated with timeouts, resource limits, and no unnecessary network access.
- Keep secrets in deployment environment variables.
- Never log passwords, tokens, full manuscript contents, or private document URLs.
- Use least-privilege database/storage credentials.

## 8. Rendering pipeline
1. Verify user access to the requested book.
2. Load a consistent content revision and validated design profile.
3. Convert structured content into sanitized semantic HTML.
4. Apply print CSS and page layout rules.
5. Render with the selected pagination/Chromium pipeline.
6. Validate output status and record errors/metadata.
7. Store the generated PDF under an access-controlled key.
8. Allow download only after re-checking authorization.

For long documents, use a background worker/job queue when synchronous request limits become unreliable. Do not introduce a queue until measurements or platform limits justify it.

## 9. Failure handling
- Autosave failures must be visible and retryable.
- Conflicting edits must be detected instead of silently overwriting.
- Imports should validate before committing and use transactions where practical.
- Export failures should record a safe error code and expose a helpful message.
- Database migrations must be backward-aware for deployment and rollback.
- Backups must be periodically restored in a test environment.

## 10. Observability
Use structured logs with request/job IDs, status, duration, and safe error categories. Monitor application health, DB availability, export failures, disk usage, and backup success. Keep diagnostics separate from manuscript content.

## 11. Architecture decision records
Create a short record in docs/decisions/ whenever a decision is difficult to reverse. Initial records should cover:
- Canonical manuscript representation and Markdown conversion.
- Authentication provider and session strategy.
- Local versus S3-compatible media storage.
- PDF renderer and font handling.
- Single-user ownership versus workspace membership.
- Background export strategy and job limits.

## 12. Architecture acceptance checks
- Domain services can be tested without rendering React UI.
- Authorization is centralized and covered by tests.
- Design changes do not mutate manuscript content.
- Import and export use explicit adapters.
- Content and settings used for an export are reproducible from stored revision/settings snapshots.
- No production secret is required in source control.
