-- CreateSchema
BEGIN;

CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "description" TEXT,
    "language" VARCHAR(35) NOT NULL DEFAULT 'bn',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "title" VARCHAR(300) NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB,
    "contentSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceMarkdown" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Domain checks intentionally maintained in SQL (not expressible in Prisma schema).
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_position_nonnegative" CHECK ("position" >= 0);
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_contentSchemaVersion_positive" CHECK ("contentSchemaVersion" >= 1);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Book_ownerId_updatedAt_idx" ON "Book"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_bookId_position_key" ON "Chapter"("bookId", "position");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
