# Phase 1 — Executable Implementation Plan

## Step 1: Create private GitHub repository
Create `RanaWrong/bookforge` with `main` as default branch. Add the files from this starter bundle. Do not add secrets.

## Step 2: Verify local prerequisites
```bash
node --version
npm --version
docker --version
```
Use Node.js 22+.

## Step 3: Run locally
```bash
cp .env.example .env.local
npm install
npm run dev
```
Windows PowerShell:
```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

## Step 4: Validate
```bash
npm run lint
npm run build
```

## Step 5: Verify Docker
```bash
docker compose up --build
```

## Step 6: Deploy after local verification
Connect the private GitHub repository to Coolify. Configure build/deploy, domain and HTTPS. Add secrets in Coolify environment settings, not in Git.

## Phase 1 definition of done
- App starts locally and in Docker.
- Home screen has Bangla/English language switch.
- `npm run lint` and `npm run build` pass.
- Architecture and security rules are documented.
- No database port or secret is exposed.

## Next slice
Add PostgreSQL service and Prisma schema for users, workspaces, books, chapters, design profiles, assets, import jobs and export jobs. Then implement book/chapter CRUD.
