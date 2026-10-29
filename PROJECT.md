# BookForge — Project Guide

## Purpose
BookForge is a bilingual (বাংলা + English) writing and publishing platform. Read `PRD.md` for requirements, `ARCHITECTURE.md` for system boundaries, `IMPLEMENTATION_PLAN.md` for delivery phases, and `FEATURE_MATRIX.md` for feature status.

## Current status
All 10 phases of the implementation plan have been implemented across `prisma/`, `src/server/`, `src/features/`, `src/app/`, `scripts/`, and `tests/`.

## Development rules
- TypeScript strict mode; avoid `any` and unsafe type assertions.
- Validate all external input.
- Enforce authorization on the server for every resource (`workspace_id` scoping).
- Keep manuscript content separate from design settings.
- Never silently discard unsupported content during editor conversion or import.
- Add tests for business logic and security boundaries.
