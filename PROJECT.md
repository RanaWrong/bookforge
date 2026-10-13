# Project Charter — BookForge

## Vision
A reliable writing and publishing workspace for books written in Bangla, English, or mixed Bangla-English. Authors can organize content by chapter, apply consistent global typography and page design, and export chapters or complete books to print-ready PDF.

## Primary user
Initially one author managing their own manuscripts. The architecture must support multiple accounts and workspaces later.

## Product principles
1. Content and presentation are separate.
2. Import is non-destructive: show warnings rather than silently discarding unsupported formatting.
3. Every export is reproducible from content + a versioned design profile.
4. Prefer the smallest correct implementation over premature microservices.
5. Security and backups are foundational.

## MVP scope
- Project foundation and bilingual UI.
- Book dashboard and chapter hierarchy.
- Visual editor + Markdown source editor sharing a canonical content model.
- DOCX, Markdown and ZIP import with a report.
- Global typography and page layout settings.
- Chapter and whole-book PDF export.
- Authentication and per-user authorization before multi-user launch.

## Not MVP
- Full LaTeX compiler compatibility.
- Collaborative real-time editing.
- Payments/subscriptions.
- AI writing features.
- Public publishing marketplace.

## Acceptance criteria
- Bangla and English interface strings can be switched without losing current work.
- Content model is independent of print design.
- Uploaded files are validated, size-limited, and stored outside public web roots.
- PDF output is tested against real Bangla/English manuscripts.
