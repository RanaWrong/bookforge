import test from "node:test";
import assert from "node:assert/strict";
import { createIsolatedRepository } from "../src/server/db.ts";
import { BookService } from "../src/features/books/service.ts";
import type { SessionContext } from "../src/server/auth.ts";

const sessionA: SessionContext = {
  userId: "user-a",
  email: "a@bookforge.app",
  name: "Author A",
  preferredLocale: "bn",
  isDevIdentity: false,
};

test("Phase 5: Book & Chapter CRUD maintains contiguous 1..N ordering after insert, reorder, and delete", () => {
  const repo = createIsolatedRepository(false);
  const service = new BookService(repo);

  const created = service.createBook(sessionA, {
    title: "পিএসসি লিখিত সহায়িকা",
    author: "মোঃ সোহেল রানা",
    language: "bn",
    targetWordCount: 50000,
  });

  assert.equal(created.chapterCount, 1);
  assert.equal(created.chapters[0].position, 1);

  const ch2 = service.createChapter(sessionA, {
    bookId: created.id,
    title: "অধ্যায় ০২: ইংরেজি গ্রামার",
    kind: "CHAPTER",
    markdown: "# অধ্যায় ০২\n\nEnglish grammar rules.",
  });
  const ch3 = service.createChapter(sessionA, {
    bookId: created.id,
    title: "পরিশিষ্ট ক: সংক্ষিপ্ত টিকা",
    kind: "BACKMATTER",
    markdown: "# পরিশিষ্ট ক\n\nImportant notes.",
  });

  // Reorder [ch3, ch2, ch1]
  const reordered = service.reorderChapters(sessionA, created.id, [
    ch3.id,
    ch2.id,
    created.chapters[0].id,
  ]);
  assert.deepEqual(
    reordered.map((c) => [c.id, c.position]),
    [
      [ch3.id, 1],
      [ch2.id, 2],
      [created.chapters[0].id, 3],
    ]
  );

  // Delete middle chapter (ch2) -> positions must compact cleanly to [1, 2]
  const afterDelete = service.deleteChapter(sessionA, ch2.id);
  assert.equal(afterDelete.length, 2);
  assert.equal(afterDelete[0].position, 1);
  assert.equal(afterDelete[1].position, 2);
});
