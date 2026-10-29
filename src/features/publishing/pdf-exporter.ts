import { AppError } from "../../lib/errors.ts";
import { assertOwnership, type SessionContext } from "../../server/auth.ts";
import {
  getRepository,
  type BookForgeRepository,
  type ExportJobRecord,
} from "../../server/db.ts";
import {
  renderPrintHtmlDocument,
  sanitizeExportFilename,
} from "./print-renderer.ts";

export const EXPORT_LIMITS = {
  MAX_PAGE_COUNT: 2000,
  MAX_OUTPUT_SIZE_BYTES: 50 * 1024 * 1024,
  TIMEOUT_MS: 30000,
  MAX_CONCURRENT_JOBS: 2,
};

async function htmlToPdfBuffer(html: string, timeoutMs: number): Promise<Buffer> {
  let puppeteer: typeof import("puppeteer-core");
  try {
    puppeteer = await import("puppeteer-core");
  } catch {
    throw new AppError("EXPORT_LIMIT_ERROR", "PDF engine not available in this environment (missing puppeteer-core).", 503);
  }
  const executablePath = process.env.CHROMIUM_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser";
  const browser = await puppeteer.launch({
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: timeoutMs });
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true, timeout: timeoutMs } as Parameters<typeof page.pdf>[0]);
    await page.close();
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export class PdfExportService {
  private readonly repo: BookForgeRepository;

  constructor(repo: BookForgeRepository = getRepository()) {
    this.repo = repo;
  }

  public generateExport(
    session: SessionContext,
    input: {
      bookId: string;
      chapterId?: string | null;
      scope: "BOOK" | "CHAPTER";
    }
  ): ExportJobRecord {
    if (this.repo.metrics.activeExportJobs >= EXPORT_LIMITS.MAX_CONCURRENT_JOBS) {
      this.repo.metrics.failedExports += 1;
      throw new AppError(
        "EXPORT_LIMIT_ERROR",
        "Maximum concurrent PDF export limit reached. Please retry shortly.",
        429
      );
    }

    this.repo.metrics.activeExportJobs += 1;
    try {
      const book = this.repo.getBook(session.userId, input.bookId);
      if (!book) {
        throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
      }
      assertOwnership(session, book.userId);

      const designSettings = this.repo.getBookDesignSettings(session.userId, book.id);
      const allChapters = this.repo.listChapters(session.userId, book.id);
      const targetChapters =
        input.scope === "CHAPTER" && input.chapterId
          ? allChapters.filter((c) => c.id === input.chapterId)
          : allChapters;

      if (targetChapters.length === 0) {
        throw new AppError("VALIDATION_ERROR", "No chapters found for PDF export.");
      }

      const rendered = renderPrintHtmlDocument(
        book,
        targetChapters,
        designSettings,
        input.scope
      );
      if (rendered.estimatedPages > EXPORT_LIMITS.MAX_PAGE_COUNT) {
        throw new AppError(
          "EXPORT_LIMIT_ERROR",
          `Export page count (${rendered.estimatedPages}) exceeds limit of ${EXPORT_LIMITS.MAX_PAGE_COUNT} pages.`
        );
      }

      const fileSizeBytes = Buffer.byteLength(rendered.html, "utf8");
      if (fileSizeBytes > EXPORT_LIMITS.MAX_OUTPUT_SIZE_BYTES) {
        throw new AppError(
          "EXPORT_LIMIT_ERROR",
          "Export size exceeds maximum allowed threshold."
        );
      }

      const titleForFile =
        input.scope === "CHAPTER" ? targetChapters[0].title : book.title;
      const safeFilename = sanitizeExportFilename(titleForFile, input.scope);

      return this.repo.createExportJob(session.userId, {
        bookId: book.id,
        chapterId: input.chapterId ?? null,
        scope: input.scope,
        status: "COMPLETED",
        safeFilename,
        designSettingsSnapshot: JSON.stringify(designSettings),
        pageCount: rendered.estimatedPages,
        fileSizeBytes,
        warnings: rendered.warnings,
        htmlOutput: rendered.html,
        errorMessage: null,
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      this.repo.metrics.failedExports += 1;
      throw err;
    } finally {
      this.repo.metrics.activeExportJobs = Math.max(
        0,
        this.repo.metrics.activeExportJobs - 1
      );
    }
  }

  public async generatePdfBuffer(
    session: SessionContext,
    input: { bookId: string; chapterId?: string | null; scope: "BOOK" | "CHAPTER" }
  ): Promise<{ pdfBuffer: Buffer; safeFilename: string; pageCount: number }> {
    if (this.repo.metrics.activeExportJobs >= EXPORT_LIMITS.MAX_CONCURRENT_JOBS) {
      this.repo.metrics.failedExports += 1;
      throw new AppError("EXPORT_LIMIT_ERROR", "Maximum concurrent PDF export limit reached. Please retry shortly.", 429);
    }
    this.repo.metrics.activeExportJobs += 1;
    try {
      const book = this.repo.getBook(session.userId, input.bookId);
      if (!book) throw new AppError("NOT_FOUND", "Book not found or access denied.", 404);
      assertOwnership(session, book.userId);
      const designSettings = this.repo.getBookDesignSettings(session.userId, book.id);
      const allChapters = this.repo.listChapters(session.userId, book.id);
      const targetChapters = input.scope === "CHAPTER" && input.chapterId ? allChapters.filter((c) => c.id === input.chapterId) : allChapters;
      if (targetChapters.length === 0) throw new AppError("VALIDATION_ERROR", "No chapters found for PDF export.");
      const rendered = renderPrintHtmlDocument(book, targetChapters, designSettings, input.scope);
      if (rendered.estimatedPages > EXPORT_LIMITS.MAX_PAGE_COUNT) throw new AppError("EXPORT_LIMIT_ERROR", `Page count ${rendered.estimatedPages} exceeds limit.`);
      const pdfBuffer = await Promise.race([
        htmlToPdfBuffer(rendered.html, EXPORT_LIMITS.TIMEOUT_MS),
        new Promise<never>((_, reject) => setTimeout(() => reject(new AppError("EXPORT_LIMIT_ERROR", "PDF render timed out.", 504)), EXPORT_LIMITS.TIMEOUT_MS + 2000)),
      ]);
      if (pdfBuffer.byteLength > EXPORT_LIMITS.MAX_OUTPUT_SIZE_BYTES) throw new AppError("EXPORT_LIMIT_ERROR", "PDF size exceeds limit.");
      const safeFilename = sanitizeExportFilename(input.scope === "CHAPTER" ? targetChapters[0].title : book.title, input.scope);
      this.repo.createExportJob(session.userId, {
        bookId: book.id,
        chapterId: input.chapterId ?? null,
        scope: input.scope,
        status: "COMPLETED",
        safeFilename,
        designSettingsSnapshot: JSON.stringify(designSettings),
        pageCount: rendered.estimatedPages,
        fileSizeBytes: pdfBuffer.byteLength,
        warnings: rendered.warnings,
        htmlOutput: rendered.html,
        errorMessage: null,
        completedAt: new Date().toISOString(),
      });
      return { pdfBuffer, safeFilename, pageCount: rendered.estimatedPages };
    } catch (err) {
      this.repo.metrics.failedExports += 1;
      throw err;
    } finally {
      this.repo.metrics.activeExportJobs = Math.max(0, this.repo.metrics.activeExportJobs - 1);
    }
  }
}
