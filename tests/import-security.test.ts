import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createIsolatedRepository } from "../src/server/db.ts";
import { BookService } from "../src/features/books/service.ts";
import {
  ManuscriptImportService,
  parseDocxStructuredImport,
  parseMarkdownImport,
  validateAndParseZipArchive,
  withTemporaryImportStagingDir,
} from "../src/features/import/import-service.ts";
import type { SessionContext } from "../src/server/auth.ts";

const session: SessionContext = {
  userId: "user-import-1",
  email: "imp@bookforge.app",
  name: "Importer",
  preferredLocale: "bn",
  isDevIdentity: false,
};

test("Phase 7: Import pipeline supports chapter reordering, renaming, exclusion, and guaranteed temp directory cleanup", async () => {
  let capturedStagingDir = "";
  await withTemporaryImportStagingDir((dir) => {
    capturedStagingDir = dir;
    assert.ok(fs.existsSync(dir));
  });
  assert.equal(fs.existsSync(capturedStagingDir), false);

  const repo = createIsolatedRepository(false);
  const bookService = new BookService(repo);
  const importer = new ManuscriptImportService(repo);

  const book = bookService.createBook(session, {
    title: "Target Import Book",
    author: "Author",
  });

  const md = [
    "# Chapter A\n\nFirst imported chapter body text with enough words.",
    "# Chapter B (Draft to Exclude)\n\nExcluded chapter body text with enough words.",
    "# Chapter C\n\nThird imported chapter body text with enough words.",
  ].join("\n\n");

  const report = parseMarkdownImport("bundle.md", md);
  assert.equal(report.chapters.length, 3);

  // Commit with Chapter C first (renamed), Chapter B excluded, and Chapter A second
  const committed = importer.commitConfirmedImport(session, book.id, report, [
    { candidateId: "cand-3", title: "Chapter C (Renamed First)", excluded: false },
    { candidateId: "cand-2", excluded: true },
    { candidateId: "cand-1", title: "Chapter A (Second)", excluded: false },
  ]);

  assert.equal(committed.length, 2);
  assert.equal(committed[0].title, "Chapter C (Renamed First)");
  assert.equal(committed[1].title, "Chapter A (Second)");
});

test("Phase 7: Import security rejects ZIP path traversal, macro/script files, and decompression bombs", () => {
  assert.throws(() => {
    parseDocxStructuredImport("malicious.docm", "<w:document/>");
  }, /Macro-enabled Word documents/);

  assert.throws(() => {
    validateAndParseZipArchive("traversal.zip", [
      {
        path: "../../etc/passwd",
        compressedBytes: 100,
        uncompressedBytes: 200,
        content: "root",
      },
    ]);
  }, /path traversal/);

  assert.throws(() => {
    validateAndParseZipArchive("payload.zip", [
      {
        path: "chapters/install.sh",
        compressedBytes: 100,
        uncompressedBytes: 200,
        content: "#!/bin/sh",
      },
    ]);
  }, /disallowed executable/);

  assert.throws(() => {
    validateAndParseZipArchive("bomb.zip", [
      {
        path: "ch01.md",
        compressedBytes: 100,
        uncompressedBytes: 10000,
        content: "# Bomb",
      },
    ]);
  }, /compression ratio/);
});
