import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { assertDevelopmentIdentity } from "../src/lib/auth/development";
import { libraryForOwner } from "../src/modules/books/service";
import { LibraryError, MAX_CONTENT_LENGTH, movedIds, parseMutation, readText, title } from "../src/modules/books/validation";

const bookId = randomUUID();
const chapterId = randomUUID();
const invalid = (error: unknown) => error instanceof LibraryError && error.code === "INVALID_INPUT";

test("development identity fails closed in production/test and without explicit opt-in", () => {
  for (const NODE_ENV of [undefined, "production", "test", "preview"]) {
    assert.throws(() => assertDevelopmentIdentity({ NODE_ENV, BOOKFORGE_DEV_IDENTITY: "true" }), { code: "IDENTITY_DISABLED" });
  }
  for (const BOOKFORGE_DEV_IDENTITY of [undefined, "false", "1"]) {
    assert.throws(() => assertDevelopmentIdentity({ NODE_ENV: "development", BOOKFORGE_DEV_IDENTITY }), { code: "IDENTITY_DISABLED" });
  }
  assert.doesNotThrow(() => assertDevelopmentIdentity({ NODE_ENV: "development", BOOKFORGE_DEV_IDENTITY: "true" }));
});

test("valid commands normalize titles and preserve Unicode text", () => {
  assert.equal(title("  বাংলা + English  "), "বাংলা + English");
  for (const command of [
    { kind: "createBook", title: "Book", language: "bn" },
    { kind: "renameBook", bookId, title: "Renamed" },
    { kind: "deleteBook", bookId, confirmed: true },
    { kind: "createChapter", bookId, title: "অধ্যায়" },
    { kind: "renameChapter", bookId, chapterId, title: "New" },
    { kind: "deleteChapter", bookId, chapterId, confirmed: true },
    { kind: "moveChapter", bookId, chapterId, direction: "up" },
    { kind: "saveChapter", bookId, chapterId, revision: 0, text: " বাংলা\nEnglish " },
  ]) assert.deepEqual(parseMutation(command), command);
});

test("reject malformed commands, client identity, missing confirmation and oversized input", () => {
  for (const value of [null, [], {}, "createBook",
    { kind: "createBook", title: " ", language: "bn" },
    { kind: "createBook", title: "x".repeat(301), language: "en" },
    { kind: "createBook", title: "x\0", language: "bn" },
    { kind: "createBook", title: "x", language: "invalid" },
    { kind: "createBook", title: "x", language: "bn", ownerId: randomUUID() },
    { kind: "createBook", title: "x", language: "bn", userId: randomUUID() },
    { kind: "renameBook", bookId: "x' OR 1=1", title: "x" },
    { kind: "deleteBook", bookId, confirmed: "true" },
    { kind: "deleteChapter", bookId, chapterId, confirmed: false },
    { kind: "moveChapter", bookId, chapterId, direction: "sideways" },
    ...[-1, 0.5, "0", 2_147_483_647].map((revision) => ({ kind: "saveChapter", bookId, chapterId, text: "", revision })),
    { kind: "saveChapter", bookId, chapterId, revision: 0, text: "x".repeat(MAX_CONTENT_LENGTH + 1) },
    { kind: "saveChapter", bookId, chapterId, revision: 0, text: "\0" },
  ]) assert.throws(() => parseMutation(value), invalid);
});

test("ordering preserves every chapter, moves one step, and handles boundaries", () => {
  const order = ["a", "b", "c"];
  assert.deepEqual(movedIds(order, "b", "up"), ["b", "a", "c"]);
  assert.deepEqual(movedIds(order, "b", "down"), ["a", "c", "b"]);
  assert.deepEqual(movedIds(order, "a", "up"), order);
  assert.deepEqual(movedIds(order, "c", "down"), order);
  assert.deepEqual(order, ["a", "b", "c"]);
  assert.throws(() => movedIds(order, "foreign", "up"), { code: "NOT_FOUND" });
});

test("content format checks prevent silently flattening unsupported documents", () => {
  assert.equal(readText(null, 1), "");
  assert.equal(readText({ type: "plain-text", text: "বাংলা\nEnglish" }, 1), "বাংলা\nEnglish");
  for (const content of [{ type: "doc", content: [] }, { type: "plain-text", text: 12 }, []]) {
    assert.throws(() => readText(content, 1), { code: "UNSUPPORTED_CONTENT" });
  }
  assert.throws(() => readText(null, 2), { code: "UNSUPPORTED_CONTENT" });
});

test("service rejects invalid writes before opening a database connection", async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: "postgresql://unused@127.0.0.1:1/unused" }) });
  try {
    const library = libraryForOwner(randomUUID(), db);
    await assert.rejects(library.mutate({ kind: "createBook", title: "", language: "bn" }), invalid);
    await assert.rejects(library.mutate({ kind: "deleteBook", bookId, confirmed: false }), invalid);
    await assert.rejects(library.chapter(bookId, "invalid"), invalid);
  } finally { await db.$disconnect(); }
});
