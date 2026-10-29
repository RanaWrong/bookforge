Act as a senior full-stack engineer. Continue working in the existing repository.

- Inspect the current book dashboard, chapter editor, Prisma schema, and editor content format.
- Verify which features and tests currently work.
- Create a short implementation plan before editing.
- Preserve existing functionality.
  Implement:
- .docx — Word documents.
- .md and .markdown — Markdown documents.
- .zip — archives containing Markdown files and optional assets.

1. Provide a responsive upload interface.
2. Validate file extension, MIME type where applicable, file size, and ZIP contents.
3. Show a preview before committing imported content.
4. Let users select a destination book or create a new book.
5. For multi-file imports, show detected files and proposed chapter order.
6. Allow users to reorder, rename, or exclude chapters.
7. Show an import report with warnings and errors.
8. Commit the import only after user confirmation.

- Convert DOCX content into the existing editor's supported structured format.
- Parse Markdown while preserving supported headings, lists, links, emphasis, blockquotes, and code blocks.
- Preserve chapter order.
- Report unsupported formatting instead of silently discarding it.
- Preserve image assets where safely supported and explain any skipped assets.
- Do not execute imported scripts, macros, or embedded active content.
- Prevent path traversal, including ../ paths.
- Reject suspicious entries, oversized expanded archives, excessive file counts, and unsupported file types.
- Prevent decompression bombs.
- Never extract files outside a dedicated temporary directory.
- Clean up temporary files after success or failure.
- Enforce authentication and destination-book ownership on the server.
- Validate every imported item.
- Use a database transaction for the final book/chapter commit where practical.
- Avoid duplicate imports caused by repeated submissions.
- Do not overwrite existing books or chapters without explicit confirmation.
- Handle malformed documents and database failures gracefully.
  Test DOCX, Markdown, ZIP, malformed files, empty files, large files, invalid paths, unsupported content, duplicate submissions, and unauthorized access.
  Run lint, TypeScript checks, relevant tests, and production build. Report any checks that could not be executed; never claim unverified success.
- Follow the existing project architecture and design system.
- Use strict TypeScript and minimal dependencies.
- Do not implement PDF export in this phase.
- Do not rewrite unrelated features.
- Inspect dependency security and compatibility before installing packages.
  List changed files, supported import features, security measures, actual test results, known limitations, and the next phase.
  Inspect first, plan, implement, test, and fix issues before reporting completion.

Act as a senior full-stack engineer. Continue from the existing repository.

- Inspect the editor, chapter ordering, book design settings, database schema, and existing tests.
- Verify previous phases before implementation.
- Write a short plan and identify rendering risks.
- Preserve existing functionality.
  Implement:
- Export an individual chapter to PDF.
- Export the complete book to one PDF.
- Generate a Table of Contents from chapter headings.
- Support page numbers, headers, footers, and optional watermark.
- Apply saved page size, orientation, margins, gutter, typography, and spacing.
- Preserve chapter ordering and chapter titles.
- Support Bangla and English text in the same document.
- Use semantic HTML and reusable print CSS.
- Use Paged.js where appropriate for pagination and page elements.
- Use Chromium-based PDF rendering on the server.
- Ensure required fonts are installed and available to Chromium.
- Keep rendering logic separate from editor and dashboard components.
- Avoid relying on browser-only APIs in server-side rendering code.
- Prevent headings from being stranded at page bottoms where possible.
- Apply sensible page-break rules to paragraphs, images, and chapters.
- Handle long tables and lists gracefully.
- Use correct page dimensions and binding margins.
- Ensure Bangla glyphs render correctly.
- Validate page count, output file integrity, and missing-font conditions.
- Report layout limitations that cannot be reliably automated.
- Authenticate every export request and verify book/chapter ownership.
- Validate all rendering inputs.
- Never allow user content to execute arbitrary code or access local files.
- Restrict Chromium network access and resource loading.
- Apply timeouts and reasonable limits on document size and rendering duration.
- Clean up temporary files.
- Avoid exposing internal filesystem paths or secrets in error messages.
- Provide Chapter PDF and Full Book PDF actions.
- Show rendering progress, success, and actionable errors.
- Use safe filenames based on book/chapter titles.
- Ensure concurrent exports do not overwrite each other's files.
- Make export actions accessible and responsive.
  Test:
- Bangla-only, English-only, and mixed-language documents.
- Long books and page breaks.
- Custom page dimensions and margins.
- Headers, footers, page numbering, TOC, and watermark.
- Missing fonts, malformed content, and failed renders.
- Unauthorized export requests.
- Concurrent exports and temporary-file cleanup.
  Run applicable unit/integration tests, lint, TypeScript checks, and production build. Verify actual generated PDFs when the environment supports it. Never claim visual or pagination quality was verified without inspecting the output.
- Inspect before editing.
- Preserve existing functionality.
- Avoid unnecessary dependencies and unrelated refactoring.
- Do not expose PostgreSQL publicly.
- Do not mark the phase complete while core export functionality remains unverified.
  List changed files, rendering architecture, tested export scenarios, actual test results, known limitations, and remaining tasks.
  Start with inspection, then implement, test, and fix issues.

Act as a senior full-stack engineer. Continue from the existing repository.

- Audit the existing authentication, database schema, book/chapter operations, editor autosave, and PDF export.
- Identify security gaps and unfinished features.
- Write a concise implementation plan before editing.
- Preserve working functionality.
  Implement secure user authentication with:
- Registration, login, and logout.
- Secure password hashing if password-based authentication is used.
- Protected application routes and server-side authorization.
- Secure, HTTP-only session cookies with appropriate production settings.
- Input validation, rate limiting, and generic login errors.
- A safe account recovery strategy if supported.
  Use a maintained authentication library compatible with the existing stack. Do not implement custom cryptography or store plaintext passwords.
- Every book and chapter must belong to an authorized user.
- Verify ownership on every server action, API endpoint, import, editor save, and PDF export.
- Never trust user IDs supplied by the client.
- Prevent insecure direct-object-reference vulnerabilities.
- Add tests proving one user cannot read, edit, delete, import into, or export another user's content.
  Implement:
- Version snapshots for chapter content.
- Creation timestamps and useful version metadata.
- A version history panel.
- Preview and restore actions.
- Safe restoration without deleting previous versions.
- Clear handling of autosave and duplicate snapshots.
- Transaction-safe persistence.
  Avoid creating a new version for every keystroke. Use a practical snapshot strategy.
- Validate and sanitize untrusted inputs.
- Review file uploads and ZIP extraction.
- Protect secrets and environment variables.
- Configure appropriate security headers and CSRF protection where required.
- Avoid leaking stack traces, credentials, or internal paths.
- Add reasonable rate limits and request-size limits.
- Review authorization checks for every sensitive operation.
  Test authentication flows, session expiry, authorization boundaries, cross-user access, version creation, preview, restoration, and concurrent updates.
  Run migrations safely, then run tests, lint, TypeScript checks, and production build. Never claim a test passed unless it was actually executed.
  Update environment examples and setup documentation. Document authentication configuration, migration steps, session security, and known limitations.
- Inspect before editing.
- Preserve existing editor, import, design settings, and PDF export.
- Do not expose PostgreSQL publicly.
- Do not introduce unnecessary dependencies.
- Do not deploy to production or run destructive migrations without approval.
  List implemented features, changed files, security decisions, actual test results, remaining vulnerabilities, and the recommended next phase.
  Start by auditing the repository, then implement and verify.

Act as a senior full-stack engineer. Continue from the existing repository.

- Inspect the database schema, editor content model, book dashboard, and existing settings.
- Verify previous features before changing anything.
- Prepare a short implementation plan.
- Preserve existing functionality and conventions.
  Implement a dedicated Design Settings interface for each book.
  Page layout
- A4, A5, B5, and custom page dimensions.
- Portrait and landscape.
- Top, bottom, inside, and outside margins.
- Gutter for binding.
  Typography
- Separate Bangla and English font families.
- Font size, heading sizes, line height, paragraph spacing, and text alignment.
- Support Unicode Bangla fonts and appropriate font fallbacks.
- Keep typography consistent across chapters.
  Page elements
- Header and footer content.
- Page numbering and starting number.
- Book title and author information.
- Optional watermark.
- Table of contents preferences.
- Store design settings in PostgreSQL through Prisma.
- Define validated TypeScript types and sensible defaults.
- Separate book content from presentation settings.
- Use reusable design profiles or configuration objects.
- Validate dimensions and prevent invalid or unsafe CSS values.
- Support per-book settings without affecting other books.
- Provide a responsive settings interface.
- Group settings into Layout, Typography, Headers & Footers, and Publishing.
- Include a live preview where practical.
- Add reset-to-default functionality with confirmation.
- Keep Bangla and English UI translations synchronized.
- Display loading, saved, and error states.
- Build reusable print styles that apply the selected settings.
- Ensure chapter content follows consistent typography and spacing.
- Prepare page layout for future Chromium/Paged.js PDF rendering.
- Do not claim accurate printed pagination until the PDF export phase is implemented and tested.
- Test saving and reloading settings.
- Test validation boundaries and default values.
- Verify that different books retain independent settings.
- Run Prisma validation, migrations where safe, lint, TypeScript checks, relevant tests, and production build.
- Report unexecuted checks honestly.
- Inspect before editing.
- Do not rewrite unrelated features.
- Do not hard-code design settings separately across components.
- Do not implement final PDF export in this phase.
- Do not introduce unnecessary dependencies.
  Report changed files, implemented settings, test results, limitations, and the next phase.
  Start with inspection, then implement and verify.

Act as a senior DevOps and full-stack engineer. Work in the existing BookForge repository.

- Inspect the entire application, Docker configuration, Prisma migrations, authentication, import system, editor, and PDF renderer.
- Verify previous phases instead of assuming they are complete.
- Identify security risks, missing tests, and deployment blockers.
- Create a prioritized implementation plan before changing files.
- Add or improve unit, integration, and end-to-end tests.
- Configure GitHub Actions for dependency installation, lint, type checking, tests, Prisma validation, and production build.
- Pin or constrain dependency versions appropriately.
- Run dependency vulnerability checks.
- Fail CI when required checks fail.
- Review and optimize the production Dockerfile.
- Use multi-stage builds and a non-root application user.
- Keep production images minimal.
- Add health checks and graceful shutdown where appropriate.
- Avoid copying .env, development files, or secrets into images.
- Ensure the application runs correctly using Next.js standalone output.
- Keep PostgreSQL data in persistent volumes.
- Document safe Prisma migration deployment.
- Configure PostgreSQL backup and restore procedures.
- Provide scheduled backup guidance with retention policies.
- Protect backup files and credentials.
- Test restoration using a separate test database.
- Never run destructive migrations or delete production data without approval.
  Prepare the application for deployment to the existing VPS using Docker and Coolify.
  Document:
- Required environment variables.
- Build and start configuration.
- Database connectivity.
- Persistent storage.
- Domain and HTTPS configuration.
- Health checks and deployment verification.
- Migration execution during releases.
- Rollback and recovery procedures.
  Do not assume Coolify configuration or credentials are available; report anything requiring manual setup.
- Ensure PostgreSQL is not publicly exposed.
- Review authentication, authorization, upload limits, ZIP extraction, and Chromium PDF rendering.
- Add structured application logs without passwords, tokens, or sensitive book content.
- Provide basic uptime, error, disk-space, and database-health monitoring guidance.
- Configure resource limits and timeouts where appropriate.
- Avoid exposing internal errors to users.
- Test dashboard and chapter operations under realistic conditions.
- Review database indexes and inefficient queries.
- Check memory usage during PDF rendering.
- Document recovery steps for application and database failures.
- Avoid introducing complex infrastructure before it is needed.
  Run applicable:
- Tests
- ESLint
- TypeScript checks
- Prisma validation
- Production build
- Docker image build
- Health checks
- Backup/restore verification in a safe test environment
  Report exact commands and actual results. Clearly distinguish verified checks from checks requiring the VPS or external credentials.
- Inspect before editing.
- Preserve working features.
- Do not deploy automatically without approval.
- Do not expose secrets or PostgreSQL publicly.
- Do not claim production readiness while critical checks remain unverified.
  Provide:

1. Changes made.
2. CI and test results.
3. Docker and security improvements.
4. Backup and recovery procedure.
5. Coolify deployment checklist.
6. Remaining blockers.
7. A final go-live recommendation.
   Start with the audit, then implement, test, and document.
