# Book and chapter management verification

Date: 2026-10-14 (Asia/Dhaka). Environment: Windows, Node 26.4.0, npm 11.17.0.

## Inspection and plan

Inspected the current application, schema, both configuration layers, initial
migration, ownership repository, tests, design system and previous database report.
Repeated Prisma validation/generation, tests, TypeScript, lint and connection checks
before relying on the foundation. The schema/client and static checks passed, but
the prior live-database gaps remain: Docker/psql are unavailable, no PostgreSQL
service was found, and no .env/DATABASE_URL exists. Git still has pre-existing
unmerged package manifests and many untracked project files; its index is untouched.

Plan communicated before implementation: explicitly opt-in development identity;
validated owner-scoped services; transactional chapter order and stale-save detection;
bilingual dashboard/plain-text editing; unit/integration tests and documentation.

## Implemented functionality

- /dashboard lists the server identity's books with chapter count and updated time.
- Book creation, rename and confirmed permanent deletion (including owned chapters).
- Chapter creation, rename, adjacent up/down ordering, confirmed deletion and open.
- Explicit plain-text saves to JSONB; Bangla and English content remain literal text.
- Chapter mutations update book activity timestamps. Reorders and deletions preserve
  dense positions through parent-row locks and temporary positions in one transaction.
- An additive revision column rejects stale saves. Unsupported content formats are
  refused. The UI keeps unsaved text on errors and warns before abandoning a draft.
- Server-side UUID/title/content/revision/command validation, parent-child pairing,
  and ownership predicates on every operation. Client user/owner IDs are rejected.
- Responsive layout, language controls, loading/empty/success/error messages, labels,
  focus styles, native confirmation dialogs, keyboard-operable ordering controls.
- Production access is disabled. The development adapter requires NODE_ENV=development
  and BOOKFORGE_DEV_IDENTITY=true and uses one server-owned local account. It is not
  authentication; every visitor to that development server shares the same identity.

## Files changed in this phase

Created:

- src/lib/auth/development.ts
- src/modules/books/contracts.ts, validation.ts, service.ts
- src/lib/i18n/workspace.ts
- src/app/dashboard/actions.ts, page.tsx, loading.tsx
- src/components/workspace.tsx
- prisma/migrations/20261014000000_chapter_revision/migration.sql
- tests/actions.test.ts, library.test.ts, library.integration.test.ts
- docs/management-verification.md

Updated:

- prisma/schema.prisma (revision column)
- src/modules/books/repository.ts (identity documentation only)
- src/app/page.tsx (library link; document language follows switch)
- src/app/globals.css (shared workspace controls/focus tokens)
- package.json (bind npm development to loopback; no new dependencies)
- .env.example (development identity opt-in, false by default)
- README.md, ARCHITECTURE.md, PROJECT.md, IMPLEMENTATION_PLAN.md, FEATURE_MATRIX.md

Prisma regenerated ignored client files. Next refreshed generated next-env.d.ts
during verification. No new credentials or real environment file were created.

## Commands and actual results

| Check | Result |
|---|---|
| Initial `npm run db:validate`, `npm run db:generate` | Passed |
| Initial `npm test` | 1 passed, 1 live test skipped |
| Initial `npm run typecheck`, `npm run lint` | Passed |
| `npm run db:check` | Failed safely: no configured DATABASE_URL |
| Updated `npm run db:generate`, `npm run db:validate` | Passed |
| Final `npm test` | 8 passed, 0 failed, 2 live PostgreSQL suites skipped |
| Updated `npm run typecheck`, `npm run lint` | Passed |
| `npm run db:deploy`, `npm run db:status` | Blocked by missing datasource URL; no migration applied |
| `$env:BOOKFORGE_BUILD_DIR='.next-build'; npm run build` | Passed, including final rebuild after the landing-language change |
| Development HTTP GET /, /dashboard?lang=en, /dashboard?lang=bn | All 200 with application markup |
| Production HTTP GET /dashboard?lang=en | 200 with expected English markup |
| Production POST to all 4 built Server Actions, with BOOKFORGE_DEV_IDENTITY=true | All returned IDENTITY_DISABLED; actual HTTP test, not only mocked calls |
| Dependency manifest/lock comparison | Matches; no dependency changes needed |
| `git diff --check` | Passed; line-ending notices only |

Temporary verification servers on loopback ports 3100 and 3101 were stopped.
The production smoke server used `next start` and emitted its standalone-output
warning; deployed Docker continues to run the standalone server as configured.
No production database connection, reset, real-data deletion, or commit occurred.

Browser verification was attempted through the available browser tool, but no
browser surface was available. HTTP/compilation checks do not prove browser
interactions, focus behavior, mobile layout, or full end-to-end CRUD. Those checks
remain unverified, as do real PostgreSQL migrations, transactions, concurrency,
cross-owner database isolation and persistence across restarts. Integration tests
exist for these database behaviors but were not claimed to have run.

During migration filename cleanup, automatic approval review blocked removal of
an empty directory. It was instead moved outside prisma/migrations into the ignored
build directory without deleting anything. The migration tree contains only the
initial migration and the additive chapter_revision migration.

## Exact next steps

Install/start Docker with Compose, then copy .env.example to .env. Replace password
placeholders consistently and enable BOOKFORGE_DEV_IDENTITY=true for local use only.

```powershell
npm ci
npm run db:generate
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
npm run db:deploy
npm run db:status
npm run db:check
npm run dev
```

Open http://127.0.0.1:3000/dashboard. Manually verify both languages, empty library,
book create/rename/delete cancellation and confirmation, chapter create/rename/move,
Unicode save/reload, error recovery, keyboard dialogs, narrow viewport layout,
and an unsaved-change warning. To exercise conflicts, edit/save the same chapter
from two windows; the stale window must keep its draft and show a conflict.

Run database integration tests against a newly created, empty disposable database:

```powershell
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" bookforge_test'
$env:DATABASE_URL = 'postgresql://bookforge:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/bookforge_test?schema=public'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run db:deploy
npm test
Remove-Item Env:DATABASE_URL
Remove-Item Env:TEST_DATABASE_URL
```

Use your actual local username/password and verify the target is disposable.
The CRUD suite commits its fixtures to test concurrent transactions, then removes
only records belonging to its newly generated fixture users. The original constraint
suite rolls back. Interrupted tests may leave harmless fixture users in this test
database. Never point TEST_DATABASE_URL at real data.

Recommended next phase: real session authentication and multi-user end-to-end
ownership tests before any production workspace deployment. After that, add a
validated richer editor/Markdown conversion and autosave with conflict recovery.
PDF export remains out of scope. Resolve the pre-existing Git index conflicts
after reviewing the working files and before committing.
