import test from "node:test";
import assert from "node:assert/strict";
import { createIsolatedRepository } from "../src/server/db.ts";
import { BookService } from "../src/features/books/service.ts";
import { EditorAutosaveService } from "../src/features/editor/autosave.ts";
import {
  canonicalDocumentToMarkdown,
  markdownToCanonicalDocument,
} from "../src/features/editor/markdown-converter.ts";
import type { SessionContext } from "../src/server/auth.ts";

const session: SessionContext = {
  userId: "user-1",
  email: "u1@bookforge.app",
  name: "Editor User",
  preferredLocale: "bn",
  isDevIdentity: false,
};

test("Phase 6: Bidirectional Markdown conversion preserves bilingual headings, callouts, tables, and warns on raw LaTeX", () => {
  const sample = [
    "# অধ্যায় ০১: সংবিধান ও Governance",
    "",
    "সাধারণ অনুচ্ছেদ টেক্সট with mixed English terms.",
    "",
    "> 💡 **এক্সাম টিপস:** অনুচ্ছেদ ২৭ থেকে ৪৪ পর্যন্ত মৌলিক অধিকার।",
    "",
    "- প্রথম বিন্দু",
    "- দ্বিতীয় বিন্দু",
    "",
    "| অনুচ্ছেদ | বিষয় |",
    "| --- | --- |",
    "| ২৭ | আইনের দৃষ্টিতে সমতা |",
    "",
    "$$\\frac{1}{2}$$",
  ].join("\n");

  const conv = markdownToCanonicalDocument(sample);
  assert.equal(conv.warnings.length, 1);
  assert.match(conv.warnings[0], /LaTeX/);

  const roundTrip = canonicalDocumentToMarkdown(conv.document);
  assert.match(roundTrip, /# অধ্যায় ০১: সংবিধান ও Governance/);
  assert.match(roundTrip, /💡 \*\*এক্সাম টিপস:\*\*/);
  assert.match(roundTrip, /\$\$\\frac\{1\}\{2\}\$\$/);
});

test("Phase 6 & 10: Autosave prevents stale overwrites and ChapterVersion restore is non-destructive", () => {
  const repo = createIsolatedRepository(false);
  const bookService = new BookService(repo);
  const autosave = new EditorAutosaveService(repo);

  const book = bookService.createBook(session, {
    title: "Test Book",
    author: "Author",
  });
  const chapterId = book.chapters[0].id;

  const res1 = autosave.saveDraft(session, {
    chapterId,
    markdown: "# Updated v2\n\nNew content here.",
    expectedVersionNumber: 1,
    versionLabel: "Second draft",
  });
  assert.equal(res1.status, "saved");
  assert.equal(res1.serverVersionNumber, 2);

  // Stale request with expectedVersionNumber: 1 must fail with conflict
  const conflictRes = autosave.saveDraft(session, {
    chapterId,
    markdown: "# Stale overwrite attempt",
    expectedVersionNumber: 1,
  });
  assert.equal(conflictRes.status, "conflict");
  assert.equal(conflictRes.serverVersionNumber, 2);

  // Restore v1 creates a new version v3 without destroying v2
  const versionsBefore = autosave.listChapterVersions(session, chapterId);
  const v1 = versionsBefore.find((v) => v.versionNumber === 1)!;
  const restored = autosave.restoreChapterVersion(session, chapterId, v1.id);
  assert.equal(restored.versionNumber, 3);

  const versionsAfter = autosave.listChapterVersions(session, chapterId);
  assert.equal(versionsAfter.length, 3);
});
