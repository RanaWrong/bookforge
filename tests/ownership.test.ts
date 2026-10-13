import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { booksForOwner } from "../src/modules/books/repository";

test("invalid resource and owner IDs are rejected before querying", async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://unused@127.0.0.1:1/unused" }) });
  try {
    assert.throws(() => booksForOwner("", db), /UUID/);
    assert.throws(() => booksForOwner("not-a-uuid", db), /UUID/);
    const books = booksForOwner(randomUUID(), db);
    assert.throws(() => books.find("' OR true --"), /UUID/);
    assert.throws(() => books.listChapters(""), /UUID/);
    assert.throws(() => books.findChapter(randomUUID(), ""), /UUID/);
  } finally {
    await db.$disconnect();
  }
});

const testUrl = process.env.TEST_DATABASE_URL;

test("PostgreSQL ownership, Unicode, ordering and relational constraints", {
  skip: !testUrl && "Set TEST_DATABASE_URL to a migrated disposable database ending in _test",
}, async () => {
  assert.ok(testUrl);
  assert.match(new URL(testUrl).pathname, /_test$/, "Use a dedicated database ending in _test");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: testUrl, connectionTimeoutMillis: 5_000 }) });
  const rollback = new Error("Rollback test fixtures");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const alice = await tx.user.create({ data: { email: `${randomUUID()}@example.invalid` } });
      const bob = await tx.user.create({ data: { email: `${randomUUID()}@example.invalid` } });
      const book = await tx.book.create({ data: { ownerId: alice.id, title: "বাংলা + English" } });
      const otherBook = await tx.book.create({ data: { ownerId: alice.id, title: "Other" } });
      const chapter = await tx.chapter.create({ data: { bookId: book.id, title: "অধ্যায়", position: 2, content: { type: "doc", content: [] }, sourceMarkdown: "# বাংলা" } });
      await tx.chapter.create({ data: { bookId: book.id, title: "First", position: 0 } });
      const owned = booksForOwner(alice.id, tx);
      const foreign = booksForOwner(bob.id, tx);
      assert.equal((await owned.find(book.id))?.title, "বাংলা + English");
      assert.equal(await foreign.find(book.id), null);
      assert.deepEqual(await foreign.list(), []);
      assert.deepEqual(await foreign.listChapters(book.id), []);
      assert.equal(await foreign.findChapter(book.id, chapter.id), null);
      assert.equal(await owned.findChapter(otherBook.id, chapter.id), null);
      assert.equal((await owned.findChapter(book.id, chapter.id))?.sourceMarkdown, "# বাংলা");
      assert.deepEqual((await owned.listChapters(book.id)).map((item) => item.position), [0, 2]);
      // Savepoints let the same transaction continue after expected PG errors.
      await tx.$executeRawUnsafe("SAVEPOINT constraint_check");
      await assert.rejects(tx.chapter.create({ data: { bookId: book.id, title: "Duplicate", position: 0 } }), { code: "P2002" });
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT constraint_check");
      await assert.rejects(tx.chapter.create({ data: { bookId: randomUUID(), title: "Orphan", position: 0 } }), { code: "P2003" });
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT constraint_check");
      await assert.rejects(tx.book.delete({ where: { id: book.id } }), { code: "P2003" });
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT constraint_check");
      await assert.rejects(tx.chapter.create({ data: { bookId: book.id, title: "Invalid position", position: -1 } }));
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT constraint_check");
      await assert.rejects(tx.chapter.create({ data: { bookId: book.id, title: "Invalid version", position: 3, contentSchemaVersion: 0 } }));
      await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT constraint_check");
      throw rollback;
    }, { timeout: 20_000 }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
