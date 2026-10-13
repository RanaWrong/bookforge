# BookForge — Feature Matrix

This is a planning/status document. All features start as **Planned** until code and test evidence exist.

| Area | Feature | Priority | Phase | Initial acceptance evidence | Status |
|---|---|---:|---:|---|---|
| Foundation | Next.js, TypeScript strict, lint, tests, CI | P0 | 1 | Clean install and CI run | Planned |
| Data | PostgreSQL + Prisma migrations | P0 | 1 | Schema/client checks passed; live migration pending (docs/database-verification.md) | Implemented |
| Dashboard | Book list, create, rename, delete (archive deferred) | P0 | 2 | UI/services implemented; live CRUD suite pending | Implemented |
| Structure | Chapters and ordering (parts deferred) | P0 | 2 | Transactional operations implemented; PostgreSQL concurrency tests pending | Implemented |
| Editor | Visual TipTap editor | P0 | 3 | Editor interaction tests | Planned |
| Editor | Markdown/source mode | P0 | 3 | Round-trip conversion tests | Planned |
| Editor | Autosave and conflict handling | P0 | 3 | Save failure/conflict tests | Planned |
| Import | Markdown import | P0 | 4 | Valid/invalid fixture tests | Planned |
| Import | DOCX import with warnings | P1 | 4 | Supported-feature fixtures | Planned |
| Import | Secure ZIP import | P1 | 4 | Malicious archive tests | Planned |
| Design | Reusable print profiles | P0 | 5 | Schema validation and persistence tests | Planned |
| Design | Page size, margins, typography, headers/footers | P0 | 5 | Profile and preview checks | Planned |
| Preview | Print preview and pagination | P0 | 6 | Representative manuscript inspection | Planned |
| Export | Chapter and full-book PDF | P0 | 6 | PDF metadata and visual checks | Planned |
| Localization | Bangla and English UI/content | P0 | 1–6 | Locale and mixed-script tests | Planned |
| Auth | Sign in/out and account recovery | P0 | 7 | Auth E2E tests | Planned |
| Security | Resource-level ownership checks | P0 | 2, 7, 8 | Cross-user denial tests | Planned |
| Revisions | Revision list, preview, restore | P1 | 7 | Restore-as-new-revision tests | Planned |
| Media | Secure upload, metadata, access | P1 | 8 | Upload validation tests | Planned |
| Operations | Docker/Coolify deployment docs | P0 | 9 | Clean deployment rehearsal | Planned |
| Operations | Automated backup and restore drill | P0 | 9 | Restore evidence/runbook | Planned |
| Release | Accessibility, regression, security review | P0 | 10 | Release checklist | Planned |

## Status definitions
- **Planned:** not yet implemented.
- **In Progress:** actively being implemented; may be incomplete.
- **Implemented:** code exists, but acceptance evidence may be missing.
- **Verified:** acceptance criteria and relevant tests/reviews have passed.
- **Deferred:** intentionally moved out of the current release with rationale.

Update this matrix only when the repository state and test evidence support the change.
