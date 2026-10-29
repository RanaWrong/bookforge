export type ErrorCode =
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNSUPPORTED_CONTENT"
  | "IDENTITY_DISABLED"
  | "UNAVAILABLE"
  | "FORBIDDEN"
  | "AI_DISABLED"
  | "AI_PROVIDER_ERROR"
  | "EXPORT_FORMAT_UNSUPPORTED"
  | "INVITE_EXPIRED";
export type Result<T> = { ok: true; data: T } | { ok: false; code: ErrorCode };
export type BookSummary = { id: string; title: string; chapterCount: number; updatedAt: string };
export type ChapterSummary = { id: string; title: string; position: number };
export type BookDetail = { id: string; title: string; chapters: ChapterSummary[] };
export type ChapterDetail = ChapterSummary & { document: EditorDocument; revision: number; text?: string };
export type Mutation =
  | { kind: "createBook"; title: string; language: "bn" | "en" }
  | { kind: "renameBook"; bookId: string; title: string }
  | { kind: "deleteBook"; bookId: string; confirmed: true }
  | { kind: "createChapter"; bookId: string; title: string }
  | { kind: "renameChapter"; bookId: string; chapterId: string; title: string }
  | { kind: "deleteChapter"; bookId: string; chapterId: string; confirmed: true }
  | { kind: "moveChapter"; bookId: string; chapterId: string; direction: "up" | "down" }
  | { kind: "saveChapter"; bookId: string; chapterId: string; text: string; revision: number }
  | { kind: "saveDocument"; bookId: string; chapterId: string; document: EditorDocument; revision: number };
import type { EditorDocument } from "../../features/editor/types";
