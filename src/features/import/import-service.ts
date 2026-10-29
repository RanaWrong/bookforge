import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { AppError } from "../../lib/errors.ts";
import { logger } from "../../lib/logger.ts";
import { assertOwnership, type SessionContext } from "../../server/auth.ts";
import {
  getRepository,
  type BookForgeRepository,
  type ChapterRecord,
} from "../../server/db.ts";
import { countManuscriptMetrics, slugifyTitle } from "../books/validation.ts";
import { markdownToCanonicalDocument } from "../editor/markdown-converter.ts";
import {
  IMPORT_LIMITS,
  type CommitImportChapterSelection,
  type ImportChapterCandidate,
  type ImportReport,
  type ImportWarning,
  type ZipEntryDescriptor,
} from "./limits.ts";

export class ImportSecurityError extends AppError {
  constructor(message: string) {
    super("IMPORT_SECURITY_ERROR", message, 400);
    this.name = "ImportSecurityError";
  }
}

const DISALLOWED_EXECUTABLE_OR_MACRO_EXTENSIONS = [
  ".exe",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
  ".dll",
  ".so",
  ".js",
  ".mjs",
  ".php",
  ".py",
  ".docm",
  ".dotm",
  ".xlsm",
  ".vbs",
];

/**
 * Executes an import callback inside a unique temporary staging directory and
 * guarantees cleanup in `finally` even if parsing fails.
 */
export async function withTemporaryImportStagingDir<T>(
  fn: (stagingDir: string) => Promise<T> | T
): Promise<T> {
  const stagingDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `bookforge-import-${crypto.randomUUID().slice(0, 8)}-`)
  );
  try {
    return await fn(stagingDir);
  } finally {
    try {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      logger.warn("import.temp_cleanup_failed", {
        stagingDir,
        reason: cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr),
      });
    }
  }
}

export function auditManuscriptQualityWarnings(
  markdown: string,
  locationLabel: string
): ImportWarning[] {
  const warnings: ImportWarning[] = [];

  if (/\$\$[^$]+\$\$|\\frac\{|\\sqrt\{/.test(markdown)) {
    warnings.push({
      code: "RAW_LATEX_DETECTED",
      message:
        "Uncompiled raw LaTeX syntax detected; convert to clean Unicode or formula blocks before print.",
      location: locationLabel,
    });
  }

  if (/[\u0400-\u04FF\u30A0-\u30FF]/.test(markdown)) {
    warnings.push({
      code: "FOREIGN_SCRIPT_INTRUSION",
      message:
        "Non-Bangla/Non-Latin characters (e.g., Cyrillic or Katakana OCR artifact) detected.",
      location: locationLabel,
    });
  }

  if (/আমি আপনার OCR টেক্সটটি পরিষ্কার করে|আপনার দেওয়া টেক্সট \(পৃষ্ঠা/.test(markdown)) {
    warnings.push({
      code: "CHATBOT_RESIDUE_DETECTED",
      message: "Conversational AI/OCR prompt residue detected in manuscript body.",
      location: locationLabel,
    });
  }

  return warnings;
}

export function parseMarkdownImport(filename: string, rawContent: string): ImportReport {
  const lowerName = filename.toLowerCase();
  for (const ext of DISALLOWED_EXECUTABLE_OR_MACRO_EXTENSIONS) {
    if (lowerName.endsWith(ext)) {
      throw new ImportSecurityError(
        `Rejected disallowed executable or macro-enabled file: "${filename}"`
      );
    }
  }

  const sizeBytes = Buffer.byteLength(rawContent, "utf8");
  if (sizeBytes === 0) {
    throw new ImportSecurityError("Imported file is empty.");
  }
  if (sizeBytes > IMPORT_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new ImportSecurityError(
      `File exceeds maximum size limit of ${IMPORT_LIMITS.MAX_FILE_SIZE_BYTES} bytes.`
    );
  }

  const normalized = rawContent.replace(/\r\n/g, "\n");
  const warnings: ImportWarning[] = [...auditManuscriptQualityWarnings(normalized, filename)];

  const sections = normalized
    .split(/(?=^#\s+.+$)/m)
    .map((s) => s.trim())
    .filter(Boolean);
  const chapters: ImportChapterCandidate[] = [];

  if (sections.length === 0) {
    const metrics = countManuscriptMetrics(normalized);
    chapters.push({
      id: "cand-1",
      title: filename.replace(/\.(md|markdown|docx)$/i, "") || "Imported Chapter",
      kind: "CHAPTER",
      position: 1,
      markdown: normalized,
      wordCount: metrics.wordCount,
      excluded: false,
    });
  } else {
    sections.forEach((sec, idx) => {
      const headingMatch = sec.match(/^#\s+(.+)$/m);
      const title = headingMatch ? headingMatch[1].trim() : `Chapter ${idx + 1}`;
      const metrics = countManuscriptMetrics(sec);
      const kind = /প্রাককথন|preface|foreword/i.test(title)
        ? "FRONTMATTER"
        : /পরিশিষ্ট|appendix/i.test(title)
        ? "BACKMATTER"
        : "CHAPTER";

      if (metrics.wordCount < 5) {
        warnings.push({
          code: "EMPTY_SECTION_HEADING",
          message: `Chapter "${title}" has very little or no body content underneath its heading.`,
          location: title,
        });
      }

      chapters.push({
        id: `cand-${idx + 1}`,
        title,
        kind,
        position: idx + 1,
        markdown: sec,
        wordCount: metrics.wordCount,
        excluded: false,
      });
    });
  }

  return {
    sourceType: "MARKDOWN",
    filename,
    sizeBytes,
    chapters,
    warnings,
    errors: [],
    isValid: true,
  };
}

export function parseDocxStructuredImport(
  filename: string,
  extractedXmlOrText: string,
  sizeBytes = Buffer.byteLength(extractedXmlOrText, "utf8")
): ImportReport {
  if (filename.toLowerCase().endsWith(".docm")) {
    throw new ImportSecurityError("Macro-enabled Word documents (.docm) are strictly rejected.");
  }
  if (sizeBytes > IMPORT_LIMITS.MAX_FILE_SIZE_BYTES) {
    throw new ImportSecurityError("DOCX file exceeds maximum allowed size.");
  }

  const warnings: ImportWarning[] = [];

  if (/<w:tbl|<w:FloatingTable|w:vMerge/.test(extractedXmlOrText)) {
    warnings.push({
      code: "UNSUPPORTED_DOCX_STYLE",
      message: "Complex merged Word table cells detected; converted to standard Markdown pipe table.",
      location: filename,
    });
  }
  if (/<w:commentReference|<w:ins|<w:del/.test(extractedXmlOrText)) {
    warnings.push({
      code: "UNSUPPORTED_DOCX_STYLE",
      message: "Word Track Changes / Author Margin Comments detected; review before publishing.",
      location: filename,
    });
  }
  if (/<m:oMath/.test(extractedXmlOrText)) {
    warnings.push({
      code: "UNSUPPORTED_DOCX_STYLE",
      message: "Word OMML equation objects detected; verify mathematical notation in preview.",
      location: filename,
    });
  }

  const cleanedText = extractedXmlOrText
    .replace(/<\/w:p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .trim();

  const mdReport = parseMarkdownImport(
    filename,
    cleanedText || "# Imported DOCX Manuscript\n\nContent imported."
  );
  return {
    sourceType: "DOCX",
    filename,
    sizeBytes,
    chapters: mdReport.chapters,
    warnings: [...warnings, ...mdReport.warnings],
    errors: [],
    isValid: true,
  };
}

export function validateAndParseZipArchive(
  filename: string,
  entries: ZipEntryDescriptor[]
): ImportReport {
  if (entries.length === 0) {
    throw new ImportSecurityError("ZIP archive contains no entries.");
  }
  if (entries.length > IMPORT_LIMITS.MAX_ZIP_ENTRIES) {
    throw new ImportSecurityError(
      `ZIP archive has ${entries.length} entries, exceeding maximum limit of ${IMPORT_LIMITS.MAX_ZIP_ENTRIES}.`
    );
  }

  let totalCompressed = 0;
  let totalUncompressed = 0;
  const chapters: ImportChapterCandidate[] = [];
  const warnings: ImportWarning[] = [];

  for (const entry of entries) {
    const normalizedPath = entry.path.replace(/\\/g, "/");

    if (
      normalizedPath.startsWith("/") ||
      normalizedPath.includes("../") ||
      normalizedPath.includes("..\\") ||
      normalizedPath.split("/").includes("..")
    ) {
      throw new ImportSecurityError(
        `Blocked unsafe archive path traversal entry: "${entry.path}"`
      );
    }

    const lowerPath = normalizedPath.toLowerCase();
    for (const ext of DISALLOWED_EXECUTABLE_OR_MACRO_EXTENSIONS) {
      if (lowerPath.endsWith(ext)) {
        throw new ImportSecurityError(
          `Blocked disallowed executable or script file in archive: "${entry.path}"`
        );
      }
    }

    totalCompressed += Math.max(1, entry.compressedBytes);
    totalUncompressed += entry.uncompressedBytes;

    const ratio = entry.uncompressedBytes / Math.max(1, entry.compressedBytes);
    if (ratio > IMPORT_LIMITS.MAX_COMPRESSION_RATIO) {
      throw new ImportSecurityError(
        `Rejected suspicious compression ratio (${ratio.toFixed(1)}:1) on entry "${entry.path}" (potential ZIP bomb).`
      );
    }

    if (totalUncompressed > IMPORT_LIMITS.MAX_FILE_SIZE_BYTES) {
      throw new ImportSecurityError(
        `Total uncompressed archive size exceeds ${IMPORT_LIMITS.MAX_FILE_SIZE_BYTES} bytes.`
      );
    }

    if (entry.content && (lowerPath.endsWith(".md") || lowerPath.endsWith(".markdown"))) {
      const subReport = parseMarkdownImport(entry.path, entry.content);
      subReport.chapters.forEach((ch) => {
        chapters.push({
          ...ch,
          id: `cand-${chapters.length + 1}`,
          position: chapters.length + 1,
        });
      });
      warnings.push(...subReport.warnings);
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(lowerPath)) {
      warnings.push({
        code: "IMAGE_ASSET_EXTRACTED",
        message: `Validated archive image asset "${entry.path}" (${entry.uncompressedBytes} bytes).`,
        location: entry.path,
      });
    }
  }

  return {
    sourceType: "ZIP",
    filename,
    sizeBytes: totalCompressed,
    chapters,
    warnings,
    errors: [],
    isValid: true,
  };
}

export class ManuscriptImportService {
  private readonly repo: BookForgeRepository;

  constructor(repo: BookForgeRepository = getRepository()) {
    this.repo = repo;
  }

  /**
   * Commits a confirmed ImportReport into the destination book, honoring user
   * chapter ordering, renaming, and exclusion (`excluded: true` chapters are skipped).
   */
  public commitConfirmedImport(
    session: SessionContext,
    bookId: string,
    report: ImportReport,
    selections?: CommitImportChapterSelection[]
  ): ChapterRecord[] {
    const book = this.repo.getBook(session.userId, bookId);
    if (!book) {
      throw new AppError("NOT_FOUND", "Destination book not found or access denied.", 404);
    }
    assertOwnership(session, book.userId);

    // Apply user ordering, renaming, and exclusion overrides if provided
    let orderedCandidates = [...report.chapters];
    if (selections && selections.length > 0) {
      const byId = new Map(orderedCandidates.map((c) => [c.id, c]));
      const customized: ImportChapterCandidate[] = [];
      for (const sel of selections) {
        const orig = byId.get(sel.candidateId);
        if (!orig) continue;
        customized.push({
          ...orig,
          title: sel.title ? sel.title.trim() : orig.title,
          kind: sel.kind ?? orig.kind,
          excluded: sel.excluded ?? orig.excluded,
        });
      }
      orderedCandidates = customized;
    }

    const activeChapters = orderedCandidates.filter((c) => !c.excluded);
    if (activeChapters.length === 0) {
      throw new AppError("VALIDATION_ERROR", "At least one non-excluded chapter must be selected for import.");
    }

    const created: ChapterRecord[] = [];
    for (const ch of activeChapters) {
      const canonical = markdownToCanonicalDocument(ch.markdown);
      const metrics = countManuscriptMetrics(ch.markdown);
      const record = this.repo.createChapter(session.userId, bookId, {
        title: ch.title,
        slug: slugifyTitle(ch.title),
        kind: ch.kind,
        markdown: ch.markdown,
        canonicalJson: JSON.stringify(canonical.document),
        wordCount: metrics.wordCount,
        characterCount: metrics.characterCount,
      });
      created.push(record);
    }

    this.repo.createImportJob(session.userId, {
      bookId,
      sourceType: report.sourceType,
      filename: report.filename,
      sizeBytes: report.sizeBytes,
      chaptersCount: created.length,
      warningsJson: JSON.stringify(report.warnings),
      errorsJson: JSON.stringify(report.errors),
      status: "COMMITTED",
      committedAt: new Date().toISOString(),
    });

    return created;
  }
}
