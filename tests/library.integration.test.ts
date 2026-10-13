import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { libraryForOwner } from "../src/modules/books/service";

const testUrl = process.env.TEST_DATABASE_URL;
test("PostgreSQL CRUD, isolation, ordering under concurrency and stale saves", {
  skip: !testUrl && "Requires a migrated disposable TEST_DATABASE_URL ending in _test",
}, async () => {
  assert.ok(testUrl);
  assert.match(new URL(testUrl).pathname, /_test$/);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl, connectionTimeoutMillis: 5_000, max: 5 }) });
  const owners: string[] = [];
  try {
    for (let i = 0; i < 2; i++) owners.push((await db.user.create({ data: { email: `${randomUUID()}@example.invalid` } })).id);
    const alice = libraryForOwner(owners[0], db);
    const bob = libraryForOwner(owners[1], db);
    const book = await alice.mutate({ kind: "createBook", title: "বাংলা", language: "bn" });
    const other = await alice.mutate({ kind: "createBook", title: "Other", language: "en" });
    assert.equal((await alice.list()).find((item) => item.id === book.id)?.chapterCount, 0);
    assert.deepEqual(await bob.list(), []);
    await assert.rejects(bob.book(book.id), { code: "NOT_FOUND" });
    for (const command of [
      { kind: "renameBook", bookId: book.id, title: "Stolen" },
      { kind: "deleteBook", bookId: book.id, confirmed: true },
      { kind: "createChapter", bookId: book.id, title: "Stolen" },
    ]) await assert.rejects(bob.mutate(command), { code: "NOT_FOUND" });
    await alice.mutate({ kind: "renameBook", bookId: book.id, title: "Renamed" });
    assert.equal((await alice.book(book.id)).title, "Renamed");
    const chapters = await Promise.all(["One", "Two", "Three"].map((title) => alice.mutate({ kind: "createChapter", bookId: book.id, title })));
    const initial = (await alice.book(book.id)).chapters;
    assert.deepEqual(initial.map((item) => item.position), [0, 1, 2]);
    const chapterId = initial[1].id;
    for (const command of [
      { kind: "renameChapter", bookId: book.id, chapterId, title: "Stolen" },
      { kind: "deleteChapter", bookId: book.id, chapterId, confirmed: true },
      { kind: "moveChapter", bookId: book.id, chapterId, direction: "up" },
      { kind: "saveChapter", bookId: book.id, chapterId, text: "Stolen", revision: 0 },
    ]) {
      await assert.rejects(bob.mutate(command), { code: "NOT_FOUND" });
      await assert.rejects(alice.mutate({ ...command, bookId: other.id }), { code: "NOT_FOUND" });
    }
    await assert.rejects(bob.chapter(book.id, chapterId), { code: "NOT_FOUND" });
    await assert.rejects(alice.chapter(other.id, chapterId), { code: "NOT_FOUND" });
    await alice.mutate({ kind: "renameChapter", bookId: book.id, chapterId, title: "নতুন নাম" });
    const saved = await alice.mutate({ kind: "saveChapter", bookId: book.id, chapterId, text: "বাংলা\nEnglish <script>literal text</script>", revision: 0 });
    assert.equal(saved.revision, 1);
    assert.equal((await alice.chapter(book.id, chapterId)).title, "নতুন নাম");
    assert.equal((await alice.chapter(book.id, chapterId)).text, "বাংলা\nEnglish <script>literal text</script>");
    await assert.rejects(alice.mutate({ kind: "saveChapter", bookId: book.id, chapterId, text: "Stale overwrite", revision: 0 }), { code: "CONFLICT" });
    await alice.mutate({ kind: "moveChapter", bookId: book.id, chapterId, direction: "up" });
    assert.equal((await alice.book(book.id)).chapters[0].id, chapterId);
    // Concurrent structural edits serialize on the parent book row.
    await Promise.all([
      alice.mutate({ kind: "moveChapter", bookId: book.id, chapterId, direction: "down" }),
      alice.mutate({ kind: "createChapter", bookId: book.id, title: "Concurrent" }),
    ]);
    assert.deepEqual((await alice.book(book.id)).chapters.map((item) => item.position), [0, 1, 2, 3]);
    await alice.mutate({ kind: "deleteChapter", bookId: book.id, chapterId, confirmed: true });
    assert.deepEqual((await alice.book(book.id)).chapters.map((item) => item.position), [0, 1, 2]);
    await assert.rejects(alice.chapter(book.id, chapterId), { code: "NOT_FOUND" });
    assert.equal((await alice.list()).find((item) => item.id === book.id)?.chapterCount, 3);
    assert.equal(chapters.length, 3);
    await alice.mutate({ kind: "deleteBook", bookId: book.id, confirmed: true });
    await assert.rejects(alice.book(book.id), { code: "NOT_FOUND" });
    assert.equal(await db.chapter.count({ where: { bookId: book.id } }), 0);
  } finally {
    // Only remove fixtures owned by the random users created in THIS test.
    await db.$transaction(async (tx) => {
      await tx.chapter.deleteMany({ where: { book: { ownerId: { in: owners } } } });
      await tx.book.deleteMany({ where: { ownerId: { in: owners } } });
      await tx.user.deleteMany({ where: { id: { in: owners } } });
    });
    await db.$disconnect();
  }
});
