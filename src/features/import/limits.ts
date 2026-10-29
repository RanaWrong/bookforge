export const IMPORT_LIMITS = {
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15 MB
  MAX_ZIP_ENTRIES: 60,
  MAX_COMPRESSION_RATIO: 25, // Reject ZIP bombs with > 25:1 expansion ratio
  ALLOWED_EXTENSIONS: [".md", ".markdown", ".docx", ".zip"] as const,
};

export interface ImportChapterCandidate {
  id: string;
  title: string;
  kind: "FRONTMATTER" | "CHAPTER" | "BACKMATTER";
  position: number;
  markdown: string;
  wordCount: number;
  excluded: boolean;
}

export interface ImportWarning {
  code:
    | "UNSUPPORTED_DOCX_STYLE"
    | "RAW_LATEX_DETECTED"
    | "FOREIGN_SCRIPT_INTRUSION"
    | "CHATBOT_RESIDUE_DETECTED"
    | "EMPTY_SECTION_HEADING"
    | "IMAGE_ASSET_EXTRACTED";
  message: string;
  location?: string;
}

export interface ImportReport {
  sourceType: "MARKDOWN" | "DOCX" | "ZIP";
  filename: string;
  sizeBytes: number;
  chapters: ImportChapterCandidate[];
  warnings: ImportWarning[];
  errors: string[];
  isValid: boolean;
}

export interface ZipEntryDescriptor {
  path: string;
  compressedBytes: number;
  uncompressedBytes: number;
  content?: string;
}

export interface CommitImportChapterSelection {
  candidateId: string;
  title?: string;
  kind?: "FRONTMATTER" | "CHAPTER" | "BACKMATTER";
  excluded?: boolean;
}
