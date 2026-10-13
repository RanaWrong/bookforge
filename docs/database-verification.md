# Database implementation evidence

Date: 2026-10-13. Local environment: Windows, Node 26.4.0, npm 11.17.0.
Docker targets Node 22.12+ and PostgreSQL 17; that container runtime has not been tested here.

## Inspection and plan

Read README, PROJECT, ARCHITECTURE, IMPLEMENTATION_PLAN, PRD, FEATURE_MATRIX,
package manifests, Docker/Compose, Next/TypeScript/ESLint configuration, environment
template, ignore files and the existing app/i18n source. No real environment file
was present. No applicable AGENTS.md was found. The nested bookforge folder was empty.

Baseline had Next 15.5.27, React 19.3.0, TypeScript 5.9.3 and Prisma 8.0.0-rc.22
without a client/schema. ESLint configuration could not load Next 15's legacy
configuration. Docker installed unfrozen dependencies and had no database service.
Git already had unmerged package.json/package-lock.json entries and many untracked
application files. The Git index was left untouched.

Plan before editing: use matching stable Prisma 7 packages and pg; add minimal
User/Book/Chapter persistence with owner-scoped reads; configure private persistent
PostgreSQL and a migration job; document operations and run available checks.

## Commands and results

| Command/check | Actual result |
|---|---|
| `node --version`, `npm --version`, baseline `npm ls --depth=0` | Inspected versions above |
| `docker --version`, `psql --version` | Commands unavailable; no PostgreSQL Windows service found |
| Initial `npm run lint` | Failed: incompatible ESLint config imports |
| `npm install --save-exact @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg dotenv server-only` | Stalled; stopped that install process and retried |
| Same install with `--no-audit --prefer-offline` | Passed; lockfile updated |
| `npm install --no-audit --prefer-offline --save-dev --save-exact tsx @eslint/eslintrc` | Passed |
| Final `npm ls --depth=0` | Passed, matching Prisma 7.10.0 CLI/client/adapter |
| `prisma format`, `npm run db:validate` | Passed |
| `npm run db:generate` | Passed without DATABASE_URL |
| `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script --output prisma/migrations/20261013000000_initial/migration.sql` | Generated SQL offline; transaction and CHECK constraints added and reviewed |
| `npm run typecheck` | Passed |
| `npm run lint` after config repair | Found existing anchor navigation error; fixed using Next Link |
| Final `npm run lint` | Passed |
| `npm test` | 1 passed; 1 live integration test skipped; 0 failed |
| `npm run db:check` | Failed safely: no DATABASE_URL; no credentials printed |
| `npm run db:deploy`, `npm run db:status` | Blocked: datasource URL missing; no migration applied |
| Compose YAML parsing using installed `js-yaml` | Both files parsed; this is not Docker Compose validation |
| `git check-ignore` / tracked secret paths | Environment/secret/backup/generated paths ignored; no tracked environment secrets found |
| `git diff --check` | Passed (line-ending notices only) |
| Initial `npm run build` | Compiled, but prerender failed with missing /_document while an existing dev server shared .next |
| `$env:BOOKFORGE_BUILD_DIR = '.next-build'; npm run build` | Passed: compilation, lint/types, static generation and standalone tracing; / and /_not-found generated |

An intermediate migration attempt during dependency reinstallation could not find
the Prisma executable; the final attempts above used the installed CLI and reached
configuration validation. A preliminary YAML parse attempted unavailable `yaml`;
the retry using already installed `js-yaml` passed. npm emitted install-script
policy warnings, but exited successfully. A dependency vulnerability audit was
not completed. No database reset, deletion, production connection, or commit occurred.

Automatic review rejected a combined process-stop/cache-removal command as blocked
by policy; it did not execute. The safer retry added an optional build output
directory, leaving the development process and cache in place. Docker continues
to use `.next`. Next automatically added the alternate generated-types path to
tsconfig.json during the successful build.

## Files created or changed

- Dependencies/tooling: package.json, package-lock.json, eslint.config.mjs,
  next.config.ts, tsconfig.json; Next refreshed next-env.d.ts during builds.
- Database: prisma.config.ts, prisma/schema.prisma,
  prisma/migrations/migration_lock.toml,
  prisma/migrations/20261013000000_initial/migration.sql,
  src/lib/db/client.ts, src/modules/books/repository.ts, scripts/check-db.ts,
  tests/ownership.test.ts. Generated Prisma files are ignored.
- Deployment/environment: Dockerfile, docker-compose.yml, docker-compose.dev.yml,
  .env.example, .gitignore, .dockerignore.
- Documentation: README.md, ARCHITECTURE.md, IMPLEMENTATION_PLAN.md, PROJECT.md,
  FEATURE_MATRIX.md, docs/database-verification.md.
- Existing UI: src/app/page.tsx only replaces the internal home anchor with Next Link.

## Remaining verification and exact commands

After installing Docker/Compose, copy `.env.example` to `.env` and replace all
password placeholders consistently. Then run from the repository:

```sh
npm ci
npm run db:generate
docker compose -f docker-compose.yml -f docker-compose.dev.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
npm run db:deploy
npm run db:status
npm run db:check
docker compose up -d --build
docker compose logs migrate
```

For the integration test, create a new disposable database (command fails rather
than overwriting an existing database):

```sh
docker compose exec db sh -c 'createdb -U "$POSTGRES_USER" bookforge_test'
```

In PowerShell, set the following URLs using your local credentials, then migrate
only the test database and run tests:

```powershell
$env:DATABASE_URL = 'postgresql://bookforge:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/bookforge_test?schema=public'
$env:TEST_DATABASE_URL = $env:DATABASE_URL
npm run db:deploy
npm test
Remove-Item Env:DATABASE_URL
Remove-Item Env:TEST_DATABASE_URL
```

The `_test` suffix is a guard, not proof of safety: verify this is a local disposable
database. The test rolls back its own fixtures. Live migrations, relational/ownership
tests, Docker image build/startup, volume persistence, backup/restore rehearsal and
Coolify rollout remain unverified until executed with those services.

Review the working files and resolve the pre-existing Git index conflicts before
committing. No `git add` or merge-state mutation was performed by this implementation.
