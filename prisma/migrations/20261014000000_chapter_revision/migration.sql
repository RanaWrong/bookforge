BEGIN;
ALTER TABLE "Chapter" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_revision_nonnegative" CHECK ("revision" >= 0);
COMMIT;
