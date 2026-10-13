# BookForge
Bilingual book writing and publishing platform for Bangla + English.

## Phase 1 goals
- Establish a maintainable Next.js + TypeScript foundation.
- Provide Bangla/English UI language switching.
- Add Docker-based local development and deployment foundation.
- Prepare architecture documentation and environment templates.
- Keep secrets out of Git.

## Planned stack
- Next.js App Router + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma (added in the next implementation slice)
- TipTap visual editor and CodeMirror source editor (later phases)
- Paged.js + Chromium PDF pipeline (later phases)
- Docker + Coolify deployment

## Requirements
- Node.js 22+
- npm 10+
- Docker (optional for containerized development)

## Run locally
1. Copy `.env.example` to `.env.local`.
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open http://localhost:3000

## Docker
`docker compose up --build`

## Safety rules
- Never commit `.env.local`, database passwords, API keys, or user book files.
- Keep PostgreSQL private; do not publish port 5432 to the internet.
- Validate and limit all future file uploads.
- Do not use production data for local tests.
