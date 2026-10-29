-- v2 additive migration — collaboration, export pipeline, AI groundwork
-- Adds new columns to export_jobs and creates workspace_invites,
-- yjs_snapshots, and comments tables.
-- Idempotent: uses IF NOT EXISTS throughout.
BEGIN;

-- ──────────────────────────────────────────────────────────────
--  export_jobs — three new columns added in v2 schema
-- ──────────────────────────────────────────────────────────────
ALTER TABLE "export_jobs" ADD COLUMN IF NOT EXISTS "format" TEXT NOT NULL DEFAULT 'PDF';
ALTER TABLE "export_jobs" ADD COLUMN IF NOT EXISTS "output_storage_key" TEXT;
ALTER TABLE "export_jobs" ADD COLUMN IF NOT EXISTS "download_url" TEXT;

-- ──────────────────────────────────────────────────────────────
--  workspace_invites — email-based team invitation (Requirement 5)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workspace_invites" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'EDITOR',
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invites_token_hash_key" ON "workspace_invites"("token_hash");
CREATE INDEX IF NOT EXISTS "workspace_invites_workspace_id_idx" ON "workspace_invites"("workspace_id");
CREATE INDEX IF NOT EXISTS "workspace_invites_expires_at_idx" ON "workspace_invites"("expires_at");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_invites_workspace_id_fkey'
    ) THEN
        ALTER TABLE "workspace_invites"
            ADD CONSTRAINT "workspace_invites_workspace_id_fkey"
            FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'workspace_invites_created_by_id_fkey'
    ) THEN
        ALTER TABLE "workspace_invites"
            ADD CONSTRAINT "workspace_invites_created_by_id_fkey"
            FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
--  yjs_snapshots — persisted Yjs CRDT state per chapter (Requirement 6.4)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "yjs_snapshots" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "snapshot" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "yjs_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "yjs_snapshots_chapter_id_key" ON "yjs_snapshots"("chapter_id");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'yjs_snapshots_chapter_id_fkey'
    ) THEN
        ALTER TABLE "yjs_snapshots"
            ADD CONSTRAINT "yjs_snapshots_chapter_id_fkey"
            FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ──────────────────────────────────────────────────────────────
--  comments — inline review comments anchored to chapter text (Requirements 7.4–7.7)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "comments" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "author_id" TEXT,
    "anchor_start" INTEGER NOT NULL,
    "anchor_end" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "comments_chapter_id_idx" ON "comments"("chapter_id");
CREATE INDEX IF NOT EXISTS "comments_workspace_id_chapter_id_idx" ON "comments"("workspace_id", "chapter_id");

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'comments_workspace_id_fkey'
    ) THEN
        ALTER TABLE "comments"
            ADD CONSTRAINT "comments_workspace_id_fkey"
            FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'comments_chapter_id_fkey'
    ) THEN
        ALTER TABLE "comments"
            ADD CONSTRAINT "comments_chapter_id_fkey"
            FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'comments_author_id_fkey'
    ) THEN
        ALTER TABLE "comments"
            ADD CONSTRAINT "comments_author_id_fkey"
            FOREIGN KEY ("author_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'comments_resolved_by_id_fkey'
    ) THEN
        ALTER TABLE "comments"
            ADD CONSTRAINT "comments_resolved_by_id_fkey"
            FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;
