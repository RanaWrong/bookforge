-- Baseline migration — canonical workspace model + Session
-- Supersedes 20261013000000_initial, 20261014000000_chapter_revision, 20261014000000_init
-- Generated to match prisma/schema.prisma (aurora workspace baseline + Session table).
BEGIN;

CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "ChapterKind" AS ENUM ('FRONTMATTER', 'CHAPTER', 'BACKMATTER');
CREATE TYPE "ExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ExportScope" AS ENUM ('BOOK', 'CHAPTER');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT,
    "preferred_locale" TEXT NOT NULL DEFAULT 'bn',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL DEFAULT 'OWNER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "workspace_members_workspace_id_user_id_key" ON "workspace_members"("workspace_id", "user_id");
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members"("user_id");

CREATE TABLE "design_profiles" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_preset" BOOLEAN NOT NULL DEFAULT false,
    "page_size" TEXT NOT NULL DEFAULT '215x275mm',
    "width_mm" DOUBLE PRECISION NOT NULL DEFAULT 215,
    "height_mm" DOUBLE PRECISION NOT NULL DEFAULT 275,
    "mirror_margins" BOOLEAN NOT NULL DEFAULT true,
    "margin_top_mm" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "margin_bottom_mm" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "margin_inside_mm" DOUBLE PRECISION NOT NULL DEFAULT 22,
    "margin_outside_mm" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "gutter_mm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "bangla_body_font" TEXT NOT NULL DEFAULT 'Noto Serif Bengali',
    "bangla_heading_font" TEXT NOT NULL DEFAULT 'Noto Sans Bengali',
    "latin_font" TEXT NOT NULL DEFAULT 'Inter',
    "body_font_size_pt" DOUBLE PRECISION NOT NULL DEFAULT 11,
    "line_height" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "paragraph_spacing_pt" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "primary_color" TEXT NOT NULL DEFAULT '#123B6D',
    "accent_color" TEXT NOT NULL DEFAULT '#F26B21',
    "running_header_left" TEXT NOT NULL DEFAULT 'BOOK_TITLE',
    "running_header_right" TEXT NOT NULL DEFAULT 'CHAPTER_TITLE',
    "page_number_placement" TEXT NOT NULL DEFAULT 'OUTSIDE_CORNER',
    "chapter_starts_new_page" BOOLEAN NOT NULL DEFAULT true,
    "watermark_text" TEXT,
    "include_qr_code" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "design_profiles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "design_profiles_workspace_id_idx" ON "design_profiles"("workspace_id");

CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "design_profile_id" TEXT,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "author" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'bn',
    "isbn" TEXT,
    "description" TEXT,
    "target_word_count" INTEGER NOT NULL DEFAULT 45000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "books_workspace_id_idx" ON "books"("workspace_id");

CREATE TABLE "parts" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "parts_book_id_position_key" ON "parts"("book_id", "position");
CREATE INDEX "parts_workspace_id_book_id_idx" ON "parts"("workspace_id", "book_id");

CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "part_id" TEXT,
    "kind" "ChapterKind" NOT NULL DEFAULT 'CHAPTER',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "markdown" TEXT NOT NULL DEFAULT '',
    "canonical_json" TEXT NOT NULL DEFAULT '{"schemaVersion":1,"blocks":[]}',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "character_count" INTEGER NOT NULL DEFAULT 0,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "content" JSONB,
    "content_schema_version" INTEGER NOT NULL DEFAULT 1,
    "source_markdown" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chapters_book_id_position_key" ON "chapters"("book_id", "position");
CREATE INDEX "chapters_workspace_id_book_id_idx" ON "chapters"("workspace_id", "book_id");
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_position_nonnegative" CHECK ("position" >= 0);
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_contentSchemaVersion_positive" CHECK ("content_schema_version" >= 1);
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_revision_nonnegative" CHECK ("revision" >= 0);

CREATE TABLE "document_history" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "revision_number" INTEGER NOT NULL,
    "label" TEXT,
    "markdown" TEXT NOT NULL,
    "canonical_json" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "created_by_id" TEXT,
    "restored_from_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_history_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "document_history_chapter_id_revision_number_key" ON "document_history"("chapter_id", "revision_number");
CREATE INDEX "document_history_workspace_id_chapter_id_idx" ON "document_history"("workspace_id", "chapter_id");

CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "book_id" TEXT,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "alt_text" TEXT NOT NULL DEFAULT '',
    "storage_key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "assets_storage_key_key" ON "assets"("storage_key");
CREATE INDEX "assets_workspace_id_book_id_idx" ON "assets"("workspace_id", "book_id");

CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "book_id" TEXT,
    "source_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "chapters_count" INTEGER NOT NULL DEFAULT 0,
    "warnings_json" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "import_logs_workspace_id_idx" ON "import_logs"("workspace_id");

CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "chapter_id" TEXT,
    "requested_by_id" TEXT,
    "scope" "ExportScope" NOT NULL DEFAULT 'BOOK',
    "status" "ExportStatus" NOT NULL DEFAULT 'PENDING',
    "design_profile_snapshot" TEXT NOT NULL,
    "page_count" INTEGER,
    "file_size_bytes" INTEGER,
    "warnings_json" TEXT NOT NULL DEFAULT '[]',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "export_jobs_workspace_id_book_id_idx" ON "export_jobs"("workspace_id", "book_id");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "design_profiles" ADD CONSTRAINT "design_profiles_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "books" ADD CONSTRAINT "books_design_profile_id_fkey" FOREIGN KEY ("design_profile_id") REFERENCES "design_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "parts" ADD CONSTRAINT "parts_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_part_id_fkey" FOREIGN KEY ("part_id") REFERENCES "parts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "document_history" ADD CONSTRAINT "document_history_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_history" ADD CONSTRAINT "document_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assets" ADD CONSTRAINT "assets_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
