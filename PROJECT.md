# BookForge — Project Guide

## Purpose
BookForge is a bilingual (বাংলা + English) writing and publishing platform. Read PRD.md for requirements, ARCHITECTURE.md for system boundaries, IMPLEMENTATION_PLAN.md for delivery phases, and FEATURE_MATRIX.md for feature status.

## Current status
The bilingual foundation, PostgreSQL/Prisma infrastructure, and book/chapter management MVP are implemented. The workspace uses an explicitly enabled local development identity; production access is blocked pending real authentication. Live PostgreSQL and browser interaction verification still require available services/tools; see docs/management-verification.md. Application functionality must not be marked verified until acceptance checks have actually passed.

## Development rules
- TypeScript strict mode; avoid any and unsafe type assertions.
- Validate all external input.
- Enforce authorization on the server for every resource.
- Keep manuscript content separate from design settings.
- Never silently discard unsupported content during editor conversion or import.
- Add tests for business logic and security boundaries.
- Keep changes focused and commit in small, understandable units.
- Do not commit secrets, real environment files, generated personal manuscripts, or production data.

## Planned local workflow
The exact commands must match package.json after Phase 1 is implemented. Expected workflow:
1. Install the documented Node.js version and package manager.
2. Copy .env.example to a local environment file and configure local values.
3. Start PostgreSQL with the documented development setup.
4. Run database migrations.
5. Start the development server.
6. Run lint, type-check, tests, and production build before committing.

Do not copy placeholder commands into production automation without verifying them against actual scripts.

## Environment variables
Maintain a committed .env.example containing names and safe placeholders only. Required variables will be documented after the auth, database, and storage decisions are implemented. Never commit secrets.

## Documentation index
- [PRD](./PRD.md)
- [Architecture](./ARCHITECTURE.md)
- [Implementation plan](./IMPLEMENTATION_PLAN.md)
- [Feature matrix](./FEATURE_MATRIX.md)
