"use server";

import { requireIdentity } from "../../lib/auth/development";
import { libraryForOwner } from "../../modules/books/service";
import { LibraryError } from "../../modules/books/validation";
import type { Result } from "../../modules/books/contracts";

async function run<T>(operation: (library: ReturnType<typeof libraryForOwner>) => Promise<T>): Promise<Result<T>> {
  try {
    const owner = await requireIdentity();
    return { ok: true, data: await operation(libraryForOwner(owner)) };
  } catch (error) {
    // Do not send SQL errors, credentials, or manuscript text to the browser/logs.
    return { ok: false, code: error instanceof LibraryError ? error.code : "UNAVAILABLE" };
  }
}

export async function loadBooks() { return run((library) => library.list()); }
export async function loadBook(bookId: string) { return run((library) => library.book(bookId)); }
export async function loadChapter(bookId: string, chapterId: string) { return run((library) => library.chapter(bookId, chapterId)); }
export async function mutateLibrary(input: unknown) { return run((library) => library.mutate(input)); }
