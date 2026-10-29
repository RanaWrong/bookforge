import "server-only";
import type { Prisma, PrismaClient } from "../../generated/prisma/client";
import { getDb } from "../../lib/db/client";
import type { BookDetail, BookSummary, ChapterDetail } from "./contracts";
import { id, LibraryError, movedIds, parseMutation, readText } from "./validation";
import { loadDocument } from "../../features/editor/document";

// Called only with a server-derived identity. All mutations of a book's tree
// lock its parent row first, serializing create/delete/reorder/save operations.
export function libraryForOwner(ownerId: string, db: PrismaClient = getDb()) {
  const owner = id(ownerId);
  const owned = (bookId: string) => ({ id: id(bookId), ownerId: owner });
  return {
    async list(): Promise<BookSummary[]> {
      const books = await db.book.findMany({ where: { ownerId: owner }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], select: { id: true, title: true, updatedAt: true, _count: { select: { chapters: true } } } });
      return books.map((book) => ({ id: book.id, title: book.title, updatedAt: book.updatedAt.toISOString(), chapterCount: book._count.chapters }));
    },
    async book(bookId: string): Promise<BookDetail> {
      const book = await db.book.findFirst({ where: owned(bookId), select: { id: true, title: true, chapters: { orderBy: { position: "asc" }, select: { id: true, title: true, position: true } } } });
      if (!book) throw new LibraryError("NOT_FOUND");
      return book;
    },
    async chapter(bookId: string, chapterId: string): Promise<ChapterDetail> {
      const chapter = await db.chapter.findFirst({ where: { id: id(chapterId), bookId: id(bookId), book: { ownerId: owner } } });
      if (!chapter) throw new LibraryError("NOT_FOUND");
      return {
        id: chapter.id,
        title: chapter.title,
        position: chapter.position,
        revision: chapter.revision,
        document: loadDocument(chapter.content, chapter.contentSchemaVersion),
        text: chapter.contentSchemaVersion === 1 ? readText(chapter.content, chapter.contentSchemaVersion) : undefined,
      };
    },
    async mutate(input: unknown): Promise<{ id: string; revision?: number }> {
      const command = parseMutation(input);
      if (command.kind === "createBook") {
        return db.book.create({ data: { ownerId: owner, title: command.title, language: command.language }, select: { id: true } });
      }
      return db.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "Book" WHERE "id" = ${command.bookId}::uuid AND "ownerId" = ${owner}::uuid FOR UPDATE`;
        if (rows.length !== 1) throw new LibraryError("NOT_FOUND");
        if (command.kind === "renameBook") {
          await tx.book.updateMany({ where: owned(command.bookId), data: { title: command.title, updatedAt: new Date() } });
          return { id: command.bookId };
        }
        if (command.kind === "deleteBook") {
          await tx.chapter.deleteMany({ where: { bookId: command.bookId, book: { ownerId: owner } } });
          await tx.book.deleteMany({ where: owned(command.bookId) });
          return { id: command.bookId };
        }
        // Chapter changes count as book activity on the dashboard.
        await tx.book.updateMany({ where: owned(command.bookId), data: { updatedAt: new Date() } });
        if (command.kind === "createChapter") {
          const last = await tx.chapter.aggregate({ where: { bookId: command.bookId, book: { ownerId: owner } }, _max: { position: true } });
          return tx.chapter.create({ data: { bookId: command.bookId, title: command.title, position: (last._max.position ?? -1) + 1 }, select: { id: true } });
        }
        const where = { id: command.chapterId, bookId: command.bookId, book: { ownerId: owner } };
        const chapter = await tx.chapter.findFirst({ where });
        if (!chapter) throw new LibraryError("NOT_FOUND");
        if (command.kind === "renameChapter") {
          await tx.chapter.updateMany({ where, data: { title: command.title } });
        } else if (command.kind === "saveDocument") {
          const current = loadDocument(chapter.content, chapter.contentSchemaVersion);
          // An acknowledged request can be lost on the network. Repeating its
          // exact content/revision is safe; never overwrite a different revision.
          if (chapter.revision === command.revision + 1 && JSON.stringify(current) === JSON.stringify(command.document)) return { id: command.chapterId, revision: chapter.revision };
          const saved = await tx.chapter.updateMany({ where: { ...where, revision: command.revision }, data: { content: command.document, contentSchemaVersion: 2, revision: { increment: 1 } } });
          if (saved.count !== 1) throw new LibraryError("CONFLICT");
          return { id: command.chapterId, revision: command.revision + 1 };
        } else if (command.kind === "saveChapter") {
          readText(chapter.content, chapter.contentSchemaVersion);
          const saved = await tx.chapter.updateMany({ where: { ...where, revision: command.revision }, data: { content: { type: "plain-text", text: command.text }, revision: { increment: 1 } } });
          if (saved.count !== 1) throw new LibraryError("CONFLICT");
          return { id: command.chapterId, revision: command.revision + 1 };
        } else {
          if (command.kind === "deleteChapter") await tx.chapter.deleteMany({ where });
          const chapters = await tx.chapter.findMany({ where: { bookId: command.bookId, book: { ownerId: owner } }, orderBy: { position: "asc" }, select: { id: true, position: true } });
          const ids = chapters.map((item) => item.id);
          const order = command.kind === "moveChapter" ? movedIds(ids, command.chapterId, command.direction) : ids;
          await setOrder(tx, owner, command.bookId, order, chapters.at(-1)?.position ?? -1);
        }
        return { id: command.chapterId };
      }, { timeout: 20_000 });
    },
  };
}

async function setOrder(tx: Prisma.TransactionClient, ownerId: string, bookId: string, order: string[], maxPosition: number) {
  // Park every row above the current maximum before assigning dense positions.
  // This avoids immediate UNIQUE(bookId, position) collisions without disabling constraints.
  for (const [position, chapterId] of order.entries()) {
    await tx.chapter.updateMany({ where: { id: chapterId, bookId, book: { ownerId } }, data: { position: maxPosition + 1 + position } });
  }
  for (const [position, chapterId] of order.entries()) {
    await tx.chapter.updateMany({ where: { id: chapterId, bookId, book: { ownerId } }, data: { position } });
  }
}
