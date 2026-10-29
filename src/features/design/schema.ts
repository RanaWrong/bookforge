import { AppError } from "../../lib/errors.ts";

export type PageSizePreset = "A4" | "A5" | "B5" | "CUSTOM";
export type PageOrientation = "PORTRAIT" | "LANDSCAPE";

export const STANDARD_PAGE_DIMENSIONS: Record<
  Exclude<PageSizePreset, "CUSTOM">,
  { widthMm: number; heightMm: number }
> = {
  A4: { widthMm: 210, heightMm: 297 },
  A5: { widthMm: 148, heightMm: 210 },
  B5: { widthMm: 176, heightMm: 250 },
};

export interface BookDesignSettingsInput {
  pageSize: PageSizePreset;
  orientation: PageOrientation;
  widthMm: number;
  heightMm: number;
  mirrorMargins: boolean;
  marginTopMm: number;
  marginBottomMm: number;
  marginInsideMm: number;
  marginOutsideMm: number;
  gutterMm: number;
  banglaBodyFont: "Noto Serif Bengali" | "Noto Sans Bengali" | "SolaimanLipi" | "Kalpurush";
  banglaHeadingFont: "Noto Sans Bengali" | "Noto Serif Bengali";
  latinFont: "Inter" | "Georgia" | "Merriweather";
  bodyFontSizePt: number;
  h1SizePt: number;
  h2SizePt: number;
  h3SizePt: number;
  lineHeight: number;
  paragraphSpacingPt: number;
  primaryColor: string;
  accentColor: string;
  headerLeft: "BOOK_TITLE" | "AUTHOR" | "NONE";
  headerRight: "CHAPTER_TITLE" | "BOOK_TITLE" | "NONE";
  footerTemplate: "PAGE_NUMBER" | "BOOK_AND_PAGE" | "NONE";
  startPageNumber: number;
  includeToc: boolean;
  tocDepth: 1 | 2 | 3;
  chapterStartsNewPage: boolean;
  watermarkText: string | null;
}

export interface BookDesignSettingsRecord extends BookDesignSettingsInput {
  id: string;
  bookId: string;
  updatedAt: string;
}

export function validateBookDesignSettings(raw: unknown): BookDesignSettingsInput {
  if (!raw || typeof raw !== "object") {
    throw new AppError("VALIDATION_ERROR", "Invalid book design settings payload.");
  }
  const obj = raw as Record<string, unknown>;

  const pageSize: PageSizePreset =
    obj.pageSize === "A4" || obj.pageSize === "A5" || obj.pageSize === "B5"
      ? obj.pageSize
      : "CUSTOM";

  const orientation: PageOrientation =
    obj.orientation === "LANDSCAPE" ? "LANDSCAPE" : "PORTRAIT";

  const presetDims = pageSize !== "CUSTOM" ? STANDARD_PAGE_DIMENSIONS[pageSize] : null;
  let widthMm = presetDims ? presetDims.widthMm : Number(obj.widthMm ?? 215);
  let heightMm = presetDims ? presetDims.heightMm : Number(obj.heightMm ?? 275);

  if (
    orientation === "LANDSCAPE" &&
    widthMm < heightMm &&
    pageSize !== "CUSTOM"
  ) {
    const tmp = widthMm;
    widthMm = heightMm;
    heightMm = tmp;
  }

  if (!Number.isFinite(widthMm) || widthMm < 100 || widthMm > 420) {
    throw new AppError("VALIDATION_ERROR", "Page width must be between 100 mm and 420 mm.");
  }
  if (!Number.isFinite(heightMm) || heightMm < 140 || heightMm > 500) {
    throw new AppError("VALIDATION_ERROR", "Page height must be between 140 mm and 500 mm.");
  }

  const marginTopMm = Number(obj.marginTopMm ?? 18);
  const marginBottomMm = Number(obj.marginBottomMm ?? 20);
  const marginInsideMm = Number(obj.marginInsideMm ?? 22);
  const marginOutsideMm = Number(obj.marginOutsideMm ?? 16);
  const gutterMm = Number(obj.gutterMm ?? 5);

  for (const [label, val] of [
    ["Top margin", marginTopMm],
    ["Bottom margin", marginBottomMm],
    ["Inside margin", marginInsideMm],
    ["Outside margin", marginOutsideMm],
  ] as const) {
    if (!Number.isFinite(val) || val < 8 || val > 50) {
      throw new AppError("VALIDATION_ERROR", `${label} must be between 8 mm and 50 mm.`);
    }
  }
  if (!Number.isFinite(gutterMm) || gutterMm < 0 || gutterMm > 25) {
    throw new AppError("VALIDATION_ERROR", "Gutter must be between 0 mm and 25 mm.");
  }

  const bodyFontSizePt = Number(obj.bodyFontSizePt ?? 11);
  if (!Number.isFinite(bodyFontSizePt) || bodyFontSizePt < 9 || bodyFontSizePt > 16) {
    throw new AppError("VALIDATION_ERROR", "Body font size must be between 9 pt and 16 pt.");
  }

  const lineHeight = Number(obj.lineHeight ?? 1.5);
  if (!Number.isFinite(lineHeight) || lineHeight < 1.2 || lineHeight > 2.2) {
    throw new AppError("VALIDATION_ERROR", "Line height must be between 1.2 and 2.2.");
  }

  const startPageNumber = Number(obj.startPageNumber ?? 1);
  if (!Number.isInteger(startPageNumber) || startPageNumber < 1 || startPageNumber > 5000) {
    throw new AppError("VALIDATION_ERROR", "Starting page number must be an integer between 1 and 5000.");
  }

  const primaryColor = typeof obj.primaryColor === "string" ? obj.primaryColor : "#123B6D";
  const accentColor = typeof obj.accentColor === "string" ? obj.accentColor : "#F26B21";
  if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor) || !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
    throw new AppError("VALIDATION_ERROR", "Colors must be valid 6-digit hex codes.");
  }

  const rawTocDepth = Number(obj.tocDepth ?? 2);
  const tocDepth: 1 | 2 | 3 = rawTocDepth === 1 || rawTocDepth === 3 ? rawTocDepth : 2;

  return {
    pageSize,
    orientation,
    widthMm,
    heightMm,
    mirrorMargins: obj.mirrorMargins !== false,
    marginTopMm,
    marginBottomMm,
    marginInsideMm,
    marginOutsideMm,
    gutterMm,
    banglaBodyFont:
      obj.banglaBodyFont === "Noto Sans Bengali" ||
      obj.banglaBodyFont === "SolaimanLipi" ||
      obj.banglaBodyFont === "Kalpurush"
        ? obj.banglaBodyFont
        : "Noto Serif Bengali",
    banglaHeadingFont:
      obj.banglaHeadingFont === "Noto Serif Bengali"
        ? "Noto Serif Bengali"
        : "Noto Sans Bengali",
    latinFont:
      obj.latinFont === "Georgia" || obj.latinFont === "Merriweather"
        ? obj.latinFont
        : "Inter",
    bodyFontSizePt,
    h1SizePt: Number(obj.h1SizePt ?? 24),
    h2SizePt: Number(obj.h2SizePt ?? 17),
    h3SizePt: Number(obj.h3SizePt ?? 14),
    lineHeight,
    paragraphSpacingPt: Number(obj.paragraphSpacingPt ?? 6),
    primaryColor,
    accentColor,
    headerLeft:
      obj.headerLeft === "AUTHOR" || obj.headerLeft === "NONE"
        ? obj.headerLeft
        : "BOOK_TITLE",
    headerRight:
      obj.headerRight === "BOOK_TITLE" || obj.headerRight === "NONE"
        ? obj.headerRight
        : "CHAPTER_TITLE",
    footerTemplate:
      obj.footerTemplate === "BOOK_AND_PAGE" || obj.footerTemplate === "NONE"
        ? obj.footerTemplate
        : "PAGE_NUMBER",
    startPageNumber,
    includeToc: obj.includeToc !== false,
    tocDepth,
    chapterStartsNewPage: obj.chapterStartsNewPage !== false,
    watermarkText:
      typeof obj.watermarkText === "string" && obj.watermarkText.trim().length > 0
        ? obj.watermarkText.trim().slice(0, 120)
        : null,
  };
}
