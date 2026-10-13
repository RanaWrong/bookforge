# BookForge

Bilingual book writing and publishing platform for Bangla + English. The landing page links to a book dashboard with chapter management and a plain-text editor. PostgreSQL stores books and chapter content. Production authentication, rich editing, importing, and publishing remain future phases.

## Prerequisites

- Node.js 22.12+ on the 22 LTS line (Docker uses Node 22); npm 10+.
- PostgreSQL 17, or Docker with Compose v2.
- Next.js 15, React 19, TypeScript strict, Tailwind 4.
- Prisma CLI/client/adapter pinned together at 7.10.0 with `pg`. See the [Prisma 7 guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7).

## Local development

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`). Replace the password placeholder in all three locations. Use random hex or URL-encode special characters in URL credentials. `.env` is shared by Next.js, Prisma CLI, scripts, and Compose. Avoid DATABASE_URL overrides in `.env.local`, which Prisma CLI does not load.

```sh
npm ci
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
npm run db:generate
npm run db:deploy
npm run db:check
npm run dev
```

Open http://localhost:3000. The dev override binds PostgreSQL to `127.0.0.1:5432` only. Alternatively, start your own PostgreSQL and point DATABASE_URL at an empty development database. Never use production data for development/tests.

## Book and chapter workspace

After applying migrations, set `BOOKFORGE_DEV_IDENTITY=true` in your local `.env`
and run `npm run dev`. Open http://127.0.0.1:3000/dashboard (or follow the landing
page's library link). npm development binds to loopback by default. Restart the
server after changing environment variables.

**This is not authentication.** The explicitly enabled development adapter creates
one `developer@bookforge.local` user; every visitor shares that identity. Never
publish this development server or connect it to production data. In production,
all workspace actions fail closed even if the opt-in flag is set. Coolify/production
builds retain the public landing page, but the workspace requires real session
authentication before it can be used. No client-supplied user ID is accepted.

Create books, open a book, and add chapters. Rename and permanent-delete controls
use dialogs; deleting a book also removes its chapters after confirmation. Use
the up/down buttons to reorder chapters, open a chapter, then explicitly save its
text. Bangla and English switching works throughout. Chapter saves update the
book's activity timestamp. The editor warns before abandoning unsaved changes.

The MVP stores `{type: "plain-text", text: "..."}` in chapter JSONB; Markdown/HTML
is treated as literal text. It does not render HTML, import Markdown, or convert
rich documents. Unsupported existing content formats are refused without changing
stored content. Titles allow 1–300 characters and text allows 200,000 characters.
If another window saved first, a revision conflict preserves your current draft:
copy it, reopen the chapter, and merge it with the current saved version.

`db:check` runs read-only SELECT 1 without printing credentials. It checks connectivity; `npm run db:status` checks migration status.

## Schema changes and checks

```sh
npm run db:validate
npm run db:migrate -- --name describe_change
npm run db:generate
npm run db:studio
```

Use `db:migrate` only in development, with a role allowed to create a shadow database. Review generated SQL and commit migrations. Do not accept reset prompts unless the database is disposable. Production uses `db:deploy`, never `db push`. Keep Studio local; do not publish its port.

```sh
npm run db:validate
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run build
```

Without TEST_DATABASE_URL, both live integration suites explicitly skip. To check CRUD, ownership, Unicode, concurrent ordering, stale saves, and constraints, create an empty disposable database ending in `_test`, apply all migrations to it with DATABASE_URL, set TEST_DATABASE_URL to the same URL, then run `npm test`. The original constraint suite rolls back its transaction. The service suite commits operations to test concurrency and deletes only fixtures owned by the random users it created. Both refuse database names without the `_test` suffix. Never use a database containing real user data.

If `next dev` is already running, isolate a local production build from its cache:
PowerShell: `$env:BOOKFORGE_BUILD_DIR = '.next-build'; npm run build`.
Use the same variable with `npm start` to serve that build. Remove the variable
afterward (`Remove-Item Env:BOOKFORGE_BUILD_DIR`). Docker uses the default `.next`.

## Docker and Coolify

```sh
docker compose up -d --build
docker compose logs migrate
```

The base file publishes only the app. PostgreSQL has a health check and persistent `postgres_data` volume. Restart and `docker compose down` preserve it. The migration service must succeed before the app starts. Docker uses `npm ci`, generates Prisma without credentials, and runs the application as a non-root user.

In Coolify, deploy the base `docker-compose.yml` as a Compose resource without the dev override. Set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, and DOCKER_DATABASE_URL in secret environment settings. The URL must use `db:5432` and matching credentials. Compose supplies it as DATABASE_URL to app and migration containers. NODE_ENV is set to production; NEXT_PUBLIC_APP_NAME and NEXT_PUBLIC_DEFAULT_LOCALE are nonsecret settings (the current landing page retains its existing translations). Assign the domain to app port 3000. Keep the same Compose project/volume identity across deployments; a changed identity can select a new empty volume.

For Dockerfile-only deployments, provision private PostgreSQL separately and inject DATABASE_URL with its private hostname. Build/run the Dockerfile `migrate` target on that network as a pre-deploy job. The small app runner has no Prisma CLI. Verify migration success before routing traffic. If an orchestrator does not honor Compose completion dependencies, run migrations explicitly first.

POSTGRES_* initialize new volumes only; changing variables does not rotate existing database credentials. In production, provision a restricted runtime role with table/sequence permissions and a separate migration role with DDL permissions, then override each service's DATABASE_URL accordingly. Do not run the application with the bootstrap superuser role.

## Local reset, backup and restore

Stop the local app, verify DATABASE_URL points to a disposable local database, and back up anything valuable. Only after explicitly deciding to discard local data, run `npx prisma migrate reset` and review its confirmation prompt. It deletes data and reapplies migrations. Never run it in production. Do not use `docker compose down -v` to stop services: it deletes the database volume.

Create the ignored `backups` directory first. These commands avoid redirecting binary data through Windows PowerShell:

```sh
docker compose exec db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/bookforge.dump'
docker compose cp db:/tmp/bookforge.dump ./backups/bookforge.dump
```

Encrypt backups, copy them off the VPS, and establish retention. Rehearse restoration into a new empty database on a test instance, never over live data. Copy the dump to that instance, then use `pg_restore --no-owner --no-acl --exit-on-error -U <restore-role> -d <empty-test-database> <dump-file>` with matching PostgreSQL tools. No `--clean` is needed for an empty database. Check migration status and representative rows afterward. A persistent volume is not a backup.

## Troubleshooting

- Connection refused/P1001: verify database health and hostname. Host tools need the dev override; containers use `db`, never `localhost`.
- Authentication/P1000: check URL encoding and credentials. Existing volumes may have an older password; do not delete them to fix login.
- Missing DATABASE_URL: create `.env` or inject it. Static builds/generation do not require a database; database commands do.
- Missing tables/P2021: check `db:status`, then run `db:deploy` against the intended database.
- Shadow database permissions: use a local role with CREATEDB. Production `db:deploy` needs no shadow database.
- External provider TLS errors: configure the trusted CA/required SSL settings; do not disable certificate validation.
- Missing generated client: run `npm run db:generate` after install/schema changes.
- Host port 5432 occupied: change the loopback port in the dev override and host DATABASE_URL. Containers still use `db:5432`.

See [architecture](ARCHITECTURE.md) and [verification evidence](docs/database-verification.md).

Current management-phase results and exact verification commands are recorded in
[the management report](docs/management-verification.md).
