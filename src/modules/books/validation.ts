import type { Mutation } from "./contracts";
import { LibraryError } from "../../lib/errors";
import { validateDocument } from "../../features/editor/document";
export { LibraryError } from "../../lib/errors";

export function id(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new LibraryError("INVALID_INPUT");
  }
  return value;
}
export function title(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 300 || /[\u0000-\u001f\u007f]/.test(value)) throw new LibraryError("INVALID_INPUT");
  return value.trim();
}
export const MAX_CONTENT_LENGTH = 200_000;

export function parseMutation(value: unknown): Mutation {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LibraryError("INVALID_INPUT");
  const input = value as Record<string, unknown>;
  // Identity is never part of a command. Reject it rather than silently ignoring it.
  if ("ownerId" in input || "userId" in input) throw new LibraryError("INVALID_INPUT");
  if (input.kind === "createBook") {
    if (input.language !== "bn" && input.language !== "en") throw new LibraryError("INVALID_INPUT");
    return { kind: input.kind, title: title(input.title), language: input.language };
  }
  const bookId = id(input.bookId);
  switch (input.kind) {
    case "renameBook": return { kind: input.kind, bookId, title: title(input.title) };
    case "deleteBook":
      if (input.confirmed !== true) throw new LibraryError("INVALID_INPUT");
      return { kind: input.kind, bookId, confirmed: true };
    case "createChapter": return { kind: input.kind, bookId, title: title(input.title) };
    case "renameChapter": return { kind: input.kind, bookId, chapterId: id(input.chapterId), title: title(input.title) };
    case "deleteChapter":
      if (input.confirmed !== true) throw new LibraryError("INVALID_INPUT");
      return { kind: input.kind, bookId, chapterId: id(input.chapterId), confirmed: true };
    case "moveChapter":
      if (input.direction !== "up" && input.direction !== "down") throw new LibraryError("INVALID_INPUT");
      return { kind: input.kind, bookId, chapterId: id(input.chapterId), direction: input.direction };
    case "saveChapter":
      if (typeof input.text !== "string" || input.text.length > MAX_CONTENT_LENGTH || input.text.includes("\0") || !Number.isSafeInteger(input.revision) || typeof input.revision !== "number" || input.revision < 0 || input.revision >= 2_147_483_647) throw new LibraryError("INVALID_INPUT");
      return { kind: input.kind, bookId, chapterId: id(input.chapterId), text: input.text, revision: input.revision };
    case "saveDocument":
      if (typeof input.revision !== "number" || !Number.isSafeInteger(input.revision) || input.revision < 0 || input.revision >= 2_147_483_647) throw new LibraryError("INVALID_INPUT");
      return { kind: input.kind, bookId, chapterId: id(input.chapterId), document: validateDocument(input.document), revision: input.revision };
    default: throw new LibraryError("INVALID_INPUT");
  }
}

export function readText(content: unknown, version: number): string {
  if (version !== 1) throw new LibraryError("UNSUPPORTED_CONTENT");
  if (content === null) return "";
  if (typeof content === "object" && content !== null && "type" in content && content.type === "plain-text" && "text" in content && typeof content.text === "string") return content.text;
  throw new LibraryError("UNSUPPORTED_CONTENT");
}

export function movedIds(ids: string[], chapterId: string, direction: "up" | "down"): string[] {
  const index = ids.indexOf(chapterId);
  if (index === -1) throw new LibraryError("NOT_FOUND");
  const target = index + (direction === "up" ? -1 : 1);
  const result = [...ids];
  if (target >= 0 && target < ids.length) [result[index], result[target]] = [result[target], result[index]];
  return result;
}
