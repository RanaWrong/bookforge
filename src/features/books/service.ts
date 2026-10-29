import { AppError } from "../../lib/errors.ts";
import { assertOwnership, type SessionContext } from "../../server/auth.ts";
import {
  getRepository,
  type BookForgeRepository,
  type BookRecord,
  type ChapterRecord,
} from "../../server/db.ts";
import {
  validateBookDesignSettings,
  type BookDesignSettingsRecord,
} from "../design/schema.ts";
import { markdownToCanonicalDocument } from "../editor/markdown-converter.ts";
import type { BookWithStats } from "./types.ts";
import {
  countManuscriptMetrics,
  slugifyTitle,
  validateCreateBookInput,
  validateCreateChapterInput,
} from "./validation.ts";

export class BookService {
  private readonly repo: BookForgeRepository;

  constructor(repo: BookForgeRepository = getRepository()) {
    this.repo = repo;
  }

  public listUserBooks(session: SessionContext): BookWithStats[] {
    const books = this.repo.listBooks(session.userId);
    return books.map((book) => this.enrichBookStats(session, book));
  }

  public getBookWithChapters(session: SessionContext, bookId: string): BookWithStats {
    const book = this.repo.getBook(session.userId, bookId);
    if (!book) {
      throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
    }
    assertOwnership(session, book.userId);
    return this.enrichBookStats(session, book);
  }

  public createBook(session: SessionContext, rawInput: unknown): BookWithStats {
    const validated = validateCreateBookInput(rawInput);
    const book = this.repo.createBook(session.userId, validated);

    const initialTitle =
      validated.language === "bn" ? "অধ্যায় ০১: সূচনা" : "Chapter 01: Introduction";
    const initialMarkdown = `# ${initialTitle}\n\n`;
    const canonical = markdownToCanonicalDocument(initialMarkdown);
    const metrics = countManuscriptMetrics(initialMarkdown);

    this.repo.createChapter(session.userId, book.id, {
      title: initialTitle,
      slug: slugifyTitle(initialTitle),
      kind: "CHAPTER",
      markdown: initialMarkdown,
      canonicalJson: JSON.stringify(canonical.document),
      wordCount: metrics.wordCount,
      characterCount: metrics.characterCount,
    });

    return this.enrichBookStats(session, book);
  }

  public renameBook(
    session: SessionContext,
    bookId: string,
    newTitle: string,
    newSubtitle?: string | null
  ): BookRecord {
    const trimmed = newTitle.trim();
    if (trimmed.length < 2 || trimmed.length > 200) {
      throw new AppError("VALIDATION_ERROR", "Book title must be between 2 and 200 characters.");
    }
    return this.repo.updateBook(session.userId, bookId, {
      title: trimmed,
      ...(newSubtitle !== undefined ? { subtitle: newSubtitle } : {}),
    });
  }

  public deleteBook(session: SessionContext, bookId: string): boolean {
    return this.repo.deleteBook(session.userId, bookId);
  }

  public createChapter(session: SessionContext, rawInput: unknown): ChapterRecord {
    const validated = validateCreateChapterInput(rawInput);
    const canonical = markdownToCanonicalDocument(validated.markdown ?? "");
    const metrics = countManuscriptMetrics(validated.markdown ?? "");

    return this.repo.createChapter(session.userId, validated.bookId, {
      title: validated.title,
      slug: slugifyTitle(validated.title),
      kind: validated.kind,
      markdown: validated.markdown,
      canonicalJson: JSON.stringify(canonical.document),
      wordCount: metrics.wordCount,
      characterCount: metrics.characterCount,
    });
  }

  public renameChapter(
    session: SessionContext,
    chapterId: string,
    newTitle: string
  ): ChapterRecord {
    const trimmed = newTitle.trim();
    if (trimmed.length < 1 || trimmed.length > 200) {
      throw new AppError("VALIDATION_ERROR", "Chapter title must be between 1 and 200 characters.");
    }
    const existing = this.repo.getChapter(session.userId, chapterId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Chapter not found or access denied.", 404);
    }
    return this.repo.saveChapterContent(session.userId, chapterId, {
      title: trimmed,
      markdown: existing.markdown,
      canonicalJson: existing.canonicalJson,
      wordCount: existing.wordCount,
      characterCount: existing.characterCount,
      createVersionSnapshot: false,
    });
  }

  public deleteChapter(session: SessionContext, chapterId: string): ChapterRecord[] {
    return this.repo.deleteChapter(session.userId, chapterId);
  }

  public reorderChapters(
    session: SessionContext,
    bookId: string,
    orderedChapterIds: string[]
  ): ChapterRecord[] {
    return this.repo.reorderChapters(session.userId, bookId, orderedChapterIds);
  }

  public updateBookDesignSettings(
    session: SessionContext,
    bookId: string,
    rawSettings: unknown
  ): BookDesignSettingsRecord {
    const validated = validateBookDesignSettings(rawSettings);
    return this.repo.saveBookDesignSettings(session.userId, bookId, validated);
  }

  private enrichBookStats(session: SessionContext, book: BookRecord): BookWithStats {
    assertOwnership(session, book.userId);
    const chapters = this.repo.listChapters(session.userId, book.id);
    const designSettings = this.repo.getBookDesignSettings(session.userId, book.id);
    const totalWords = chapters.reduce((acc, ch) => acc + ch.wordCount, 0);
    const totalCharacters = chapters.reduce((acc, ch) => acc + ch.characterCount, 0);
    const progressPercent =
      book.targetWordCount > 0
        ? Math.min(100, Math.round((totalWords / book.targetWordCount) * 100))
        : 0;

    return {
      ...book,
      chapterCount: chapters.length,
      totalWords,
      totalCharacters,
      progressPercent,
      chapters,
      designSettings,
    };
  }
}
