import { AppError } from "../../lib/errors.ts";
import type { CreateBookInput, CreateChapterInput } from "./types.ts";

export function validateCreateBookInput(raw: unknown): CreateBookInput {
  if (!raw || typeof raw !== "object") {
    throw new AppError("VALIDATION_ERROR", "Invalid book payload.");
  }
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === "string" ? obj.title.trim() : "";
  const author = typeof obj.author === "string" ? obj.author.trim() : "";

  if (title.length < 2 || title.length > 200) {
    throw new AppError("VALIDATION_ERROR", "Book title must be between 2 and 200 characters.");
  }
  if (author.length < 2 || author.length > 140) {
    throw new AppError("VALIDATION_ERROR", "Book author must be between 2 and 140 characters.");
  }

  const language = obj.language === "en" ? "en" : "bn";
  const subtitle =
    typeof obj.subtitle === "string" && obj.subtitle.trim().length > 0
      ? obj.subtitle.trim()
      : null;
  const isbn =
    typeof obj.isbn === "string" && obj.isbn.trim().length > 0
      ? obj.isbn.trim()
      : null;
  const description =
    typeof obj.description === "string" && obj.description.trim().length > 0
      ? obj.description.trim()
      : null;
  const targetWordCount =
    typeof obj.targetWordCount === "number" && obj.targetWordCount >= 500
      ? Math.round(obj.targetWordCount)
      : 45000;

  return {
    title,
    subtitle,
    author,
    language,
    isbn,
    description,
    targetWordCount,
  };
}

export function slugifyTitle(title: string): string {
  const cleaned = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
  return cleaned.length > 0 ? cleaned.slice(0, 80) : "chapter";
}

export function countManuscriptMetrics(markdown: string): {
  wordCount: number;
  characterCount: number;
} {
  const stripped = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\-|]/g, " ")
    .trim();
  if (!stripped) {
    return { wordCount: 0, characterCount: 0 };
  }
  const words = stripped.split(/\s+/).filter((token) => token.length > 0);
  return {
    wordCount: words.length,
    characterCount: markdown.length,
  };
}

export function validateCreateChapterInput(raw: unknown): CreateChapterInput {
  if (!raw || typeof raw !== "object") {
    throw new AppError("VALIDATION_ERROR", "Invalid chapter payload.");
  }
  const obj = raw as Record<string, unknown>;
  const bookId = typeof obj.bookId === "string" ? obj.bookId.trim() : "";
  const title = typeof obj.title === "string" ? obj.title.trim() : "";

  if (!bookId) {
    throw new AppError("VALIDATION_ERROR", "bookId is required.");
  }
  if (title.length < 1 || title.length > 200) {
    throw new AppError("VALIDATION_ERROR", "Chapter title must be between 1 and 200 characters.");
  }

  const kind =
    obj.kind === "FRONTMATTER" || obj.kind === "BACKMATTER" ? obj.kind : "CHAPTER";
  const markdown = typeof obj.markdown === "string" ? obj.markdown : `# ${title}\n\n`;

  return { bookId, title, kind, markdown };
}
