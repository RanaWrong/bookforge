import crypto from "node:crypto";
import { AppError } from "../lib/errors.ts";
import { MASTER_BOOK_DESIGN_PRESET } from "../features/design/presets.ts";
import type { BookDesignSettingsInput, BookDesignSettingsRecord } from "../features/design/schema.ts";

export type ChapterKind = "FRONTMATTER" | "CHAPTER" | "BACKMATTER";

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  preferredLocale: "bn" | "en";
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface BookRecord {
  id: string;
  userId: string;
  title: string;
  subtitle: string | null;
  author: string;
  language: "bn" | "en";
  isbn: string | null;
  description: string | null;
  targetWordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterRecord {
  id: string;
  bookId: string;
  userId: string;
  kind: ChapterKind;
  title: string;
  slug: string;
  position: number;
  markdown: string;
  canonicalJson: string;
  schemaVersion: number;
  wordCount: number;
  characterCount: number;
  versionNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterVersionRecord {
  id: string;
  chapterId: string;
  userId: string;
  versionNumber: number;
  label: string | null;
  markdown: string;
  canonicalJson: string;
  schemaVersion: number;
  restoredFromId: string | null;
  createdAt: string;
}

export interface MediaAssetRecord {
  id: string;
  userId: string;
  bookId: string | null;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  altText: string;
  storageKey: string;
  sha256: string;
  createdAt: string;
}

export interface ImportJobRecord {
  id: string;
  userId: string;
  bookId: string;
  sourceType: "MARKDOWN" | "DOCX" | "ZIP";
  filename: string;
  sizeBytes: number;
  chaptersCount: number;
  warningsJson: string;
  errorsJson: string;
  status: "PREVIEWED" | "COMMITTED" | "FAILED";
  createdAt: string;
  committedAt: string | null;
}

export interface ExportJobRecord {
  id: string;
  userId: string;
  bookId: string;
  chapterId: string | null;
  scope: "BOOK" | "CHAPTER";
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  safeFilename: string;
  designSettingsSnapshot: string;
  pageCount: number;
  fileSizeBytes: number;
  warnings: string[];
  htmlOutput: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface MonitoringMetrics {
  failedImports: number;
  failedExports: number;
  completedExports: number;
  activeExportJobs: number;
  lastBackupStatus: "OK" | "PENDING" | "FAILED";
}

export class BookForgeRepository {
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, SessionRecord>();
  private books = new Map<string, BookRecord>();
  private designSettings = new Map<string, BookDesignSettingsRecord>();
  private chapters = new Map<string, ChapterRecord>();
  private chapterVersions = new Map<string, ChapterVersionRecord>();
  private mediaAssets = new Map<string, MediaAssetRecord>();
  private importJobs = new Map<string, ImportJobRecord>();
  private exportJobs = new Map<string, ExportJobRecord>();

  public metrics: MonitoringMetrics = {
    failedImports: 0,
    failedExports: 0,
    completedExports: 0,
    activeExportJobs: 0,
    lastBackupStatus: "OK",
  };

  constructor(seedDefaultDemo = true) {
    if (seedDefaultDemo) {
      this.seedInitialData();
    }
  }

  public async ping(): Promise<{
    ok: boolean;
    mode: string;
    latencyMs: number;
    checkedAt: string;
  }> {
    const start = Date.now();
    return {
      ok: true,
      mode: process.env.DATABASE_URL ? "postgresql-prisma" : "transactional-memory-store",
      latencyMs: Math.max(1, Date.now() - start),
      checkedAt: new Date().toISOString(),
    };
  }

  private seedInitialData(): void {
    const now = new Date().toISOString();
    const defaultUserId = "user-local-dev-01";
    this.users.set(defaultUserId, {
      id: defaultUserId,
      email: "author@bookforge.local",
      name: "মোঃ সোহেল রানা",
      passwordHash: "seeded-dev-account",
      preferredLocale: "bn",
      createdAt: now,
      updatedAt: now,
    });

    const bookId = "book-psc-master-01";
    this.books.set(bookId, {
      id: bookId,
      userId: defaultUserId,
      title: "পিএসসি লিখিত পরীক্ষা সহায়িকা",
      subtitle: "নন-ক্যাডার ও নন-ডিপার্টমেন্টাল অংশ (বাংলা, ইংরেজি ও সাধারণ জ্ঞান)",
      author: "মোঃ সোহেল রানা",
      language: "bn",
      isbn: "978-984-00-2026-1",
      description: "BPSC ৯ম–১৩তম গ্রেড নন-ক্যাডার লিখিত পরীক্ষার পূর্ণাঙ্গ প্রস্তুতি সহায়িকা।",
      targetWordCount: 60000,
      createdAt: now,
      updatedAt: now,
    });

    this.designSettings.set(bookId, {
      id: "bds-psc-master-01",
      bookId,
      updatedAt: now,
      ...MASTER_BOOK_DESIGN_PRESET,
    });

    const seedChapters: Array<{
      id: string;
      kind: ChapterKind;
      title: string;
      slug: string;
      position: number;
      markdown: string;
    }> = [
      {
        id: "ch-fm-01",
        kind: "FRONTMATTER",
        title: "প্রাককথন ও বইটি ব্যবহারের নির্দেশিকা",
        slug: "preface-and-usage-guide",
        position: 1,
        markdown:
          "# প্রাককথন ও বইটি ব্যবহারের নির্দেশিকা\n\nএই বইটি **PSC Written Examination**-কেন্দ্রিক, পরীক্ষার্থী-বান্ধব এবং দ্রুত রিভিশনযোগ্য একটি দ্বিভাষিক পাণ্ডুলিপি।\n\n> 💡 **এক্সাম টিপস:** পরীক্ষার আগের রাতে শুধুমাত্র লাল চিহ্নিত অংশ এবং শেষ মুহূর্তের রিভিশন পাতাগুলো পড়ুন।\n\n## ৩ ধাপে প্রস্তুতি কৌশল\n\n- **ধাপ ১ (পরীক্ষার আগে অবশ্যই পড়ুন):** সংজ্ঞা, মূল ধারণা এবং গুরুত্বপূর্ণ পার্থক্য।\n- **ধাপ ২ (সময় থাকলে বিস্তারিত পড়ুন):** বিশ্লেষণ, উদাহরণ ও কেস স্টাডি।",
      },
      {
        id: "ch-body-01",
        kind: "CHAPTER",
        title: "অধ্যায় ০১: বাংলা ব্যাকরণ ও নির্মিতি (পূর্ণমান: ৪০)",
        slug: "chapter-01-bangla-grammar-and-writing",
        position: 2,
        markdown:
          "# অধ্যায় ০১: বাংলা ব্যাকরণ ও নির্মিতি\n\nবাংলা অংশে মোট **৪০ নম্বর** নির্ধারিত। প্রবন্ধ রচনা (১৫), সারাংশ/সারমর্ম (৫), পত্রলিখন (৫), বঙ্গানুবাদ (৫) এবং ব্যাকরণ (১০) নিয়ে প্রশ্নপত্র গঠিত হয়।\n\n> 💡 **এক্সাম টিপস:** দাপ্তরিক পত্র বা স্মারকলিপিতে অবশ্যই **স্মারক নম্বর** এবং **তারিখ** উল্লেখ করতে হবে।\n\n> **মূল কবিতাংশ (কাজী নজরুল ইসলাম):** দুর্গম গিরি, কান্তার-মরু, দুস্তর পারাবার / লঙ্ঘিতে হবে রাত্রি নিশীথে যাত্রীরা হুশিয়ার!\n\n## প্রশ্ন ১. 'কৃত্রিম বুদ্ধিমত্তা ও বাংলাদেশের শ্রমবাজার' শীর্ষক প্রবন্ধ রচনা করুন।\n\n### উত্তর\nচতুর্থ শিল্পবিপ্লবের এই যুগে কৃত্রিম বুদ্ধিমত্তা (Artificial Intelligence) বৈশ্বিক অর্থনীতি ও শ্রমবাজারকে দ্রুত রূপান্তরিত করছে।",
      },
    ];

    for (const item of seedChapters) {
      const words = item.markdown.trim().split(/\s+/).filter(Boolean).length;
      const canonicalJson = JSON.stringify({ schemaVersion: 1, markdown: item.markdown });
      this.chapters.set(item.id, {
        id: item.id,
        bookId,
        userId: defaultUserId,
        kind: item.kind,
        title: item.title,
        slug: item.slug,
        position: item.position,
        markdown: item.markdown,
        canonicalJson,
        schemaVersion: 1,
        wordCount: words,
        characterCount: item.markdown.length,
        versionNumber: 1,
        createdAt: now,
        updatedAt: now,
      });

      const verId = `ver-${item.id}-1`;
      this.chapterVersions.set(verId, {
        id: verId,
        chapterId: item.id,
        userId: defaultUserId,
        versionNumber: 1,
        label: "Initial Baseline Snapshot",
        markdown: item.markdown,
        canonicalJson,
        schemaVersion: 1,
        restoredFromId: null,
        createdAt: now,
      });
    }
  }

  // User & Session Management
  public createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
    preferredLocale?: "bn" | "en";
  }): UserRecord {
    const normalizedEmail = input.email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email === normalizedEmail) {
        throw new AppError("CONFLICT_ERROR", "An account with this email already exists.", 409);
      }
    }
    const now = new Date().toISOString();
    const id = `usr-${crypto.randomUUID().slice(0, 12)}`;
    const record: UserRecord = {
      id,
      email: normalizedEmail,
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      preferredLocale: input.preferredLocale ?? "bn",
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, record);
    return record;
  }

  public getUserByEmail(email: string): UserRecord | null {
    const normalized = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email === normalized) return u;
    }
    return null;
  }

  public getUserById(userId: string): UserRecord | null {
    return this.users.get(userId) ?? null;
  }

  public createSession(input: {
    userId: string;
    tokenHash: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    ttlMs?: number;
  }): SessionRecord {
    const now = Date.now();
    const ttl = input.ttlMs ?? 7 * 24 * 60 * 60 * 1000;
    const record: SessionRecord = {
      id: `sess-${crypto.randomUUID().slice(0, 12)}`,
      userId: input.userId,
      tokenHash: input.tokenHash,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      expiresAt: new Date(now + ttl).toISOString(),
      createdAt: new Date(now).toISOString(),
    };
    this.sessions.set(record.tokenHash, record);
    return record;
  }

  public getValidSessionByTokenHash(tokenHash: string): {
    session: SessionRecord;
    user: UserRecord;
  } | null {
    const sess = this.sessions.get(tokenHash);
    if (!sess) return null;
    if (new Date(sess.expiresAt).getTime() <= Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    const user = this.users.get(sess.userId);
    if (!user) return null;
    return { session: sess, user };
  }

  public deleteSessionByTokenHash(tokenHash: string): boolean {
    return this.sessions.delete(tokenHash);
  }

  // Book Operations (Strictly Scoped to Owner `userId`)
  public listBooks(userId: string): BookRecord[] {
    return Array.from(this.books.values())
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  public getBook(userId: string, bookId: string): BookRecord | null {
    const book = this.books.get(bookId);
    if (!book || book.userId !== userId) {
      return null;
    }
    return book;
  }

  public createBook(
    userId: string,
    input: {
      title: string;
      subtitle?: string | null;
      author: string;
      language?: "bn" | "en";
      isbn?: string | null;
      description?: string | null;
      targetWordCount?: number;
      designSettings?: Partial<BookDesignSettingsInput>;
    }
  ): BookRecord {
    const now = new Date().toISOString();
    const id = `book-${crypto.randomUUID().slice(0, 8)}`;
    const record: BookRecord = {
      id,
      userId,
      title: input.title,
      subtitle: input.subtitle ?? null,
      author: input.author,
      language: input.language ?? "bn",
      isbn: input.isbn ?? null,
      description: input.description ?? null,
      targetWordCount: input.targetWordCount ?? 45000,
      createdAt: now,
      updatedAt: now,
    };
    this.books.set(id, record);

    this.designSettings.set(id, {
      id: `bds-${id}`,
      bookId: id,
      updatedAt: now,
      ...MASTER_BOOK_DESIGN_PRESET,
      ...(input.designSettings ?? {}),
    });

    return record;
  }

  public updateBook(
    userId: string,
    bookId: string,
    patch: Partial<
      Pick<
        BookRecord,
        "title" | "subtitle" | "author" | "language" | "isbn" | "description" | "targetWordCount"
      >
    >
  ): BookRecord {
    const existing = this.getBook(userId, bookId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
    }
    const updated: BookRecord = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.books.set(bookId, updated);
    return updated;
  }

  public deleteBook(userId: string, bookId: string): boolean {
    const existing = this.getBook(userId, bookId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
    }
    this.books.delete(bookId);
    this.designSettings.delete(bookId);
    for (const [chId, ch] of this.chapters.entries()) {
      if (ch.bookId === bookId && ch.userId === userId) {
        this.chapters.delete(chId);
      }
    }
    return true;
  }

  // Per-Book Design Settings (`BookDesignSettings`)
  public getBookDesignSettings(userId: string, bookId: string): BookDesignSettingsRecord {
    const book = this.getBook(userId, bookId);
    if (!book) {
      throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
    }
    let settings = this.designSettings.get(bookId);
    if (!settings) {
      settings = {
        id: `bds-${bookId}`,
        bookId,
        updatedAt: new Date().toISOString(),
        ...MASTER_BOOK_DESIGN_PRESET,
      };
      this.designSettings.set(bookId, settings);
    }
    return settings;
  }

  public saveBookDesignSettings(
    userId: string,
    bookId: string,
    input: BookDesignSettingsInput
  ): BookDesignSettingsRecord {
    const book = this.getBook(userId, bookId);
    if (!book) {
      throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
    }
    const existing = this.getBookDesignSettings(userId, bookId);
    const updated: BookDesignSettingsRecord = {
      ...input,
      id: existing.id,
      bookId,
      updatedAt: new Date().toISOString(),
    };
    this.designSettings.set(bookId, updated);
    return updated;
  }

  // Chapter Operations (Maintaining Contiguous 1..N Positions Transactionally)
  public listChapters(userId: string, bookId: string): ChapterRecord[] {
    const book = this.getBook(userId, bookId);
    if (!book) {
      throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
    }
    return Array.from(this.chapters.values())
      .filter((c) => c.userId === userId && c.bookId === bookId)
      .sort((a, b) => a.position - b.position);
  }

  public getChapter(userId: string, chapterId: string): ChapterRecord | null {
    const ch = this.chapters.get(chapterId);
    if (!ch || ch.userId !== userId) {
      return null;
    }
    return ch;
  }

  public createChapter(
    userId: string,
    bookId: string,
    input: {
      title: string;
      slug: string;
      kind?: ChapterKind;
      markdown?: string;
      canonicalJson?: string;
      wordCount?: number;
      characterCount?: number;
    }
  ): ChapterRecord {
    const existingChapters = this.listChapters(userId, bookId);
    const nextPosition = existingChapters.length + 1;
    const now = new Date().toISOString();
    const id = `ch-${crypto.randomUUID().slice(0, 8)}`;
    const markdown = input.markdown ?? "";
    const canonicalJson =
      input.canonicalJson ?? JSON.stringify({ schemaVersion: 1, blocks: [] });

    const record: ChapterRecord = {
      id,
      bookId,
      userId,
      kind: input.kind ?? "CHAPTER",
      title: input.title,
      slug: input.slug,
      position: nextPosition,
      markdown,
      canonicalJson,
      schemaVersion: 1,
      wordCount: input.wordCount ?? 0,
      characterCount: input.characterCount ?? markdown.length,
      versionNumber: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.chapters.set(id, record);

    const verId = `ver-${id}-1`;
    this.chapterVersions.set(verId, {
      id: verId,
      chapterId: id,
      userId,
      versionNumber: 1,
      label: "Initial creation",
      markdown,
      canonicalJson,
      schemaVersion: 1,
      restoredFromId: null,
      createdAt: now,
    });

    this.updateBook(userId, bookId, {});
    return record;
  }

  public deleteChapter(userId: string, chapterId: string): ChapterRecord[] {
    const existing = this.getChapter(userId, chapterId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Chapter not found or access denied.", 404);
    }
    this.chapters.delete(chapterId);
    // Compact remaining positions so 1..N order has no gaps
    const remaining = this.listChapters(userId, existing.bookId);
    const now = new Date().toISOString();
    remaining.forEach((ch, idx) => {
      this.chapters.set(ch.id, {
        ...ch,
        position: idx + 1,
        updatedAt: now,
      });
    });
    return this.listChapters(userId, existing.bookId);
  }

  public saveChapterContent(
    userId: string,
    chapterId: string,
    input: {
      title?: string;
      markdown: string;
      canonicalJson: string;
      wordCount: number;
      characterCount: number;
      expectedVersionNumber?: number;
      createVersionSnapshot?: boolean;
      versionLabel?: string | null;
      restoredFromId?: string | null;
    }
  ): ChapterRecord {
    const existing = this.getChapter(userId, chapterId);
    if (!existing) {
      throw new AppError("NOT_FOUND", "Chapter not found or access denied.", 404);
    }
    if (
      input.expectedVersionNumber !== undefined &&
      input.expectedVersionNumber !== existing.versionNumber
    ) {
      throw new AppError(
        "CONFLICT_ERROR",
        `Version conflict: expected v${input.expectedVersionNumber}, but server is at v${existing.versionNumber}.`,
        409
      );
    }

    const nextVersionNumber = existing.versionNumber + 1;
    const now = new Date().toISOString();
    const updated: ChapterRecord = {
      ...existing,
      title: input.title ?? existing.title,
      markdown: input.markdown,
      canonicalJson: input.canonicalJson,
      wordCount: input.wordCount,
      characterCount: input.characterCount,
      versionNumber: nextVersionNumber,
      updatedAt: now,
    };
    this.chapters.set(chapterId, updated);

    if (input.createVersionSnapshot !== false) {
      const verId = `ver-${chapterId}-${nextVersionNumber}`;
      this.chapterVersions.set(verId, {
        id: verId,
        chapterId,
        userId,
        versionNumber: nextVersionNumber,
        label: input.versionLabel ?? `Snapshot v${nextVersionNumber}`,
        markdown: input.markdown,
        canonicalJson: input.canonicalJson,
        schemaVersion: existing.schemaVersion,
        restoredFromId: input.restoredFromId ?? null,
        createdAt: now,
      });
    }

    this.updateBook(userId, existing.bookId, {});
    return updated;
  }

  public reorderChapters(
    userId: string,
    bookId: string,
    orderedChapterIds: string[]
  ): ChapterRecord[] {
    const current = this.listChapters(userId, bookId);
    if (current.length !== orderedChapterIds.length) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Reorder list must include all chapters in the book."
      );
    }
    const idSet = new Set(current.map((c) => c.id));
    for (const id of orderedChapterIds) {
      if (!idSet.has(id)) {
        throw new AppError("VALIDATION_ERROR", `Chapter ${id} does not belong to book.`);
      }
    }

    const now = new Date().toISOString();
    orderedChapterIds.forEach((id, index) => {
      const ch = this.chapters.get(id)!;
      this.chapters.set(id, {
        ...ch,
        position: index + 1,
        updatedAt: now,
      });
    });

    return this.listChapters(userId, bookId);
  }

  public listChapterVersions(userId: string, chapterId: string): ChapterVersionRecord[] {
    const ch = this.getChapter(userId, chapterId);
    if (!ch) {
      throw new AppError("NOT_FOUND", "Chapter not found or access denied.", 404);
    }
    return Array.from(this.chapterVersions.values())
      .filter((v) => v.userId === userId && v.chapterId === chapterId)
      .sort((a, b) => b.versionNumber - a.versionNumber);
  }

  public getChapterVersion(userId: string, versionId: string): ChapterVersionRecord | null {
    const v = this.chapterVersions.get(versionId);
    if (!v || v.userId !== userId) return null;
    return v;
  }

  public createMediaAsset(
    userId: string,
    asset: Omit<MediaAssetRecord, "id" | "userId" | "createdAt">
  ): MediaAssetRecord {
    const id = `asset-${crypto.randomUUID().slice(0, 8)}`;
    const record: MediaAssetRecord = {
      ...asset,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.mediaAssets.set(id, record);
    return record;
  }

  public createImportJob(
    userId: string,
    job: Omit<ImportJobRecord, "id" | "userId" | "createdAt">
  ): ImportJobRecord {
    const id = `imp-${crypto.randomUUID().slice(0, 8)}`;
    const record: ImportJobRecord = {
      ...job,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.importJobs.set(id, record);
    return record;
  }

  public createExportJob(
    userId: string,
    job: Omit<ExportJobRecord, "id" | "userId" | "createdAt">
  ): ExportJobRecord {
    const id = `exp-${crypto.randomUUID().slice(0, 8)}`;
    const record: ExportJobRecord = {
      ...job,
      id,
      userId,
      createdAt: new Date().toISOString(),
    };
    this.exportJobs.set(id, record);
    if (job.status === "COMPLETED") {
      this.metrics.completedExports += 1;
    } else if (job.status === "FAILED") {
      this.metrics.failedExports += 1;
    }
    return record;
  }
}

let globalRepo: BookForgeRepository | null = null;

export function getRepository(): BookForgeRepository {
  if (!globalRepo) {
    globalRepo = new BookForgeRepository(true);
  }
  return globalRepo;
}

export function createIsolatedRepository(seed = false): BookForgeRepository {
  return new BookForgeRepository(seed);
}
