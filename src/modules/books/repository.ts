import "server-only";
import { getDb } from "../../lib/db/client";
import type { PrismaClient } from "../../generated/prisma/client";

function requireId(value: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error("A valid UUID is required.");
  }
  return value;
}

/** ownerId must come from a trusted server session, never a request body.
 * The dashboard currently uses the opt-in development identity adapter.
 * Production requests are blocked until real authentication is implemented.
 */
export function booksForOwner(
  ownerId: string,
  db: Pick<PrismaClient, "book" | "chapter"> = getDb(),
) {
  const owner = requireId(ownerId);
  return {
    list() {
      return db.book.findMany({ where: { ownerId: owner }, orderBy: { updatedAt: "desc" } });
    },
    find(bookId: string) {
      return db.book.findFirst({ where: { id: requireId(bookId), ownerId: owner } });
    },
    listChapters(bookId: string) {
      return db.chapter.findMany({
        where: { bookId: requireId(bookId), book: { ownerId: owner } },
        orderBy: { position: "asc" },
      });
    },
    findChapter(bookId: string, chapterId: string) {
      return db.chapter.findFirst({
        where: { id: requireId(chapterId), bookId: requireId(bookId), book: { ownerId: owner } },
      });
    },
  };
}
