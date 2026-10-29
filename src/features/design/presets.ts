import type { BookDesignSettingsInput } from "./schema.ts";

export const MASTER_BOOK_DESIGN_PRESET: BookDesignSettingsInput = {
  pageSize: "CUSTOM",
  orientation: "PORTRAIT",
  widthMm: 215,
  heightMm: 275,
  mirrorMargins: true,
  marginTopMm: 18,
  marginBottomMm: 20,
  marginInsideMm: 22,
  marginOutsideMm: 16,
  gutterMm: 5,
  banglaBodyFont: "Noto Serif Bengali",
  banglaHeadingFont: "Noto Sans Bengali",
  latinFont: "Inter",
  bodyFontSizePt: 11,
  h1SizePt: 24,
  h2SizePt: 17,
  h3SizePt: 14,
  lineHeight: 1.5,
  paragraphSpacingPt: 6,
  primaryColor: "#123B6D",
  accentColor: "#F26B21",
  headerLeft: "BOOK_TITLE",
  headerRight: "CHAPTER_TITLE",
  footerTemplate: "PAGE_NUMBER",
  startPageNumber: 1,
  includeToc: true,
  tocDepth: 2,
  chapterStartsNewPage: true,
  watermarkText: null,
};

export const B5_TEXTBOOK_PRESET: BookDesignSettingsInput = {
  ...MASTER_BOOK_DESIGN_PRESET,
  pageSize: "B5",
  widthMm: 176,
  heightMm: 250,
  marginTopMm: 16,
  marginBottomMm: 18,
  marginInsideMm: 20,
  marginOutsideMm: 15,
  gutterMm: 4,
  bodyFontSizePt: 10.5,
};

export const A4_MANUAL_PRESET: BookDesignSettingsInput = {
  ...MASTER_BOOK_DESIGN_PRESET,
  pageSize: "A4",
  widthMm: 210,
  heightMm: 297,
};

export const A5_COMPACT_PRESET: BookDesignSettingsInput = {
  ...MASTER_BOOK_DESIGN_PRESET,
  pageSize: "A5",
  widthMm: 148,
  heightMm: 210,
  marginTopMm: 14,
  marginBottomMm: 16,
  marginInsideMm: 18,
  marginOutsideMm: 13,
  gutterMm: 4,
  bodyFontSizePt: 10,
};

// Backwards-compatible alias
export const MASTER_BOOK_PRESET = MASTER_BOOK_DESIGN_PRESET;
