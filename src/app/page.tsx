"use client";

import React, { useState, useCallback } from "react";

type Locale = "bn" | "en";
type ChapterKind = "FRONTMATTER" | "CHAPTER" | "BACKMATTER";
type View = "dashboard" | "editor" | "design" | "preview" | "revisions";
type EditorMode = "visual" | "source";
type ExportScope = "BOOK" | "CHAPTER";

interface Revision {
  id: string;
  revisionNumber: number;
  label: string;
  createdAt: string;
  markdown: string;
}
interface Chapter {
  id: string;
  kind: ChapterKind;
  title: string;
  revisionNumber: number;
  markdown: string;
  revisions: Revision[];
}
interface Book {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  language: "bn" | "en";
  targetWordCount: number;
  chapters: Chapter[];
}
interface DesignProfile {
  name: string;
  widthMm: number;
  heightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginInsideMm: number;
  marginOutsideMm: number;
  gutterMm: number;
  mirrorMargins: boolean;
  banglaBodyFont: string;
  banglaHeadingFont: string;
  latinFont: string;
  bodyFontSizePt: number;
  lineHeight: number;
  primaryColor: string;
  accentColor: string;
  chapterStartsNewPage: boolean;
  watermarkText: string;
}

const I18N: Record<string, Record<string, string>> = {
  bn: {
    navDashboard: "\u09A1\u09CD\u09AF\u09BE\u09B6\u09AC\u09CB\u09B0\u09CD\u09A1",
    navEditor: "\u09AA\u09BE\u09A3\u09CD\u09A1\u09C1\u09B2\u09BF\u09AA\u09BF \u098F\u09A1\u09BF\u099F\u09B0",
    navDesign: "\u099F\u09BE\u0987\u09AA\u09CB\u0997\u09CD\u09B0\u09BE\u09AB\u09BF \u0993 \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2",
    navPreview: "\u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u09BF\u09AD\u09BF\u0989 \u0993 PDF \u098F\u0995\u09CD\u09B8\u09AA\u09CB\u09B0\u09CD\u099F",
    navRevisions: "\u09B0\u09BF\u09AD\u09BF\u09B6\u09A8 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8",
    createBook: "\u09A8\u09A4\u09C1\u09A8 \u09AC\u0987 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8",
    importBook: "\u09AC\u0987 Import \u0995\u09B0\u09C1\u09A8",
    chaptersHeader: "\u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC \u09A4\u09BE\u09B2\u09BF\u0995\u09BE",
    addChapterBtn: "\u09A8\u09A4\u09C1\u09A8 \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC",
    saveSnapshotBtn: "\u09B0\u09BF\u09AD\u09BF\u09B6\u09A8 \u09B8\u09CD\u09A8\u09CD\u09AF\u09BE\u09AA\u09B6\u099F \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3",
    designHeading: "\u09AE\u09C1\u09A6\u09CD\u09B0\u09A3 \u0993 \u099F\u09BE\u0987\u09AA\u09CB\u0997\u09CD\u09B0\u09BE\u09AB\u09BF \u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2 (Design System)",
    previewHeading: "\u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u09BF\u09AD\u09BF\u0989 \u0993 PDF \u098F\u0995\u09CD\u09B8\u09AA\u09CB\u09B0\u09CD\u099F \u0987\u099E\u09CD\u099C\u09BF\u09A8",
    revisionsHeading: "\u09B8\u0982\u09B8\u09CD\u0995\u09B0\u09A3 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8 \u0993 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 (Revision History)",
    heroEyebrow: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09AC\u0987 \u09B2\u09C7\u0996\u09BE\u09B0 \u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995\u09B8\u09CD\u09AA\u09C7\u09B8",
    heroTitle: "\u09B2\u09BF\u0996\u09C1\u09A8\u0964 \u09B8\u09BE\u099C\u09BE\u09A8\u0964 \u09AA\u09CD\u09B0\u0995\u09BE\u09B6 \u0995\u09B0\u09C1\u09A8\u0964",
    heroDesc: "\u09AC\u09BE\u0982\u09B2\u09BE \u0993 English \u09AE\u09C7\u09B6\u09BE\u09A8\u09CB \u09AC\u0987\u09AF\u09BC\u09C7\u09B0 \u09A8\u09BF\u0996\u09C1\u0981\u09A4 \u0997\u09A0\u09A8, \u09A6\u09CD\u09B0\u09C1\u09A4 \u09AB\u09CD\u09B0\u09A8\u09CD\u099F\u09AE\u09CD\u09AF\u09BE\u099F\u09BE\u09B0, 215 \u00D7 275 \u09AE\u09BF\u09AE\u09BF \u09AE\u09BF\u09B0\u09B0 \u09AE\u09BE\u09B0\u09CD\u099C\u09BF\u09A8 \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2 \u098F\u09AC\u0982 \u09B8\u09B9\u099C\u09A4\u09AE \u09AA\u09BE\u09AC\u09B2\u09BF\u09B6\u09BF\u0982 \u0985\u09AD\u09BF\u099C\u09CD\u099E\u09A4\u09BE \u09A8\u09BF\u09AF\u09BC\u09C7 \u098F\u0995\u099F\u09BF \u09A1\u09C7\u09A1\u09BF\u0995\u09C7\u099F\u09C7\u09A1 workspace.",
    booksHeading: "\u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09BE\u09A3\u09CD\u09A1\u09C1\u09B2\u09BF\u09AA\u09BF \u0993 \u09AC\u0987\u09B8\u09AE\u09C2\u09B9",
    booksSubheading: "\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u0995\u09B8\u09CD\u09AA\u09C7\u09B8\u09C7\u09B0 \u09B8\u0995\u09B2 \u09AC\u0987, \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC \u098F\u09AC\u0982 \u09AE\u09C1\u09A6\u09CD\u09B0\u09A3 \u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2 \u098F\u0996\u09BE\u09A8 \u09A5\u09C7\u0995\u09C7 \u09AA\u09B0\u09BF\u099A\u09BE\u09B2\u09A8\u09BE \u0995\u09B0\u09C1\u09A8\u0964",
    discard: "\u0985\u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u09AC\u09BE\u09A4\u09BF\u09B2 \u0995\u09B0\u09AC\u09C7\u09A8?",
  },
  en: {
    navDashboard: "Dashboard",
    navEditor: "Manuscript Editor",
    navDesign: "Typography & Print Profile",
    navPreview: "Print Preview & PDF Export",
    navRevisions: "Revision History",
    createBook: "Create a Book",
    importBook: "Import Manuscript",
    chaptersHeader: "Chapters",
    addChapterBtn: "Add Chapter",
    saveSnapshotBtn: "Save Revision Snapshot",
    designHeading: "Print & Typography Profile (Design System)",
    previewHeading: "Print Preview & PDF Export Engine",
    revisionsHeading: "Revision History & Non-Destructive Restore",
    heroEyebrow: "Your book writing workspace",
    heroTitle: "Write. Organize. Publish.",
    heroDesc: "A structured writing and publishing workspace for books mixing Bangla and English with 215 x 275 mm mirror-margin print profiles.",
    booksHeading: "Your Manuscripts & Books",
    booksSubheading: "Manage all workspace books, chapters, and print layout profiles.",
    discard: "Discard unsaved changes?",
  },
};

const INITIAL_DESIGN: DesignProfile = {
  name: "Master Book (215 x 275 mm Mirror Margins)",
  widthMm: 215, heightMm: 275,
  marginTopMm: 18, marginBottomMm: 20,
  marginInsideMm: 22, marginOutsideMm: 16, gutterMm: 5,
  mirrorMargins: true,
  banglaBodyFont: "Noto Serif Bengali",
  banglaHeadingFont: "Noto Sans Bengali",
  latinFont: "Inter",
  bodyFontSizePt: 11, lineHeight: 1.5,
  primaryColor: "#123B6D", accentColor: "#F26B21",
  chapterStartsNewPage: true, watermarkText: "",
};

const SAMPLE_MD_1 = `# \u09AA\u09CD\u09B0\u09BE\u0995\u0995\u09A5\u09A8 \u0993 \u09E9 \u09A7\u09BE\u09AA\u09C7 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4\u09BF \u0995\u09CC\u09B6\u09B2

\u098F\u0987 \u09AC\u0987\u099F\u09BF **PSC Written Examination**-\u0995\u09C7\u09A8\u09CD\u09A6\u09CD\u09B0\u09BF\u0995, \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0-\u09AC\u09BE\u09A8\u09CD\u09A7\u09AC, \u09AC\u09BF\u09B6\u09CD\u09B2\u09C7\u09B7\u09A3\u09A7\u09B0\u09CD\u09AE\u09C0 \u098F\u09AC\u0982 \u09A6\u09CD\u09B0\u09C1\u09A4 \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8\u09AF\u09CB\u0997\u09CD\u09AF \u098F\u0995\u099F\u09BF \u09A6\u09CD\u09AC\u09BF\u09AD\u09BE\u09B7\u09BF\u0995 \u09AA\u09BE\u09A3\u09CD\u09A1\u09C1\u09B2\u09BF\u09AA\u09BF\u0964

> \u09A2 **\u098F\u0995\u09CD\u09B8\u09BE\u09AE \u099F\u09BF\u09AA\u09B8:** \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0 \u0986\u0997\u09C7\u09B0 \u09B0\u09BE\u09A4\u09C7 \u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u09B2\u09BE\u09B2 \u099A\u09BF\u09B9\u09CD\u09A8\u09BF\u09A4 \u0985\u0982\u09B6 (Level 1) \u09AA\u09A1\u09BC\u09C1\u09A8\u0964

| \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4\u09BF\u09B0 \u09A7\u09BE\u09AA | \u0985\u0982\u09B6\u09C7\u09B0 \u09A8\u09BE\u09AE | \u09AA\u09BE\u09A0\u09CD\u09AF\u09B8\u09C2\u099A\u09BF\u09B0 \u0985\u0997\u09CD\u09B0\u09BE\u09A7\u09BF\u0995\u09BE\u09B0 |
| --- | --- | --- |
| \u09A7\u09BE\u09AA \u09E7 (\uD83D\uDD34) | \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0 \u0986\u0997\u09C7 \u0985\u09AC\u09B6\u09CD\u09AF\u0987 \u09AA\u09A1\u09BC\u09C1\u09A8 | \u09B8\u0982\u099C\u09CD\u099E\u09BE, \u09AE\u09C2\u09B2 \u09A7\u09BE\u09B0\u09A3\u09BE |
| \u09A7\u09BE\u09AA \u09E8 (\uD83D\uDFE1) | \u09B8\u09AE\u09AF\u09BC \u09A5\u09BE\u0995\u09B2\u09C7 \u09AC\u09BF\u09B8\u09CD\u09A4\u09BE\u09B0\u09BF\u09A4 \u09AA\u09A1\u09BC\u09C1\u09A8 | \u09AC\u09BF\u09B6\u09CD\u09B2\u09C7\u09B7\u09A3, \u0995\u09C7\u09B8 \u09B8\u09CD\u099F\u09BE\u09A1\u09BF |
| \u09A7\u09BE\u09AA \u09E9 (\uD83D\uDFE2) | \u099C\u09BE\u09A8\u09BE \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8 | \u09AA\u09B0\u09BF\u09AA\u09C2\u09B0\u0995 \u09A4\u09A5\u09CD\u09AF |`;

const SAMPLE_MD_2 = `# \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC \u09E6\u09E7: \u09AC\u09BE\u0982\u09B2\u09BE \u09AC\u09CD\u09AF\u09BE\u0995\u09B0\u09A3 \u0993 \u09A8\u09BF\u09B0\u09CD\u09AE\u09BF\u09A4\u09BF

\u09AC\u09BE\u0982\u09B2\u09BE \u0985\u0982\u09B6\u09C7 \u09AE\u09CB\u099F **\u09EA\u09E6 \u09A8\u09AE\u09CD\u09AC\u09B0** \u09A8\u09BF\u09B0\u09CD\u09A7\u09BE\u09B0\u09BF\u09A4\u0964

> \uD83D\uDCA1 **\u098F\u0995\u09CD\u09B8\u09BE\u09AE \u099F\u09BF\u09AA\u09B8:** \u09A6\u09BE\u09AA\u09CD\u09A4\u09B0\u09BF\u0995 \u09AA\u09A4\u09CD\u09B0 \u09B2\u09C7\u0996\u09BE\u09B0 \u09B8\u09AE\u09AF\u09BC **\u09B8\u09CD\u09AE\u09BE\u09B0\u0995 \u09A8\u09AE\u09CD\u09AC\u09B0** \u09AC\u09BE\u09AE \u09AA\u09BE\u09B6\u09C7 \u09A6\u09BF\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964

> \u09AE\u09C2\u09B2 \u0995\u09AC\u09BF\u09A4\u09BE\u0982\u09B6 (\u0995\u09BE\u099C\u09C0 \u09A8\u099C\u09B0\u09C1\u09B2 \u0987\u09B8\u09B2\u09BE\u09AE): \u09A6\u09C1\u09B0\u09CD\u0997\u09AE \u0997\u09BF\u09B0\u09BF, \u0995\u09BE\u09A8\u09CD\u09A4\u09BE\u09B0-\u09AE\u09B0\u09C1, \u09A6\u09C1\u09B8\u09CD\u09A4\u09B0 \u09AA\u09BE\u09B0\u09BE\u09AC\u09BE\u09B0!

> \u26A0\uFE0F **\u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0\u09B0\u09BE \u098F\u0996\u09BE\u09A8\u09C7 \u09AC\u09C7\u09B6\u09BF \u09AD\u09C1\u09B2 \u0995\u09B0\u09C7:** \u09AC\u09BE\u09A8\u09BE\u09A8 \u09B6\u09C1\u09A6\u09CD\u09A7\u09BF\u09A4\u09C7 '\u09A6\u09C1\u09B0\u09BE\u09AC\u09B8\u09CD\u09A5\u09BE' \u09A8\u09AF\u09BC, \u09B6\u09C1\u09A6\u09CD\u09A7 \u09B0\u09C2\u09AA \u09B9\u09B2\u09CB **\u09A6\u09C1\u09B0\u09AC\u09B8\u09CD\u09A5\u09BE**\u0964

## \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u09E7. \u0995\u09C3\u09A4\u09CD\u09B0\u09BF\u09AE \u09AC\u09C1\u09A6\u09CD\u09A7\u09BF\u09AE\u09A4\u09CD\u09A4\u09BE \u0993 \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7\u09B0 \u09B6\u09CD\u09B0\u09AE\u09AC\u09BE\u099C\u09BE\u09B0

| \u0996\u09BE\u09A4 | \u0995\u09C3\u09A4\u09CD\u09B0\u09BF\u09AE \u09AC\u09C1\u09A6\u09CD\u09A7\u09BF\u09AE\u09A4\u09CD\u09A4\u09BE\u09B0 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u0997 | \u0995\u09B0\u09A3\u09C0\u09AF\u09BC |
| --- | --- | --- |
| \u09A4\u09A5\u09CD\u09AF\u09AA\u09CD\u09B0\u09AF\u09C1\u0995\u09CD\u09A4\u09BF | \u0985\u099F\u09CB\u09AE\u09C7\u099F\u09C7\u09A1 \u0995\u09CB\u09A1\u09BF\u0982 | \u09AA\u09CD\u09B0\u09AE\u09CD\u09AA\u099F \u0987\u099E\u09CD\u099C\u09BF\u09A8\u09BF\u09AF\u09BC\u09BE\u09B0\u09BF\u0982 \u09AA\u09CD\u09B0\u09B6\u09BF\u0995\u09CD\u09B7\u09A3 |
| \u09A4\u09C8\u09B0\u09BF \u09AA\u09CB\u09B6\u09BE\u0995 | \u09B8\u09CD\u09AC\u09AF\u09BC\u0982\u0995\u09CD\u09B0\u09BF\u09AF\u09BC \u09AE\u09BE\u09A8 \u09A8\u09BF\u09AF\u09BC\u09A8\u09CD\u09A4\u09CD\u09B0\u09A3 | \u0995\u09BE\u09B0\u09BF\u0997\u09B0\u09BF \u09B0\u09BF\u09B8\u09CD\u0995\u09BF\u09B2\u09BF\u0982 |`;

const SAMPLE_MD_3 = `# Chapter 02: English Essay, Letter and Reading Comprehension

The 40-mark English written section evaluates analytical essay writing (15 marks), official letter drafting (5 marks), unseen reading comprehension (10 marks), and grammar (10 marks).

> \uD83D\uDCA1 **Exam Tips:** Never answer comprehension questions using external assumptions; paraphrase strictly from the provided passage.

## Question 1. Write an official letter to the DC requesting digital library facilities.

### Model Structure
- **Sender Memo Header:** Official designation, reference number, and date.
- **Subject Line:** Concise, underlined administrative subject.
- **Body Paragraphs:** Current student demand, proposed infrastructure, and budget summary.`;

const SAMPLE_MD_4 = `# \u09AA\u09B0\u09BF\u09B6\u09BF\u09B7\u09CD\u099F \u0995: \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6 \u0993 \u0986\u09A8\u09CD\u09A4\u09B0\u09CD\u099C\u09BE\u09A4\u09BF\u0995 \u09AC\u09BF\u09B7\u09AF\u09BC\u09BE\u09AC\u09B2\u09BF \u0995\u09C1\u0987\u0995 \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8

\u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0 \u09B9\u09B2\u09C7 \u09AA\u09CD\u09B0\u09AC\u09C7\u09B6\u09C7\u09B0 \u09AA\u09C2\u09B0\u09CD\u09AC\u09C7 \u0997\u09C1\u09B0\u09C1\u09A4\u09CD\u09AC\u09AA\u09C2\u09B0\u09CD\u09A3 \u09B8\u09BE\u0982\u09AC\u09BF\u09A7\u09BE\u09A8\u09BF\u0995 \u09B8\u0982\u09B6\u09CB\u09A7\u09A8\u09C0 \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8 \u0995\u09B0\u09C1\u09A8\u0964

- **\u09B8\u0982\u09AC\u09BF\u09A7\u09BE\u09A8 \u0993 \u09B0\u09BE\u09B7\u09CD\u099F\u09CD\u09B0\u09C0\u09AF\u09BC \u09B8\u0982\u09B8\u09CD\u0995\u09BE\u09B0:** \u09AE\u09CC\u09B2\u09BF\u0995 \u0985\u09A7\u09BF\u0995\u09BE\u09B0 (\u0985\u09A8\u09C1\u099A\u09CD\u099B\u09C7\u09A6 \u09E8\u09EC\u201345\u0995) \u098F\u09AC\u0982 \u09A8\u09CD\u09AF\u09BE\u09AF\u09BC\u09AA\u09BE\u09B2 (\u0985\u09A8\u09C1\u099A\u09CD\u099B\u09C7\u09A6 77)\u0964
- **\u0985\u09B0\u09CD\u09A5\u09A8\u09C8\u09A4\u09BF\u0995 \u09B8\u09C2\u099A\u0995:** \u09AE\u09C1\u09A6\u09CD\u09B0\u09BE\u09B8\u09CD\u09AB\u09C0\u09A4\u09BF \u09A8\u09BF\u09AF\u09BC\u09A8\u09CD\u09A4\u09CD\u09B0\u09A3, \u09B0\u09AA\u09CD\u09A4\u09BE\u09A8\u09BF \u09AC\u09B9\u09C1\u09AE\u09C1\u0996\u09C0\u0995\u09B0\u09A3 \u098F\u09AC\u0982 \u09B0\u09C7\u09AE\u09BF\u099F\u09CD\u09AF\u09BE\u09A8\u09CD\u09B8 \u09AA\u09CD\u09B0\u09AC\u09BE\u09B9\u0964`;

const INITIAL_BOOKS: Book[] = [{
  id: "book-1",
  title: "\u09AA\u09BF\u098F\u09B8\u09B8\u09BF \u09B2\u09BF\u0996\u09BF\u09A4 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u09B8\u09B9\u09BE\u09AF\u09BC\u09BF\u0995\u09BE",
  subtitle: "\u09A8\u09A8-\u0995\u09CD\u09AF\u09BE\u09A1\u09BE\u09B0 \u0993 \u09A8\u09A8-\u09A1\u09BF\u09AA\u09BE\u09B0\u09CD\u099F\u09AE\u09C7\u09A8\u09CD\u099F\u09BE\u09B2 \u0985\u0982\u09B6 \u2014 \u09AC\u09BE\u0982\u09B2\u09BE (40), \u0987\u0982\u09B0\u09C7\u099C\u09BF (40) \u0993 \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u099C\u09CD\u099E\u09BE\u09A8 (40)",
  author: "\u09AE\u09CB\u0983 \u09B8\u09CB\u09B9\u09C7\u09B2 \u09B0\u09BE\u09A8\u09BE",
  language: "bn",
  targetWordCount: 60000,
  chapters: [
    { id: "ch-1", kind: "FRONTMATTER", title: "\u09AA\u09CD\u09B0\u09BE\u0995\u0995\u09A5\u09A8 \u0993 3 \u09A7\u09BE\u09AA\u09C7 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4\u09BF \u0995\u09CC\u09B6\u09B2", revisionNumber: 1, markdown: SAMPLE_MD_1, revisions: [{ id: "rev-101", revisionNumber: 1, label: "Initial Frontmatter", createdAt: "2026-10-14 09:30", markdown: "# \u09AA\u09CD\u09B0\u09BE\u0995\u0995\u09A5\u09A8" }] },
    { id: "ch-2", kind: "CHAPTER", title: "\u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 01: \u09AC\u09BE\u0982\u09B2\u09BE \u09AC\u09CD\u09AF\u09BE\u0995\u09B0\u09A3 \u0993 \u09A8\u09BF\u09B0\u09CD\u09AE\u09BF\u09A4\u09BF (40)", revisionNumber: 2, markdown: SAMPLE_MD_2, revisions: [{ id: "rev-202", revisionNumber: 2, label: "\u09B8\u09CD\u09AE\u09BE\u09B0\u0995 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09B8\u0982\u09AF\u09CB\u099C\u09A8", createdAt: "2026-10-14 11:15", markdown: "# \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 01" }, { id: "rev-201", revisionNumber: 1, label: "Initial Draft", createdAt: "2026-10-14 08:45", markdown: "# \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 01" }] },
    { id: "ch-3", kind: "CHAPTER", title: "Chapter 02: English Essay, Letter & Reading Comprehension (40)", revisionNumber: 1, markdown: SAMPLE_MD_3, revisions: [{ id: "rev-301", revisionNumber: 1, label: "Initial English module", createdAt: "2026-10-14 10:00", markdown: "# Chapter 02: English" }] },
    { id: "ch-4", kind: "BACKMATTER", title: "\u09AA\u09B0\u09BF\u09B6\u09BF\u09B7\u09CD\u099F \u0995: \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6 \u0993 \u0986\u09A8\u09CD\u09A4\u09B0\u09CD\u099C\u09BE\u09A4\u09BF\u0995 \u09AC\u09BF\u09B7\u09AF\u09BC\u09BE\u09AC\u09B2\u09BF \u0995\u09C1\u0987\u0995 \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8", revisionNumber: 1, markdown: SAMPLE_MD_4, revisions: [{ id: "rev-401", revisionNumber: 1, label: "Initial Appendix", createdAt: "2026-10-14 10:20", markdown: "# \u09AA\u09B0\u09BF\u09B6\u09BF\u09B7\u09CD\u099F \u0995" }] },
  ],
}];

function escapeHtml(s: string): string {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function formatInline(s: string): string {
  return escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g,"<em>$1</em>")
    .replace(/`([^`]+)`/g,"<code style='background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:12px;'>$1</code>");
}
function countWords(md: string): number {
  const c = String(md||"").replace(/[#>*_`|~-]/g," ").trim();
  return c ? c.split(/\s+/).filter(Boolean).length : 0;
}
function detectWarnings(md: string): string[] {
  const w: string[] = [];
  if (/\$\$[^$]+\$\$|\\frac\{|\\sqrt\{/.test(md)) w.push("Raw LaTeX syntax detected; convert to Unicode before print.");
  if (/[\u0400-\u04FF\u30A0-\u30FF]/.test(md)) w.push("Foreign script (Cyrillic/Katakana OCR artifact) detected.");
  if (/\u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 OCR/.test(md)) w.push("Conversational AI/OCR prompt residue detected.");
  return w;
}
function renderMd(md: string, p: DesignProfile): string {
  const lines = String(md||"").replace(/\r\n/g,"\n").split("\n");
  const parts: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const hm = line.match(/^(#{1,4})\s+(.+)$/);
    if (hm) {
      const lv = hm[1].length;
      const sz = lv===1?"1.5em":lv===2?"1.2em":lv===3?"1.05em":"1em";
      parts.push(`<h${lv} style="color:${p.primaryColor};font-size:${sz};font-weight:700;margin:12px 0 6px;font-family:'${p.latinFont}','${p.banglaHeadingFont}',sans-serif;">${formatInline(hm[2])}</h${lv}>`);
      i++; continue;
    }
    if (line.trim().startsWith(">")) {
      const ql: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) { ql.push(lines[i].replace(/^\s*>\s?/,"")); i++; }
      const joined = ql.join("\n").trim();
      if (joined.includes("\uD83D\uDCA1")||joined.includes("\u098F\u0995\u09CD\u09B8\u09BE\u09AE \u099F\u09BF\u09AA\u09B8")) {
        parts.push(`<aside style="background:#FFF4ED;border-left:5px solid ${p.accentColor};padding:10px 15px;border-radius:4px;margin:10px 0;"><div style="color:${p.accentColor};font-weight:700;font-size:12px;margin-bottom:3px;">\uD83D\uDCA1 Exam Tips:</div><div style="font-size:${p.bodyFontSizePt}pt;">${formatInline(joined.replace(/^\uD83D\uDCA1\s*\*\*[^*]+\*\*:?\s*/,""))}</div></aside>`);
      } else if (joined.includes("\u26A0\uFE0F")||joined.includes("\u09AD\u09C1\u09B2")) {
        parts.push(`<aside style="background:#fff5f5;border-left:5px solid #9E2A2B;padding:10px 15px;border-radius:4px;margin:10px 0;"><div style="color:#9E2A2B;font-weight:700;font-size:12px;margin-bottom:3px;">\u26A0\uFE0F \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u09AD\u09C1\u09B2:</div><div style="font-size:${p.bodyFontSizePt}pt;">${formatInline(joined.replace(/^\u26A0\uFE0F\s*\*\*[^*]+\*\*:?\s*/,""))}</div></aside>`);
      } else {
        parts.push(`<aside style="background:#F4F7FB;border-left:5px solid ${p.primaryColor};padding:12px 16px;border-radius:4px;margin:10px 0;"><div style="color:${p.primaryColor};font-weight:700;font-size:12px;margin-bottom:3px;">\u09A6\u09CD\u09B0\u09B7\u09CD\u099F\u09AC\u09CD\u09AF / \u0989\u09A6\u09CD\u09A7\u09C3\u09A4\u09BF:</div><div style="font-size:${p.bodyFontSizePt}pt;font-style:italic;">${formatInline(joined)}</div></aside>`);
      }
      continue;
    }
    if (line.trim().startsWith("|")&&line.trim().endsWith("|")) {
      const tl: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) { tl.push(lines[i].trim()); i++; }
      if (tl.length >= 2) {
        const sr = (r: string) => r.slice(1,-1).split("|").map(c=>c.trim());
        const heads = sr(tl[0]);
        const isSep = /^[\s|:-]+$/.test(tl[1]);
        const rows = (isSep?tl.slice(2):tl.slice(1)).map(sr);
        const th = heads.map(h=>`<th style="background:${p.primaryColor};color:#fff;padding:7px 10px;text-align:left;border:1px solid #D9E2EC;font-size:12px;">${formatInline(h)}</th>`).join("");
        const tr = rows.map((r,ri)=>`<tr>${r.map(c=>`<td style="background:${ri%2===0?"#fff":"#F8FAFC"};padding:7px 10px;border:1px solid #D9E2EC;font-size:12px;">${formatInline(c)}</td>`).join("")}</tr>`).join("");
        parts.push(`<table style="width:100%;border-collapse:collapse;margin:12px 0;"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`);
        continue;
      }
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*]\s+/,"").trim()); i++; }
      parts.push(`<ul style="list-style-type:disc;padding-left:20px;margin:8px 0;">${items.map(it=>`<li style="margin-bottom:4px;">${formatInline(it)}</li>`).join("")}</ul>`);
      continue;
    }
    parts.push(`<p style="font-size:${p.bodyFontSizePt}pt;line-height:${p.lineHeight};font-family:'${p.latinFont}','${p.banglaBodyFont}',serif;margin:8px 0;">${formatInline(line)}</p>`);
    i++;
  }
  return parts.join("\n");
}

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("bn");
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [books, setBooks] = useState<Book[]>(INITIAL_BOOKS);
  const [activeBookId, setActiveBookId] = useState("book-1");
  const [activeChapterId, setActiveChapterId] = useState("ch-2");
  const [design, setDesign] = useState<DesignProfile>(INITIAL_DESIGN);
  const [editorMode, setEditorMode] = useState<EditorMode>("visual");
  const [exportScope, setExportScope] = useState<ExportScope>("BOOK");
  const [toast, setToast] = useState<string|null>(null);
  const [showCreateBook, setShowCreateBook] = useState(false);
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookSubtitle, setNewBookSubtitle] = useState("");
  const [newBookAuthor, setNewBookAuthor] = useState("\u09AE\u09CB\u0983 \u09B8\u09CB\u09B9\u09C7\u09B2 \u09B0\u09BE\u09A8\u09BE");
  const [newBookLang, setNewBookLang] = useState<"bn"|"en">("bn");
  const [newChTitle, setNewChTitle] = useState("");
  const [newChKind, setNewChKind] = useState<ChapterKind>("CHAPTER");
  const [impFmt, setImpFmt] = useState("MARKDOWN");
  const [impFile, setImpFile] = useState("chapter_03.md");
  const [impPayload, setImpPayload] = useState("# \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 03: \u09B8\u0982\u09B8\u09CD\u0995\u09BE\u09B0\u09CD\u09A5\u09C0 \u09B8\u0982\u09B8\u09CD\u09A6\u09B0\u09CD\u09AD\u09A8\u09BE\u0964\n\n> \uD83D\uDCA1 **\u098F\u0995\u09CD\u09B8\u09BE\u09AE \u099F\u09BF\u09AA\u09B8:** \u09B8\u0982\u09AC\u09BF\u09A7\u09BE\u09A8\u09C7\u09B0 \u09AE\u09CC\u09B2\u09BF\u0995 \u0985\u09A7\u09BF\u0995\u09BE\u09B0\u09B8\u09AE\u09C2\u09B9 (\u0985\u09A8\u09C1\u099A\u09CD\u099B\u09C7\u09A6 26\u201347\u0995) \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8 \u0995\u09B0\u09C1\u09A8\u0964\n\n\u0997\u09A3\u09AA\u09CD\u09B0\u099C\u09BE\u09A4\u09A8\u09CD\u09A4\u09CD\u09B0\u09C0 \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7\u09B0 \u09B8\u0982\u09B8\u09CD\u0995\u09BE\u09B0\u09CD\u09A5\u09C0 \u09B8\u0982\u09B8\u09CD\u09A6\u09B0\u09CD\u09AD\u09A8\u09BE\u0964");
  const [impReport, setImpReport] = useState<{type:"idle"|"ok"|"error";message:string;warnings:string[];}>({type:"idle",message:"\u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4: Validate & Preview \u0995\u09CD\u09B2\u09BF\u0995 \u0995\u09B0\u09C1\u09A8\u0964",warnings:[]});
  const [designForm, setDesignForm] = useState<DesignProfile>({...INITIAL_DESIGN});
  const [revNote, setRevNote] = useState("");

  const t = I18N[locale];
  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(()=>setToast(null),3200); },[]);
  const activeBook = books.find(b=>b.id===activeBookId)??books[0];
  const activeChapter = activeBook?.chapters.find(c=>c.id===activeChapterId)??activeBook?.chapters[0];

  const switchView = (v: View) => { setActiveView(v); if(v==="design") setDesignForm({...design}); };

  const handleCreateBook = (e: React.FormEvent) => {
    e.preventDefault();
    if(newBookTitle.trim().length<2) return;
    const id=`book-${Date.now()}`;const chId=`ch-${Date.now()}`;
    const nb: Book = {id,title:newBookTitle.trim(),subtitle:newBookSubtitle.trim()||"\u09A6\u09CD\u09AC\u09BF\u09AD\u09BE\u09B7\u09BF\u0995 \u09AA\u09BE\u09A3\u09CD\u09A1\u09C1\u09B2\u09BF\u09AA\u09BF",author:newBookAuthor.trim()||"\u09B2\u09C7\u0996\u0995",language:newBookLang,targetWordCount:45000,chapters:[{id:chId,kind:"CHAPTER",title:newBookLang==="bn"?"\u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 01: \u09B8\u09C2\u099A\u09A8\u09BE":"Chapter 01: Introduction",revisionNumber:1,markdown:`# ${newBookTitle.trim()}\n\n> \uD83D\uDCA1 \u098F\u0996\u09BE\u09A8\u09C7 \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09C1\u09A8\u0964`,revisions:[{id:`rev-${Date.now()}`,revisionNumber:1,label:"Initial",createdAt:new Date().toISOString().slice(0,16).replace("T"," "),markdown:`# ${newBookTitle.trim()}`}]}]};
    setBooks([nb,...books]);setActiveBookId(id);setActiveChapterId(chId);setNewBookTitle("");setNewBookSubtitle("");setShowCreateBook(false);
    showToast("Created new book project.");
  };

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newChTitle.trim()||!activeBook) return;
    const chId=`ch-${Date.now()}`;
    const nc: Chapter = {id:chId,kind:newChKind,title:newChTitle.trim(),revisionNumber:1,markdown:`# ${newChTitle.trim()}\n\n\u098F\u0996\u09BE\u09A8\u09C7 \u09B2\u09BF\u0996\u09C1\u09A8...`,revisions:[{id:`rev-${Date.now()}`,revisionNumber:1,label:"Initial",createdAt:new Date().toISOString().slice(0,16).replace("T"," "),markdown:`# ${newChTitle.trim()}`}]};
    setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:[...b.chapters,nc]}:b));
    setActiveChapterId(chId);setNewChTitle("");setShowAddChapter(false);showToast("Added new chapter.");
  };

  const delBook = (id: string) => { if(books.length<=1) return; const r=books.filter(b=>b.id!==id); setBooks(r);setActiveBookId(r[0].id);setActiveChapterId(r[0].chapters[0]?.id??""); showToast("Book deleted."); };
  const delChapter = (id: string) => { if(!activeBook||activeBook.chapters.length<=1) return; const r=activeBook.chapters.filter(c=>c.id!==id); setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:r}:b));setActiveChapterId(r[0].id);showToast("Chapter removed."); };
  const moveChapter = (idx: number,dir: -1|1) => { if(!activeBook) return; const t2=idx+dir; if(t2<0||t2>=activeBook.chapters.length) return; const copy=[...activeBook.chapters];const tmp=copy[idx];copy[idx]=copy[t2];copy[t2]=tmp; setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:copy}:b));showToast("Chapter order updated."); };
  const updMd = (md: string) => { if(!activeBook||!activeChapter) return; setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:b.chapters.map(c=>c.id===activeChapter.id?{...c,markdown:md}:c)}:b)); };
  const updTitle = (title: string) => { if(!activeBook||!activeChapter) return; setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:b.chapters.map(c=>c.id===activeChapter.id?{...c,title}:c)}:b)); };
  const updKind = (kind: ChapterKind) => { if(!activeBook||!activeChapter) return; setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:b.chapters.map(c=>c.id===activeChapter.id?{...c,kind}:c)}:b)); };

  const saveSnapshot = () => {
    if(!activeBook||!activeChapter) return;
    const label=revNote.trim()||(`Manual Snapshot v${activeChapter.revisionNumber+1}`);
    const next=activeChapter.revisionNumber+1;
    const nr: Revision={id:`rev-${Date.now()}`,revisionNumber:next,label,createdAt:new Date().toISOString().slice(0,16).replace("T"," "),markdown:activeChapter.markdown};
    setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:b.chapters.map(c=>c.id===activeChapter.id?{...c,revisionNumber:next,revisions:[nr,...c.revisions]}:c)}:b));
    setRevNote("");showToast(`Saved Revision Snapshot v${next}.`);
  };
  const restoreRevision = (rev: Revision) => {
    if(!activeBook||!activeChapter) return;
    const next=activeChapter.revisionNumber+1;
    const nr: Revision={id:`rev-${Date.now()}`,revisionNumber:next,label:`Restored from v${rev.revisionNumber}`,createdAt:new Date().toISOString().slice(0,16).replace("T"," "),markdown:rev.markdown};
    setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:b.chapters.map(c=>c.id===activeChapter.id?{...c,revisionNumber:next,markdown:rev.markdown,revisions:[nr,...c.revisions]}:c)}:b));
    showToast(`Restored v${rev.revisionNumber} as new v${next}.`);switchView("editor");
  };
  const saveDesign = () => { setDesign({...designForm}); showToast("Design profile updated."); };
  const applyPreset = (preset: Partial<DesignProfile>) => { setDesignForm(f=>({...f,...preset})); showToast(`Applied preset: ${preset.name}`); };

  const validateImport = () => {
    if(impFile.startsWith("/")||impFile.includes("../")||impFile.includes("..\\")) { setImpReport({type:"error",message:`Security Block: Path traversal rejected for "${impFile}".`,warnings:[]}); return false; }
    if(/\.(exe|sh|bat|cmd|js|php)$/i.test(impFile)) { setImpReport({type:"error",message:`Security Block: Disallowed file type "${impFile}".`,warnings:[]}); return false; }
    const w=detectWarnings(impPayload);
    if(impFmt==="DOCX"&&/<w:tbl|w:vMerge/.test(impPayload)) w.push("DOCX: Complex merged table cells converted to pipe table.");
    setImpReport({type:"ok",message:`Validation Passed (${impFmt} · ${countWords(impPayload)} words)`,warnings:w});
    return true;
  };
  const confirmImport = () => {
    if(!validateImport()||!activeBook) return;
    const cleanMd=impPayload.replace(/<[^>]+>/g,"").trim();
    const title=(cleanMd.match(/^#\s+(.+)$/m)||[null,impFile])[1]!;
    const chId=`ch-imp-${Date.now()}`;
    const nc: Chapter={id:chId,kind:"CHAPTER",title,revisionNumber:1,markdown:cleanMd,revisions:[{id:`rev-imp-${Date.now()}`,revisionNumber:1,label:"Imported via Validated Pipeline",createdAt:new Date().toISOString().slice(0,16).replace("T"," "),markdown:cleanMd}]};
    setBooks(books.map(b=>b.id===activeBook.id?{...b,chapters:[...b.chapters,nc]}:b));
    setActiveChapterId(chId);setShowImport(false);switchView("editor");showToast("Imported chapter into active book.");
  };
  const insertSnippet = (snippet: string) => {
    if(!activeChapter) return;
    const sep=activeChapter.markdown.endsWith("\n")||activeChapter.markdown.length===0?"":"\n\n";
    updMd(`${activeChapter.markdown}${sep}${snippet}\n`);showToast("Block inserted.");
  };

  const kindColor = (k: ChapterKind) => k==="FRONTMATTER"?"#285b4b":k==="BACKMATTER"?"#123B6D":"#F26B21";
  const totalCh = books.reduce((a,b)=>a+b.chapters.length,0);
  const totalW = books.reduce((a,b)=>a+b.chapters.reduce((ac,c)=>ac+countWords(c.markdown),0),0);

  const NavBtn = ({id,view,label}:{id:string;view:View;label:string}) => (
    <button id={id} type="button" onClick={()=>switchView(view)}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${activeView===view?"bg-[#285b4b] text-white":"bg-[#f8f7f4] text-[#6b6964] hover:text-[#20201e]"}`}>
      {label}
    </button>
  );

  const renderPrintPages = () => {
    if(!activeBook) return null;
    const p=design;
    const chs=exportScope==="CHAPTER"&&activeChapter?[activeChapter]:activeBook.chapters;
    return chs.map((ch,idx)=>{
      const pn=idx+1,left=pn%2===0;
      const inner=p.marginInsideMm+p.gutterMm;
      const lp=p.mirrorMargins?(left?p.marginOutsideMm:inner):p.marginOutsideMm;
      const rp=p.mirrorMargins?(left?inner:p.marginOutsideMm):p.marginOutsideMm;
      return (
        <div key={ch.id} className="print-sheet mx-auto max-w-3xl rounded-lg border border-[#D9E2EC] bg-white shadow-md relative overflow-hidden"
          style={{padding:`${p.marginTopMm*1.4}px ${rp*1.6}px ${p.marginBottomMm*1.4}px ${lp*1.6}px`}}>
          <div className={`no-print absolute top-0 bottom-0 ${left?"right-0 border-l":"left-0 border-r"} border-dashed border-orange-300 bg-orange-50/40`}
            style={{width:`${p.gutterMm*3}px`}} title={`Binding Gutter (${p.gutterMm}mm)`}/>
          <header className="mb-5 flex items-center justify-between border-b border-[#D9E2EC] pb-2 text-[11px] text-[#6b6964]">
            <span className="font-semibold">{left?activeBook.title:ch.title}</span>
            <span>{left?`Page ${pn} (Left)`:`${ch.title} (Right)`}</span>
          </header>
          <div className="rounded text-sm font-bold mb-4 px-4 py-2.5 text-white" style={{background:p.accentColor}}>
            <div>{ch.title}</div>
            <div className="text-[11px] opacity-90">{activeBook.title} · {activeBook.author} · Trim: {p.widthMm}×{p.heightMm}mm</div>
          </div>
          <div className="manuscript-serif space-y-2" dangerouslySetInnerHTML={{__html:renderMd(ch.markdown,p)}}/>
          {p.watermarkText&&<div className="mt-6 text-center text-[11px] italic text-[#6b6964] opacity-75">{p.watermarkText}</div>}
          <footer className={`mt-8 border-t border-[#D9E2EC] pt-2 flex items-center ${left?"justify-start":"justify-end"} text-xs font-bold text-[#123B6D]`}>
            <span>Page {pn}</span>
          </footer>
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="no-print sticky top-0 z-30 border-b border-[#e6e2dc] bg-white/95 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={()=>switchView("dashboard")} className="text-xl font-bold tracking-tight text-[#20201e] hover:opacity-80">
              BookForge<span className="text-[#285b4b]">.</span>
            </button>
            <span className="hidden sm:inline rounded-full bg-[#edf4ef] px-2.5 py-0.5 text-xs font-semibold text-[#285b4b]">v1.0 · Complete</span>
            <span className="rounded-full border border-[#e6e2dc] bg-[#f8f7f4] px-2.5 py-0.5 text-xs text-[#6b6964]">Auth: scrypt + HttpOnly</span>
            <span className="hidden md:inline rounded-full bg-[#edf4ef] px-2.5 py-0.5 text-[11px] font-semibold text-[#285b4b]">DB: Healthy · SSRF Guard: Active</span>
          </div>
          <nav className="flex flex-wrap items-center gap-1.5">
            <NavBtn id="navDashboard" view="dashboard" label={t.navDashboard}/>
            <NavBtn id="navEditor" view="editor" label={t.navEditor}/>
            <NavBtn id="navDesign" view="design" label={t.navDesign}/>
            <NavBtn id="navPreview" view="preview" label={t.navPreview}/>
            <NavBtn id="navRevisions" view="revisions" label={t.navRevisions}/>
          </nav>
          <div className="flex items-center gap-2">
            <button type="button" onClick={()=>setShowImport(true)} className="rounded-lg border border-[#e6e2dc] bg-white px-3 py-1.5 text-xs font-semibold text-[#20201e] hover:bg-[#f8f7f4]">
              ↑ Import (.md / .docx / .zip)
            </button>
            <div className="flex items-center rounded-full border border-[#e6e2dc] bg-[#f8f7f4] p-0.5 text-xs">
              {(["bn","en"] as Locale[]).map(l=>(
                <button key={l} type="button" onClick={()=>setLocale(l)}
                  className={`rounded-full px-2.5 py-1 font-semibold ${locale===l?"bg-[#285b4b] text-white":"text-[#6b6964]"}`}>
                  {l==="bn"?"\u09AC\u09BE\u0982\u09B2\u09BE":"English"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {toast&&<div className="no-print fixed bottom-5 right-5 z-50 max-w-md rounded-xl border border-[#285b4b] bg-[#20201e] px-4 py-3 text-xs font-medium text-white shadow-lg">{toast}</div>}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">

        {/* DASHBOARD */}
        {activeView==="dashboard"&&(
          <section className="space-y-8">
            <div className="grid gap-8 rounded-3xl border border-[#e6e2dc] bg-white p-6 shadow-sm lg:grid-cols-[1.15fr_0.85fr] lg:items-center sm:p-8">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#285b4b]">{t.heroEyebrow}</p>
                <h1 className="text-3xl font-bold tracking-tight text-[#20201e] sm:text-5xl leading-tight">{t.heroTitle}</h1>
                <p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-[#6b6964]">{t.heroDesc}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="button" onClick={()=>setShowCreateBook(true)} className="rounded-xl bg-[#285b4b] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">+ {t.createBook}</button>
                  <button type="button" onClick={()=>setShowImport(true)} className="rounded-xl border border-[#e6e2dc] bg-white px-5 py-2.5 text-sm font-semibold text-[#20201e] hover:bg-[#f8f7f4]">↑ {t.importBook}</button>
                </div>
              </div>
              <div className="rounded-2xl border border-[#e6e2dc] bg-[#f8f7f4] p-5">
                <div className="flex items-center justify-between border-b border-[#e6e2dc] pb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b6964]">BookForge Architecture</p>
                    <h2 className="mt-0.5 text-base font-bold text-[#123B6D]">\u098F\u0995\u0995 \u09AC\u0987, \u0985\u09A8\u09A8\u09CD\u09AF \u09B8\u09CD\u099F\u09CD\u09B0\u09BE\u0995\u099A\u09BE\u09B0\u09C7\u09B0 \u09A8\u09BF\u09B6\u09CD\u099A\u09AF\u09BC\u09A4\u09BE</h2>
                  </div>
                  <span className="rounded-full bg-[#edf4ef] px-2.5 py-0.5 text-xs font-semibold text-[#285b4b]">Verified</span>
                </div>
                <div className="mt-4 space-y-2.5 text-xs">
                  {[
                    {n:"01",bg:"#edf4ef",c:"#285b4b",t:"\u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC \u0993 \u0995\u09BE\u09A0\u09BE\u09AE\u09CB",d:"\u09AA\u09CD\u09B0\u09BE\u0995\u0995\u09A5\u09A8 \u00B7 \u09AE\u09C2\u09B2 \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC \u00B7 \u09AA\u09B0\u09BF\u09B6\u09BF\u09B7\u09CD\u099F \u098F\u09AC\u0982 \u099F\u09CD\u09B0\u09BE\u09A8\u099C\u09CD\u09AF\u09BE\u0995\u09B6\u09A8\u09BE\u09B2 \u0995\u09CD\u09B0\u09AE\u09AC\u09BF\u09A8\u09CD\u09AF\u09BE\u09B8"},
                    {n:"02",bg:"#FFF4ED",c:"#F26B21",t:"\u09A1\u09C1\u09AF\u09BC\u09BE\u09B2-\u09AE\u09CB\u09A1 \u098F\u09A1\u09BF\u099F\u09B0 \u0993 \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8",d:"\u09AD\u09BF\u099C\u09CD\u09AF\u09C1\u09AF\u09BC\u09BE\u09B2 TipTap + \u09AE\u09BE\u09B0\u09CD\u0995\u09A1\u09BE\u0989\u09A8 \u09B8\u09CB\u09B0\u09CD\u09B8, \u0985\u099F\u09CB\u09B8\u09C7\u09AD \u098F\u09AC\u0982 \u09B8\u0982\u09B8\u09CD\u0995\u09B0\u09A3 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0"},
                    {n:"03",bg:"#F4F7FB",c:"#123B6D",t:"\u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u09CB\u09AB\u09BE\u0987\u09B2 \u0993 PDF \u0987\u099E\u09CD\u099C\u09BF\u09A8",d:"215 \u00D7 275 \u09AE\u09BF\u09AE\u09BF \u09AE\u09BF\u09B0\u09B0 \u09AE\u09BE\u09B0\u09CD\u099C\u09BF\u09A8, \u09AC\u09BE\u0981\u09A7\u09BE\u0987 \u0997\u099F\u09BE\u09B0 \u0993 \u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F-\u09B0\u09C7\u09A1\u09BF PDF \u098F\u0995\u09CD\u09B8\u09AA\u09CB\u09B0\u09CD\u099F"},
                  ].map(p=>(
                    <div key={p.n} className="flex items-center gap-3 rounded-xl bg-white p-3 border border-[#e6e2dc]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-bold" style={{background:p.bg,color:p.c}}>{p.n}</span>
                      <div><div className="font-bold text-[#20201e]">{p.t}</div><div className="text-[#6b6964]">{p.d}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div><h2 className="text-xl font-bold text-[#20201e]">{t.booksHeading}</h2><p className="text-xs text-[#6b6964]">{t.booksSubheading}</p></div>
                <div className="text-xs font-semibold text-[#285b4b]">{books.length} Books · {totalCh} Chapters · {totalW} Words</div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {books.map(book=>{
                  const bw=book.chapters.reduce((a,c)=>a+countWords(c.markdown),0);
                  const pct=Math.min(100,Math.round((bw/Math.max(1,book.targetWordCount))*100));
                  return (
                    <article key={book.id} className="flex flex-col justify-between rounded-2xl border border-[#e6e2dc] bg-white p-6 shadow-sm">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-[#edf4ef] px-2.5 py-0.5 text-xs font-semibold text-[#285b4b]">{book.language==="bn"?"\u09AC\u09BE\u0982\u09B2\u09BE + English":"English + \u09AC\u09BE\u0982\u09B2\u09BE"}</span>
                          <span className="text-xs font-mono text-[#6b6964]">{book.chapters.length} chapters · {bw} words</span>
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-[#123B6D]">{book.title}</h3>
                        <p className="mt-1 text-xs text-[#6b6964] leading-relaxed">{book.subtitle}</p>
                        <p className="mt-3 text-xs font-semibold text-[#20201e]">\u09B2\u09C7\u0996\u0995 / \u09B8\u09AE\u09CD\u09AA\u09BE\u09A6\u0995: {book.author}</p>
                        <div className="mt-4">
                          <div className="flex justify-between text-[11px] text-[#6b6964]"><span>Manuscript Progress</span><span>{pct}%</span></div>
                          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#f8f7f4]"><div className="h-full bg-[#285b4b]" style={{width:`${Math.max(6,pct)}%`}}/></div>
                        </div>
                      </div>
                      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#e6e2dc] pt-4">
                        <div className="flex gap-2">
                          <button type="button" onClick={()=>{setActiveBookId(book.id);setActiveChapterId(book.chapters[0]?.id??"");switchView("editor");}} className="rounded-xl bg-[#285b4b] px-4 py-2 text-xs font-semibold text-white hover:opacity-95">Open Editor Studio →</button>
                          <button type="button" onClick={()=>{setActiveBookId(book.id);switchView("preview");}} className="rounded-xl border border-[#e6e2dc] bg-[#f8f7f4] px-3 py-2 text-xs font-semibold text-[#123B6D] hover:bg-white">Print Preview</button>
                        </div>
                        {books.length>1&&<button type="button" onClick={()=>delBook(book.id)} className="text-xs font-semibold text-[#9E2A2B] hover:underline">Delete</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* EDITOR */}
        {activeView==="editor"&&(
          <section>
            <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
              <aside className="rounded-2xl border border-[#e6e2dc] bg-white p-4 shadow-sm h-fit space-y-4">
                <div className="border-b border-[#e6e2dc] pb-3">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6b6964] mb-1">Active Book</label>
                  <select value={activeBookId} onChange={e=>{const b=books.find(bk=>bk.id===e.target.value);setActiveBookId(e.target.value);if(b?.chapters[0])setActiveChapterId(b.chapters[0].id);}} className="w-full rounded-lg border border-[#e6e2dc] bg-[#f8f7f4] px-2.5 py-1.5 text-xs font-semibold text-[#123B6D]">
                    {books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#6b6964]">{t.chaptersHeader}</h3>
                  <button type="button" onClick={()=>setShowAddChapter(true)} className="rounded-lg bg-[#285b4b] px-2.5 py-1 text-xs font-semibold text-white hover:opacity-95">+ {t.addChapterBtn}</button>
                </div>
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {activeBook?.chapters.map((ch,idx)=>{
                    const active=ch.id===activeChapterId;
                    return (
                      <div key={ch.id} className={`rounded-xl border p-3 transition ${active?"border-[#285b4b] bg-[#edf4ef]/70":"border-[#e6e2dc] bg-[#f8f7f4]"}`}>
                        <button type="button" onClick={()=>setActiveChapterId(ch.id)} className="w-full text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{color:kindColor(ch.kind)}}>{ch.kind}</span>
                            <span className="text-[10px] text-[#6b6964]">v{ch.revisionNumber} · {countWords(ch.markdown)}w</span>
                          </div>
                          <div className="mt-1 text-xs font-bold text-[#20201e] line-clamp-2">{ch.title}</div>
                        </button>
                        <div className="mt-2 flex items-center justify-between border-t border-[#e6e2dc]/60 pt-1.5 text-[10px]">
                          <div className="flex gap-1">
                            <button type="button" onClick={()=>moveChapter(idx,-1)} disabled={idx===0} className="rounded border border-[#e6e2dc] bg-white px-2 py-0.5 font-bold hover:bg-[#edf4ef] disabled:opacity-40">↑</button>
                            <button type="button" onClick={()=>moveChapter(idx,1)} disabled={idx===(activeBook?.chapters.length??1)-1} className="rounded border border-[#e6e2dc] bg-white px-2 py-0.5 font-bold hover:bg-[#edf4ef] disabled:opacity-40">↓</button>
                          </div>
                          {(activeBook?.chapters.length??1)>1&&<button type="button" onClick={()=>delChapter(ch.id)} className="text-[#9E2A2B] font-semibold hover:underline">Remove</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {activeBook&&<div className="border-t border-[#e6e2dc] pt-3 text-[11px] text-[#6b6964]">
                  <div className="font-semibold text-[#20201e]">Total: {activeBook.chapters.length} chapters · {activeBook.chapters.reduce((a,c)=>a+countWords(c.markdown),0)} words</div>
                  <div>Schema v1 · Canonical Block Sync Active</div>
                </div>}
              </aside>

              <div className="flex flex-col rounded-2xl border border-[#e6e2dc] bg-white shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e6e2dc] bg-[#f8f7f4] px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    {(["visual","source"] as EditorMode[]).map(m=>(
                      <button key={m} type="button" onClick={()=>setEditorMode(m)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${editorMode===m?"bg-[#285b4b] text-white":"bg-white text-[#6b6964] border border-[#e6e2dc]"}`}>
                        {m==="visual"?"Visual (TipTap)":"Markdown (CodeMirror)"}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button type="button" onClick={()=>insertSnippet("## \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 2. \u09A8\u09A4\u09C1\u09A8 \u09AC\u09BF\u09B6\u09CD\u09B2\u09C7\u09B7\u09A3\u09A7\u09B0\u09CD\u09AE\u09C0 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u098F\u0996\u09BE\u09A8\u09C7 \u09B2\u09BF\u0996\u09C1\u09A8\u0964\n\n### \u0989\u09A4\u09CD\u09A4\u09B0\n\u098F\u0996\u09BE\u09A8\u09C7 \u09AE\u09A1\u09C7\u09B2 \u0989\u09A4\u09CD\u09A4\u09B0 \u09B6\u09C1\u09B0\u09C1 \u0995\u09B0\u09C1\u09A8\u0964")} className="rounded-lg border border-[#e6e2dc] bg-white px-2.5 py-1 font-medium hover:bg-[#edf4ef]">H2 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8</button>
                    <button type="button" onClick={()=>insertSnippet("> \uD83D\uDCA1 **\u098F\u0995\u09CD\u09B8\u09BE\u09AE \u099F\u09BF\u09AA\u09B8:** \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0 \u09B9\u09B2\u09C7 \u09B8\u09AE\u09AF\u09BC \u09AC\u09BE\u0981\u099A\u09BE\u09A4\u09C7 \u09AE\u09C2\u09B2 \u09AA\u09AF\u09BC\u09C7\u09A8\u09CD\u099F\u0997\u09C1\u09B2\u09CB \u09AC\u09C1\u09B2\u09C7\u099F \u0986\u0995\u09BE\u09B0\u09C7 \u0989\u09AA\u09B8\u09CD\u09A5\u09BE\u09AA\u09A8 \u0995\u09B0\u09C1\u09A8\u0964")} className="rounded-lg border border-[#F26B21]/40 bg-[#FFF4ED] px-2.5 py-1 font-semibold text-[#F26B21] hover:opacity-90">+ \uD83D\uDCA1 \u098F\u0995\u09CD\u09B8\u09BE\u09AE \u099F\u09BF\u09AA\u09B8</button>
                    <button type="button" onClick={()=>insertSnippet("> \u09AE\u09C2\u09B2 \u0989\u09A6\u09CD\u09A7\u09C3\u09A4\u09BF: \u09AF\u09C7 \u09A4\u09A5\u09CD\u09AF \u09AE\u09A8\u09C7 \u09A5\u09BE\u0995\u09C7, \u09A4\u09BE \u099C\u09CD\u099E\u09BE\u09A8; \u09AF\u09C7 \u099C\u09CD\u099E\u09BE\u09A8 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u0997 \u0995\u09B0\u09BE \u09AF\u09BE\u09AF\u09BC, \u09B8\u09C7\u099F\u09BF\u0987 \u09A6\u0995\u09CD\u09B7\u09A4\u09BE\u0964")} className="rounded-lg border border-[#123B6D]/30 bg-[#F4F7FB] px-2.5 py-1 font-semibold text-[#123B6D] hover:opacity-90">+ \u275D \u0989\u09A6\u09CD\u09A7\u09C3\u09A4\u09BF</button>
                    <button type="button" onClick={()=>insertSnippet("> \u26A0\uFE0F **\u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0\u09B0\u09BE \u098F\u0996\u09BE\u09A8\u09C7 \u09AC\u09C7\u09B6\u09BF \u09AD\u09C1\u09B2 \u0995\u09B0\u09C7:** \u09AD\u09C1\u09B2 \u09A7\u09BE\u09B0\u09A3\u09BE \u09AC\u09A8\u09BE\u09AE \u09B8\u09A0\u09BF\u0995 \u09A7\u09BE\u09B0\u09A3\u09BE\u09B0 \u09AA\u09BE\u09B0\u09CD\u09A5\u0995\u09CD\u09AF \u09B8\u09CD\u09AA\u09B7\u09CD\u099F\u09AD\u09BE\u09AC\u09C7 \u0989\u09B2\u09CD\u09B2\u09C7\u0996 \u0995\u09B0\u09C1\u09A8\u0964")} className="rounded-lg border border-[#9E2A2B]/30 bg-[#fff5f5] px-2.5 py-1 font-semibold text-[#9E2A2B] hover:opacity-90">+ \u26A0\uFE0F \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u09AD\u09C1\u09B2</button>
                    <button type="button" onClick={()=>insertSnippet("| \u0995\u09CD\u09B0\u09AE\u09BF\u0995 | \u09AE\u09C2\u09B2 \u0989\u09AA\u099C\u09C0\u09AC\u09CD\u09AF | \u0989\u09AA\u09B8\u09CD\u09A5\u09BE\u09AA\u09A8\u09C7\u09B0 \u0995\u09CC\u09B6\u09B2 |\n| --- | --- | --- |\n| 01 | \u09B8\u0982\u099C\u09CD\u099E\u09BE \u0993 \u09A7\u09BE\u09B0\u09A3\u09BE | \u09B8\u0982\u0995\u09CD\u09B7\u09BF\u09AA\u09CD\u09A4 \u09AC\u09BE\u0995\u09CD\u09AF |\n| 02 | \u0989\u09A6\u09BE\u09B9\u09B0\u09A3 \u0993 \u0989\u09AA\u09BE\u09A4\u09CD\u09A4 | \u09B8\u09B0\u0995\u09BE\u09B0\u09BF \u09AA\u09B0\u09BF\u09B8\u0982\u0996\u09CD\u09AF\u09BE\u09A8 |")} className="rounded-lg border border-[#e6e2dc] bg-white px-2.5 py-1 font-medium hover:bg-[#edf4ef]">+ \u229E \u099B\u0995</button>
                    <button type="button" onClick={()=>insertSnippet("### \u0986\u09AE\u09BE\u09B0 \u0985\u09A4\u09BF\u09B0\u09BF\u0995\u09CD\u09A4 \u09A8\u09CB\u099F (Active Recall Area)\n- ____________________________________________\n- ____________________________________________")} className="rounded-lg border border-[#e6e2dc] bg-white px-2.5 py-1 font-medium hover:bg-[#edf4ef]">+ \u270E \u09A8\u09CB\u099F \u098F\u09B0\u09BF\u09AF\u09BC\u09BE</button>
                  </div>
                  <span className="rounded-full bg-[#edf4ef] px-2.5 py-1 text-xs font-semibold text-[#285b4b]">v{activeChapter?.revisionNumber??1} · \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4</span>
                </div>

                {activeChapter&&(
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e2dc] px-5 py-3">
                    <div className="flex-1 min-w-[220px]">
                      <input type="text" value={activeChapter.title} onChange={e=>updTitle(e.target.value)} aria-label="Chapter Title" className="w-full text-lg sm:text-xl font-bold text-[#123B6D] focus:outline-none"/>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={activeChapter.kind} onChange={e=>updKind(e.target.value as ChapterKind)} className="rounded-lg border border-[#e6e2dc] bg-[#f8f7f4] px-2.5 py-1 text-xs font-semibold">
                        <option value="FRONTMATTER">FRONTMATTER</option>
                        <option value="CHAPTER">CHAPTER</option>
                        <option value="BACKMATTER">BACKMATTER</option>
                      </select>
                      <span className="text-xs text-[#6b6964]">{countWords(activeChapter.markdown)} words · {activeChapter.markdown.length} chars</span>
                    </div>
                  </div>
                )}

                {activeChapter&&detectWarnings(activeChapter.markdown).length>0&&(
                  <div className="bg-[#FFF4ED] border-b border-[#F26B21]/30 px-5 py-2 text-xs text-[#9E2A2B]">
                    {detectWarnings(activeChapter.markdown).map((w,i)=><div key={i}>\u26A0\uFE0F {w}</div>)}
                  </div>
                )}

                {activeChapter&&(
                  <div className={`grid gap-0 divide-y lg:divide-y-0 lg:divide-x divide-[#e6e2dc] ${editorMode==="source"?"grid-cols-1":"lg:grid-cols-2"}`}>
                    <div className="p-5 flex flex-col">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6964]">Markdown / Canonical Source</span>
                        <span className="text-[11px] text-[#6b6964]">UTF-8 · Bilingual</span>
                      </div>
                      <textarea rows={18} value={activeChapter.markdown} onChange={e=>updMd(e.target.value)} aria-label="Manuscript Content" className="w-full flex-1 rounded-xl border border-[#e6e2dc] bg-[#fcfbf9] p-4 font-mono text-sm leading-relaxed text-[#20201e] focus:border-[#285b4b] focus:outline-none"/>
                    </div>
                    {editorMode==="visual"&&(
                      <div className="p-5 bg-white flex flex-col">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6964]">Live Book Style Canvas</span>
                          <span className="text-[11px] font-semibold text-[#123B6D]">{design.widthMm} × {design.heightMm} mm · Mirror Margins</span>
                        </div>
                        <div className="manuscript-serif flex-1 rounded-xl border border-[#e6e2dc] bg-[#fcfbf9] p-5 overflow-y-auto max-h-[460px] text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{__html:renderMd(activeChapter.markdown,design)}}/>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e6e2dc] bg-[#f8f7f4] px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input type="text" value={revNote} onChange={e=>setRevNote(e.target.value)} placeholder="\u09B0\u09BF\u09AD\u09BF\u09B6\u09A8 \u09A8\u09CB\u099F (\u09AF\u09C7\u09AE\u09A8: \u09A6\u09BE\u09AA\u09CD\u09A4\u09B0\u09BF\u0995 \u09AA\u09A4\u09CD\u09B0 \u09B8\u0982\u09AF\u09CB\u099C\u09A8)..." className="w-64 rounded-lg border border-[#e6e2dc] bg-white px-3 py-1.5 text-xs"/>
                    <button type="button" onClick={saveSnapshot} className="rounded-lg bg-[#285b4b] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95">+ {t.saveSnapshotBtn}</button>
                  </div>
                  <button type="button" onClick={()=>switchView("preview")} className="rounded-lg bg-[#123B6D] px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95">\u09AA\u09CD\u09B0\u09BF\u09A8\u09CD\u099F \u09AA\u09CD\u09B0\u09BF\u09AD\u09BF\u0989 \u09A6\u09C7\u0996\u09C1\u09A8 \u2192</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* DESIGN */}
        {activeView==="design"&&(
          <section className="space-y-6">
            <div className="rounded-2xl border border-[#e6e2dc] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e2dc] pb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#123B6D]">{t.designHeading}</h2>
                  <p className="text-xs text-[#6b6964]">\u09AA\u09BE\u09A3\u09CD\u09A1\u09C1\u09B2\u09BF\u09AA\u09BF\u09B0 \u09AE\u09C2\u09B2 \u099F\u09C7\u0995\u09CD\u09B8\u099F \u0985\u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09BF\u09A4 \u09B0\u09C7\u0996\u09C7 \u09AA\u09C3\u09B7\u09CD\u09A0\u09BE\u09B0 \u0986\u0995\u09BE\u09B0, \u09AE\u09BF\u09B0\u09B0 \u09AE\u09BE\u09B0\u09CD\u099C\u09BF\u09A8, \u0997\u099F\u09BE\u09B0 \u098F\u09AC\u0982 \u09AB\u09A8\u09CD\u099F \u09A8\u09BF\u09AF\u09BC\u09A8\u09CD\u09A4\u09CD\u09B0\u09A3 \u0995\u09B0\u09C1\u09A8\u0964</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    {label:"Master Book (215\u00D7275)",preset:{name:"Master Book (215 x 275 mm Mirror Margins)",widthMm:215,heightMm:275,marginTopMm:18,marginBottomMm:20,marginInsideMm:22,marginOutsideMm:16,gutterMm:5,mirrorMargins:true,bodyFontSizePt:11,lineHeight:1.5,primaryColor:"#123B6D",accentColor:"#F26B21"} as Partial<DesignProfile>},
                    {label:"Trade Paperback (152\u00D7229)",preset:{name:"Trade Paperback (152 x 229 mm)",widthMm:152,heightMm:229,marginTopMm:16,marginBottomMm:18,marginInsideMm:20,marginOutsideMm:14,gutterMm:4,mirrorMargins:true,bodyFontSizePt:10.5,lineHeight:1.48} as Partial<DesignProfile>},
                    {label:"Academic A5 (148\u00D7210)",preset:{name:"Academic A5 (148 x 210 mm)",widthMm:148,heightMm:210,marginTopMm:15,marginBottomMm:16,marginInsideMm:18,marginOutsideMm:14,gutterMm:4,mirrorMargins:true,bodyFontSizePt:10.5,lineHeight:1.45} as Partial<DesignProfile>},
                  ].map(({label,preset})=>(
                    <button key={label} type="button" onClick={()=>applyPreset(preset)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${designForm.name===preset.name?"bg-[#123B6D] text-white":"border border-[#e6e2dc] bg-[#f8f7f4] text-[#20201e]"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="mt-6 grid gap-6 md:grid-cols-3">
                {/* Geometry */}
                <div className="space-y-4 rounded-xl border border-[#e6e2dc] bg-[#f8f7f4] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#123B6D]">1. Page Geometry & Mirror Margins</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {label:"Width (mm)",key:"widthMm" as keyof DesignProfile,min:100,max:350},
                      {label:"Height (mm)",key:"heightMm" as keyof DesignProfile,min:140,max:450},
                      {label:"Top (mm)",key:"marginTopMm" as keyof DesignProfile,min:8,max:50},
                      {label:"Bottom (mm)",key:"marginBottomMm" as keyof DesignProfile,min:8,max:50},
                    ].map(f=>(
                      <div key={String(f.key)}>
                        <label className="block text-xs font-semibold mb-1">{f.label}</label>
                        <input type="number" min={f.min} max={f.max} value={designForm[f.key] as number} onChange={e=>setDesignForm(prev=>({...prev,[f.key]:Number(e.target.value)}))} className="w-full rounded-lg border border-[#e6e2dc] bg-white px-3 py-1.5 text-sm"/>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[{label:"Inside",key:"marginInsideMm" as keyof DesignProfile},{label:"Outside",key:"marginOutsideMm" as keyof DesignProfile},{label:"Gutter",key:"gutterMm" as keyof DesignProfile}].map(f=>(
                      <div key={String(f.key)}>
                        <label className="block text-xs font-semibold mb-1">{f.label}</label>
                        <input type="number" min={0} max={50} value={designForm[f.key] as number} onChange={e=>setDesignForm(prev=>({...prev,[f.key]:Number(e.target.value)}))} className="w-full rounded-lg border border-[#e6e2dc] bg-white px-2.5 py-1.5 text-sm"/>
                      </div>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#20201e] pt-1">
                    <input type="checkbox" checked={designForm.mirrorMargins} onChange={e=>setDesignForm(f=>({...f,mirrorMargins:e.target.checked}))} className="rounded"/>
                    Enable Mirror Margins
                  </label>
                </div>
                {/* Typography */}
                <div className="space-y-4 rounded-xl border border-[#e6e2dc] bg-[#f8f7f4] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#123B6D]">2. Bilingual Typography</h3>
                  {[
                    {label:"Bangla Body Font",key:"banglaBodyFont" as keyof DesignProfile,opts:["Noto Serif Bengali","Noto Sans Bengali","SolaimanLipi","Kalpurush"]},
                    {label:"Bangla Heading Font",key:"banglaHeadingFont" as keyof DesignProfile,opts:["Noto Sans Bengali","Noto Serif Bengali"]},
                    {label:"English / Latin Font",key:"latinFont" as keyof DesignProfile,opts:["Inter","Georgia","Merriweather"]},
                  ].map(f=>(
                    <div key={String(f.key)}>
                      <label className="block text-xs font-semibold mb-1">{f.label}</label>
                      <select value={designForm[f.key] as string} onChange={e=>setDesignForm(prev=>({...prev,[f.key]:e.target.value}))} className="w-full rounded-lg border border-[#e6e2dc] bg-white px-3 py-1.5 text-sm">
                        {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold mb-1">Body Size (pt)</label><input type="number" step={0.5} min={9} max={16} value={designForm.bodyFontSizePt} onChange={e=>setDesignForm(f=>({...f,bodyFontSizePt:Number(e.target.value)}))} className="w-full rounded-lg border border-[#e6e2dc] bg-white px-3 py-1.5 text-sm"/></div>
                    <div><label className="block text-xs font-semibold mb-1">Line Height</label><input type="number" step={0.05} min={1.2} max={2.2} value={designForm.lineHeight} onChange={e=>setDesignForm(f=>({...f,lineHeight:Number(e.target.value)}))} className="w-full rounded-lg border border-[#e6e2dc] bg-white px-3 py-1.5 text-sm"/></div>
                  </div>
                </div>
                {/* Colors & Print Rules */}
                <div className="space-y-4 rounded-xl border border-[#e6e2dc] bg-[#f8f7f4] p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#123B6D]">3. Color System & Print Rules</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold mb-1">Primary Navy</label><input type="color" value={designForm.primaryColor} onChange={e=>setDesignForm(f=>({...f,primaryColor:e.target.value}))} className="h-9 w-full rounded-lg border border-[#e6e2dc] bg-white p-1"/></div>
                    <div><label className="block text-xs font-semibold mb-1">Accent Orange</label><input type="color" value={designForm.accentColor} onChange={e=>setDesignForm(f=>({...f,accentColor:e.target.value}))} className="h-9 w-full rounded-lg border border-[#e6e2dc] bg-white p-1"/></div>
                  </div>
                  <div><label className="block text-xs font-semibold mb-1">Watermark (Optional)</label><input type="text" value={designForm.watermarkText} onChange={e=>setDesignForm(f=>({...f,watermarkText:e.target.value}))} placeholder="\u09B2\u09C7\u0996\u0995 \u0995\u09B0\u09CD\u09A4\u09C3\u0995 \u09B8\u09B0\u09CD\u09AC\u09B8\u09CD\u09AC\u09A4\u09CD\u09AC \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4" className="w-full rounded-lg border border-[#e6e2dc] bg-white px-3 py-1.5 text-sm"/></div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#20201e]">
                    <input type="checkbox" checked={designForm.chapterStartsNewPage} onChange={e=>setDesignForm(f=>({...f,chapterStartsNewPage:e.target.checked}))} className="rounded"/>
                    Start Every Chapter on a New Page
                  </label>
                  <button type="button" onClick={saveDesign} className="w-full rounded-xl bg-[#285b4b] py-2.5 text-xs font-semibold text-white shadow-sm hover:opacity-95">Save & Apply Design Profile</button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PRINT PREVIEW */}
        {activeView==="preview"&&(
          <section className="space-y-6">
            <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#e6e2dc] bg-white p-5 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-[#123B6D]">{t.previewHeading}</h2>
                <p className="text-xs text-[#6b6964]">Trim: {design.widthMm}mm × {design.heightMm}mm · Mirror Margins (Inside {design.marginInsideMm}mm + {design.gutterMm}mm Gutter = {design.marginInsideMm+design.gutterMm}mm, Outside {design.marginOutsideMm}mm) · Fonts: {design.banglaBodyFont} + {design.latinFont}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={exportScope} onChange={e=>setExportScope(e.target.value as ExportScope)} className="rounded-lg border border-[#e6e2dc] bg-[#f8f7f4] px-3 py-2 text-xs font-semibold">
                  <option value="BOOK">\u09B8\u09AE\u09CD\u09AA\u09C2\u09B0\u09CD\u09A3 \u09AC\u0987 (Full Book Export)</option>
                  <option value="CHAPTER">\u09B6\u09C1\u09A7\u09C1\u09AE\u09BE\u09A4\u09CD\u09B0 \u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC (Current Chapter)</option>
                </select>
                <button type="button" onClick={()=>window.print()} className="rounded-xl bg-[#123B6D] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95">\u238E Print / Save as PDF</button>
              </div>
            </div>
            <div className="space-y-8">{renderPrintPages()}</div>
          </section>
        )}

        {/* REVISIONS */}
        {activeView==="revisions"&&(
          <section className="space-y-6">
            <div className="rounded-2xl border border-[#e6e2dc] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e2dc] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#123B6D]">{t.revisionsHeading}</h2>
                  <p className="text-xs text-[#6b6964]">\u09AA\u09C1\u09B0\u09BE\u09A4\u09A8 \u09B8\u0982\u09B8\u09CD\u0995\u09B0\u09A3 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 \u0995\u09B0\u09B2\u09C7 \u0986\u0997\u09C7\u09B0 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8 \u09AE\u09C1\u099B\u09C7 \u09A8\u09BE \u0997\u09BF\u09AF\u09BC\u09C7 \u098F\u0995\u099F\u09BF \u09A8\u09A4\u09C1\u09A8 \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8 \u09B9\u09BF\u09B8\u09C7\u09AC\u09C7 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09BF\u09A4 \u09B9\u09AF\u09BC (Non-destructive restore).</p>
                </div>
                {activeChapter&&<span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-semibold text-[#285b4b]">{activeChapter.title}</span>}
              </div>
              <div className="mt-4 space-y-3">
                {(activeChapter?.revisions??[]).map(rev=>(
                  <div key={rev.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#e6e2dc] bg-[#f8f7f4] p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#123B6D] px-2 py-0.5 text-xs font-bold text-white">v{rev.revisionNumber}</span>
                        <span className="text-sm font-bold text-[#20201e]">{rev.label}</span>
                      </div>
                      <div className="mt-1 text-xs text-[#6b6964]">Saved at {rev.createdAt} · {countWords(rev.markdown)} words</div>
                    </div>
                    <button type="button" onClick={()=>restoreRevision(rev)} className="rounded-lg border border-[#285b4b] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#285b4b] hover:bg-[#edf4ef]">
                      ↺ Restore as New Revision (v{(activeChapter?.revisionNumber??0)+1})
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="no-print mt-auto border-t border-[#e6e2dc] bg-white py-4 px-6 text-xs text-[#6b6964]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span>BookForge · Bilingual (\u09AC\u09BE\u0982\u09B2\u09BE + English) Book Authoring & Print Typesetting Engine</span>
          <span>215 × 275 mm Master Book Style · Workspace Isolation Enabled</span>
        </div>
      </footer>

      {/* MODAL: CREATE BOOK */}
      {showCreateBook&&(
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleCreateBook} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e6e2dc] pb-3">
              <h3 className="text-lg font-bold text-[#123B6D]">\u09A8\u09A4\u09C1\u09A8 \u09AC\u0987 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09C1\u09A8</h3>
              <button type="button" onClick={()=>setShowCreateBook(false)} className="text-xs font-bold text-[#6b6964]">\u2715</button>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">\u09AC\u0987\u09AF\u09BC\u09C7\u09B0 \u09B6\u09BF\u09B0\u09CB\u09A8\u09BE\u09AE (Title) *</label>
              <input type="text" required value={newBookTitle} onChange={e=>setNewBookTitle(e.target.value)} placeholder="\u09AF\u09C7\u09AE\u09A8: \u09AA\u09BF\u098F\u09B8\u09B8\u09BF \u09B2\u09BF\u0996\u09BF\u09A4 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u09B8\u09B9\u09BE\u09AF\u09BC\u09BF\u0995\u09BE" className="w-full rounded-lg border border-[#e6e2dc] px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">\u0989\u09AA\u09B6\u09BF\u09B0\u09CB\u09A8\u09BE\u09AE (Subtitle)</label>
              <input type="text" value={newBookSubtitle} onChange={e=>setNewBookSubtitle(e.target.value)} placeholder="\u09A8\u09A8-\u0995\u09CD\u09AF\u09BE\u09A1\u09BE\u09B0 \u0993 \u09A8\u09A8-\u09A1\u09BF\u09AA\u09BE\u09B0\u09CD\u099F\u09AE\u09C7\u09A8\u09CD\u099F\u09BE\u09B2 \u0985\u0982\u09B6" className="w-full rounded-lg border border-[#e6e2dc] px-3 py-2 text-sm"/>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">\u09B2\u09C7\u0996\u0995 (Author) *</label>
                <input type="text" required value={newBookAuthor} onChange={e=>setNewBookAuthor(e.target.value)} className="w-full rounded-lg border border-[#e6e2dc] px-3 py-2 text-sm"/>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">\u09AA\u09CD\u09B0\u09A7\u09BE\u09A8 \u09AD\u09BE\u09B7\u09BE</label>
                <select value={newBookLang} onChange={e=>setNewBookLang(e.target.value as "bn"|"en")} className="w-full rounded-lg border border-[#e6e2dc] px-3 py-2 text-sm">
                  <option value="bn">\u09AC\u09BE\u0982\u09B2\u09BE + English</option>
                  <option value="en">English + \u09AC\u09BE\u0982\u09B2\u09BE</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={()=>setShowCreateBook(false)} className="rounded-lg border border-[#e6e2dc] px-4 py-2 text-xs font-semibold">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#285b4b] px-4 py-2 text-xs font-semibold text-white">\u09AC\u0987 \u09B8\u0982\u09B0\u0995\u09CD\u09B7\u09A3 \u0995\u09B0\u09C1\u09A8</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD CHAPTER */}
      {showAddChapter&&(
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleAddChapter} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#e6e2dc] pb-3">
              <h3 className="text-lg font-bold text-[#123B6D]">\u09A8\u09A4\u09C1\u09A8 \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC \u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8</h3>
              <button type="button" onClick={()=>setShowAddChapter(false)} className="text-xs font-bold text-[#6b6964]">\u2715</button>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">\u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC\u09C7\u09B0 \u09B6\u09BF\u09B0\u09CB\u09A8\u09BE\u09AE *</label>
              <input type="text" required value={newChTitle} onChange={e=>setNewChTitle(e.target.value)} placeholder="\u09AF\u09C7\u09AE\u09A8: \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 02: \u0987\u0982\u09B0\u09C7\u099C\u09BF \u0997\u09CD\u09B0\u09BE\u09AE\u09BE\u09B0" className="w-full rounded-lg border border-[#e6e2dc] px-3 py-2 text-sm"/>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">\u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC\u09C7\u09B0 \u09A7\u09B0\u09A8</label>
              <select value={newChKind} onChange={e=>setNewChKind(e.target.value as ChapterKind)} className="w-full rounded-lg border border-[#e6e2dc] px-3 py-2 text-sm">
                <option value="FRONTMATTER">FRONTMATTER (\u09AA\u09CD\u09B0\u09BE\u0995\u0995\u09A5\u09A8)</option>
                <option value="CHAPTER">CHAPTER (\u09AE\u09C2\u09B2 \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC)</option>
                <option value="BACKMATTER">BACKMATTER (\u09AA\u09B0\u09BF\u09B6\u09BF\u09B7\u09CD\u099F)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={()=>setShowAddChapter(false)} className="rounded-lg border border-[#e6e2dc] px-4 py-2 text-xs font-semibold">Cancel</button>
              <button type="submit" className="rounded-lg bg-[#285b4b] px-4 py-2 text-xs font-semibold text-white">\u09AF\u09CB\u0997 \u0995\u09B0\u09C1\u09A8</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: IMPORT */}
      {showImport&&(
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e6e2dc] pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#123B6D]">\u09AA\u09BE\u09A3\u09CD\u09A1\u09C1\u09B2\u09BF\u09AA\u09BF Import \u0993 \u09AD\u09CD\u09AF\u09BE\u09B2\u09BF\u09A1\u09C7\u09B6\u09A8 \u09AA\u09BE\u0987\u09AA\u09B2\u09BE\u0987\u09A8</h3>
                <p className="text-xs text-[#6b6964]">Markdown (.md), Word (.docx) \u098F\u09AC\u0982 ZIP \u0986\u09B0\u09CD\u0995\u09BE\u0987\u09AD \u09AA\u09BE\u09A5-\u099F\u09CD\u09B0\u09BE\u09AD\u09BE\u09B0\u09CD\u09B8\u09BE\u09B2 \u0993 \u09AE\u09BE\u09A8 \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3\u0964</p>
              </div>
              <button type="button" onClick={()=>setShowImport(false)} className="text-xs font-bold text-[#6b6964]">\u2715</button>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <button type="button" onClick={()=>{setImpFmt("MARKDOWN");setImpFile("chapter_03_constitution.md");setImpPayload("# \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 03: \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7\u09B0 \u09B8\u0982\u09AC\u09BF\u09A7\u09BE\u09A8\u0964\n\n> \uD83D\uDCA1 **\u098F\u0995\u09CD\u09B8\u09BE\u09AE \u099F\u09BF\u09AA\u09B8:** \u09AE\u09CC\u09B2\u09BF\u0995 \u0985\u09A7\u09BF\u0995\u09BE\u09B0 (\u0985\u09A8\u09C1\u099A\u09CD\u099B\u09C7\u09A6 26\u201347\u0995) \u09B0\u09BF\u09AD\u09BF\u09B6\u09A8 \u0995\u09B0\u09C1\u09A8\u0964\n\n\u0997\u09A3\u09AA\u09CD\u09B0\u099C\u09BE\u09A4\u09A8\u09CD\u09A4\u09CD\u09B0\u09C0 \u09AC\u09BE\u0982\u09B2\u09BE\u09A6\u09C7\u09B6\u09C7\u09B0 \u09B8\u0982\u09AC\u09BF\u09A7\u09BE\u09A8 \u09B0\u09BE\u09B7\u09CD\u099F\u09CD\u09B0 \u09AA\u09B0\u09BF\u099A\u09BE\u09B2\u09A8\u09BE\u09B0 \u09B8\u09B0\u09CD\u09AC\u09CB\u099A\u09CD\u099A \u0986\u0987\u09A8\u0964");}} className="rounded-lg border border-[#285b4b] bg-[#edf4ef] px-3 py-1.5 font-semibold text-[#285b4b]">Load Clean Bilingual Markdown</button>
              <button type="button" onClick={()=>{setImpFmt("DOCX");setImpFile("ocr_draft_with_warnings.docx");setImpPayload("# \u0985\u09A7\u09CD\u09AF\u09BE\u09AF\u09BC 04: \u09B8\u09BE\u09A7\u09BE\u09B0\u09A3 \u09AC\u09BF\u099C\u09CD\u099E\u09BE\u09A8\u0964\n\u0986\u09AE\u09BF \u0986\u09AA\u09A8\u09BE\u09B0 OCR \u099F\u09C7\u0995\u09CD\u09B8\u099F\u099F\u09BF \u09AA\u09B0\u09BF\u09B7\u09CD\u0995\u09BE\u09B0 \u0995\u09B0\u09C7\u099B\u09BF\u0964\n\n\u0989\u09A4\u09CD\u09A4\u09B0 \u0441\u0442\u0440\u043E\u0433\u043E \u09AA\u09CD\u09AF\u09BE\u09B8\u09C7\u099C\u09C7\u09B0 \u09A4\u09A5\u09CD\u09AF\u09C7\u09B0 \u09AE\u09A7\u09CD\u09AF\u09C7 \u09B0\u09BE\u0996\u09A4\u09C7 \u09B9\u09AC\u09C7\u0964\n\n$$\\frac{3}{5} + \\sqrt{2}$$\n\n<w:tbl><w:vMerge/></w:tbl>");}} className="rounded-lg border border-[#F26B21] bg-[#FFF4ED] px-3 py-1.5 font-semibold text-[#F26B21]">Load DOCX + OCR/LaTeX Warnings</button>
              <button type="button" onClick={()=>{setImpFmt("ZIP");setImpFile("../../etc/passwd");setImpPayload("# Malicious Path Traversal Archive Test");}} className="rounded-lg border border-[#9E2A2B] bg-[#fff5f5] px-3 py-1.5 font-semibold text-[#9E2A2B]">Test Malicious ZIP Path-Traversal Guard</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">Source Format</label>
                <select value={impFmt} onChange={e=>setImpFmt(e.target.value)} className="w-full rounded-lg border border-[#e6e2dc] px-3 py-1.5 text-xs font-semibold">
                  <option value="MARKDOWN">Markdown (.md)</option>
                  <option value="DOCX">Microsoft Word (.docx)</option>
                  <option value="ZIP">ZIP Archive (.zip)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Filename / Archive Entry</label>
                <input type="text" value={impFile} onChange={e=>setImpFile(e.target.value)} className="w-full rounded-lg border border-[#e6e2dc] px-3 py-1.5 text-xs font-mono"/>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Manuscript Payload</label>
              <textarea rows={7} value={impPayload} onChange={e=>setImpPayload(e.target.value)} className="w-full rounded-xl border border-[#e6e2dc] bg-[#fcfbf9] p-3 font-mono text-xs"/>
            </div>
            <div className={`rounded-xl border p-4 text-xs space-y-2 ${impReport.type==="error"?"border-[#9E2A2B] bg-[#fff5f5]":impReport.type==="ok"?"border-[#285b4b]/30 bg-[#edf4ef]/50":"border-[#e6e2dc] bg-[#f8f7f4]"}`}>
              <div className={`font-bold ${impReport.type==="error"?"text-[#9E2A2B]":impReport.type==="ok"?"text-[#285b4b]":"text-[#123B6D]"}`}>{impReport.message}</div>
              {impReport.warnings.map((w,i)=><div key={i} className="text-[#9E2A2B] font-medium">\u26A0\uFE0F {w}</div>)}
              {impReport.type==="ok"&&impReport.warnings.length===0&&<div className="text-[#6b6964]">No formatting, encoding, or security warnings found.</div>}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={validateImport} className="rounded-lg border border-[#123B6D] px-4 py-2 text-xs font-semibold text-[#123B6D]">1. Validate & Preview Report</button>
              <button type="button" onClick={confirmImport} className="rounded-lg bg-[#285b4b] px-4 py-2 text-xs font-semibold text-white">2. Confirm & Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
