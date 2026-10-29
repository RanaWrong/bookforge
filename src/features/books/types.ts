import type {
  BookRecord,
  ChapterKind,
  ChapterRecord,
} from "../../server/db.ts";
import type { BookDesignSettingsRecord } from "../design/schema.ts";

export interface CreateBookInput {
  title: string;
  subtitle?: string | null;
  author: string;
  language?: "bn" | "en";
  isbn?: string | null;
  description?: string | null;
  targetWordCount?: number;
}

export interface CreateChapterInput {
  bookId: string;
  title: string;
  kind?: ChapterKind;
  markdown?: string;
}

export interface BookWithStats extends BookRecord {
  chapterCount: number;
  totalWords: number;
  totalCharacters: number;
  progressPercent: number;
  chapters: ChapterRecord[];
  designSettings: BookDesignSettingsRecord;
}
