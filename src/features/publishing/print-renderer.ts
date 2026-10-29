import type { BookRecord, ChapterRecord } from "../../server/db.ts";
import type { BookDesignSettingsInput } from "../design/schema.ts";
import { markdownToCanonicalDocument } from "../editor/markdown-converter.ts";
import type { CanonicalBlock } from "../editor/schema.ts";

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Protects headless Chromium against arbitrary local file reads (`file://`) and SSRF
 * against loopback, link-local cloud metadata (`169.254.169.254`), and private IPs.
 */
export function sanitizeRenderResourceUrl(rawUrl: string): {
  safeUrl: string;
  blockedReason?: string;
} {
  const trimmed = rawUrl.trim();
  if (/^(file|javascript|vbscript|ftp|ws|wss):/i.test(trimmed)) {
    return {
      safeUrl: "about:blank",
      blockedReason: `Blocked disallowed protocol in resource URL: "${trimmed}"`,
    };
  }
  if (/^data:text\/html/i.test(trimmed)) {
    return {
      safeUrl: "about:blank",
      blockedReason: "Blocked executable data:text/html URI in print renderer.",
    };
  }
  if (
    /^https?:\/\/(localhost|127\.|0\.0\.0\.0|169\.254\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\])/i.test(
      trimmed
    )
  ) {
    return {
      safeUrl: "about:blank",
      blockedReason: `Blocked private/internal network SSRF URL in print renderer: "${trimmed}"`,
    };
  }
  return { safeUrl: trimmed };
}

export function sanitizeExportFilename(title: string, scope: "BOOK" | "CHAPTER"): string {
  const cleaned = title
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  const base = cleaned.length > 0 ? cleaned : "bookforge_manuscript";
  const suffix = scope === "CHAPTER" ? "chapter" : "full_book";
  return `${base}_${suffix}.pdf`;
}

function formatInlineMarkdown(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function renderBlockToHtml(
  block: CanonicalBlock,
  settings: BookDesignSettingsInput,
  warnings: string[]
): string {
  switch (block.type) {
    case "heading": {
      const tag = `h${block.level}`;
      return `<${tag} class="bf-heading bf-h${block.level}">${formatInlineMarkdown(block.text)}</${tag}>`;
    }
    case "paragraph":
      return `<p class="bf-paragraph">${formatInlineMarkdown(block.text)}</p>`;
    case "callout":
      if (block.variant === "EXAM_TIP" || block.variant === "COMMON_MISTAKE") {
        return `<aside class="bf-callout bf-callout-tip" style="background:#FFF4ED;border-left:5px solid ${settings.accentColor};padding:10px 15px;border-radius:4px;margin:12px 0;page-break-inside:avoid;">
          <div style="color:${settings.accentColor};font-weight:700;margin-bottom:4px;">${escapeHtml(block.label)}</div>
          <div>${formatInlineMarkdown(block.text)}</div>
        </aside>`;
      }
      return `<aside class="bf-callout bf-callout-quote" style="background:#F4F7FB;border-left:5px solid ${settings.primaryColor};padding:12px 16px;border-radius:4px;margin:12px 0;page-break-inside:avoid;">
        <div style="color:${settings.primaryColor};font-weight:700;margin-bottom:4px;">${escapeHtml(block.label)}</div>
        <div style="font-style:italic;">${formatInlineMarkdown(block.text)}</div>
      </aside>`;
    case "bullet_list":
      return `<ul class="bf-list-ul">${block.items
        .map((it) => `<li>${formatInlineMarkdown(it)}</li>`)
        .join("")}</ul>`;
    case "ordered_list":
      return `<ol class="bf-list-ol">${block.items
        .map((it) => `<li>${formatInlineMarkdown(it)}</li>`)
        .join("")}</ol>`;
    case "code_block":
      return `<pre class="bf-code"><code data-lang="${escapeHtml(block.language)}">${escapeHtml(block.code)}</code></pre>`;
    case "table": {
      const ths = block.headers
        .map(
          (h) =>
            `<th style="background:${settings.primaryColor};color:#FFFFFF;padding:8px 12px;text-align:left;border:1px solid #D9E2EC;">${formatInlineMarkdown(h)}</th>`
        )
        .join("");
      const trs = block.rows
        .map((row, idx) => {
          const bg = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
          const tds = row
            .map(
              (cell) =>
                `<td style="background:${bg};padding:8px 12px;border:1px solid #D9E2EC;">${formatInlineMarkdown(cell)}</td>`
            )
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      return `<table class="bf-table" style="width:100%;border-collapse:collapse;margin:14px 0;font-size:10.5pt;page-break-inside:avoid;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    }
    case "image": {
      const check = sanitizeRenderResourceUrl(block.src);
      if (check.blockedReason) {
        warnings.push(check.blockedReason);
      }
      return `<figure class="bf-figure"><img src="${escapeHtml(check.safeUrl)}" alt="${escapeHtml(block.alt)}" style="max-width:100%;height:auto;" />${
        block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ""
      }</figure>`;
    }
    case "horizontal_rule":
      return `<hr class="bf-hr" />`;
    case "unsupported_raw":
      return `<div class="bf-raw-preserved" data-warning="${escapeHtml(block.reason)}">${escapeHtml(
        block.rawMarkdown
      )}</div>`;
  }
}

export function generateTableOfContentsHtml(
  book: BookRecord,
  chapters: ChapterRecord[],
  settings: BookDesignSettingsInput
): string {
  if (!settings.includeToc || chapters.length === 0) {
    return "";
  }
  const tocHeading = book.language === "bn" ? "সূচিপত্র (Table of Contents)" : "Table of Contents";
  const rows = chapters
    .map((ch, idx) => {
      const approxPage = settings.startPageNumber + idx;
      return `<li style="display:flex;justify-content:space-between;border-bottom:1px dotted #D9E2EC;padding:6px 0;">
        <span><strong>${String(idx + 1).padStart(2, "0")}.</strong> ${escapeHtml(ch.title)}</span>
        <span style="color:${settings.primaryColor};font-weight:700;">${approxPage}</span>
      </li>`;
    })
    .join("\n");

  return `<section class="bf-toc-section" style="page-break-after:always;margin-bottom:24px;">
    <h1 class="bf-heading" style="color:${settings.primaryColor};font-size:${settings.h1SizePt}pt;border-bottom:2px solid ${settings.accentColor};padding-bottom:8px;">
      ${tocHeading}
    </h1>
    <ol style="list-style:none;padding:0;margin:16px 0;">
      ${rows}
    </ol>
  </section>`;
}

export function buildPrintStylesheet(settings: BookDesignSettingsInput): string {
  const insideTotalMm = settings.marginInsideMm + settings.gutterMm;
  const outsideMm = settings.marginOutsideMm;

  return `
@page {
  size: ${settings.widthMm}mm ${settings.heightMm}mm;
  margin-top: ${settings.marginTopMm}mm;
  margin-bottom: ${settings.marginBottomMm}mm;
}
@page :left {
  margin-left: ${outsideMm}mm;
  margin-right: ${settings.mirrorMargins ? insideTotalMm : outsideMm}mm;
}
@page :right {
  margin-left: ${settings.mirrorMargins ? insideTotalMm : outsideMm}mm;
  margin-right: ${outsideMm}mm;
}
body.bf-print-body {
  font-family: "${settings.latinFont}", "${settings.banglaBodyFont}", serif;
  font-size: ${settings.bodyFontSizePt}pt;
  line-height: ${settings.lineHeight};
  color: #222222;
  margin: 0;
  counter-reset: page ${settings.startPageNumber};
}
.bf-chapter-section {
  ${settings.chapterStartsNewPage ? "page-break-before: always; break-before: page;" : ""}
  position: relative;
}
.bf-heading {
  font-family: "${settings.latinFont}", "${settings.banglaHeadingFont}", sans-serif;
  color: ${settings.primaryColor};
  page-break-after: avoid;
}
.bf-h1 { font-size: ${settings.h1SizePt}pt; }
.bf-h2 { font-size: ${settings.h2SizePt}pt; }
.bf-h3 { font-size: ${settings.h3SizePt}pt; }
.bf-paragraph {
  margin: 0 0 ${settings.paragraphSpacingPt}pt 0;
}
.bf-watermark {
  text-align: center;
  font-size: 9pt;
  color: #6b6964;
  opacity: 0.7;
  margin-top: 18pt;
}
`;
}

export function renderPrintHtmlDocument(
  book: BookRecord,
  chapters: ChapterRecord[],
  settings: BookDesignSettingsInput,
  scope: "BOOK" | "CHAPTER" = "BOOK"
): { html: string; estimatedPages: number; warnings: string[] } {
  const css = buildPrintStylesheet(settings);
  const warnings: string[] = [];
  let totalWords = 0;

  const tocHtml =
    scope === "BOOK" && settings.includeToc
      ? generateTableOfContentsHtml(book, chapters, settings)
      : "";

  const chapterHtmlSections = chapters.map((ch, idx) => {
    const conv = markdownToCanonicalDocument(ch.markdown);
    warnings.push(...conv.warnings.map((w) => `[${ch.title}] ${w}`));
    totalWords += ch.wordCount;

    const blocksHtml = conv.document.blocks
      .map((b) => renderBlockToHtml(b, settings, warnings))
      .join("\n");

    const leftHeaderText =
      settings.headerLeft === "AUTHOR"
        ? book.author
        : settings.headerLeft === "NONE"
        ? ""
        : book.title;
    const rightHeaderText =
      settings.headerRight === "BOOK_TITLE"
        ? book.title
        : settings.headerRight === "NONE"
        ? ""
        : ch.title;

    const pageNum = settings.startPageNumber + idx;

    return `<section class="bf-chapter-section" data-chapter-index="${idx + 1}" data-chapter-kind="${ch.kind}">
      <header class="bf-running-header" style="font-size:8.5pt;color:#6b6964;border-bottom:1px solid #D9E2EC;padding-bottom:4px;margin-bottom:16px;display:flex;justify-content:space-between;">
        <span>${escapeHtml(leftHeaderText)}</span>
        <span>${escapeHtml(rightHeaderText)}</span>
      </header>
      <div class="bf-subject-banner" style="background:${settings.accentColor};color:#FFFFFF;border-radius:6px;padding:12px 18px;margin-bottom:16px;">
        <div style="font-size:13pt;font-weight:700;font-family:'${settings.latinFont}','${settings.banglaHeadingFont}',sans-serif;">${escapeHtml(ch.title)}</div>
        <div style="font-size:9.5pt;opacity:0.92;">${escapeHtml(book.title)} · ${escapeHtml(book.author)}</div>
      </div>
      ${blocksHtml}
      ${
        settings.watermarkText
          ? `<div class="bf-watermark">${escapeHtml(settings.watermarkText)}</div>`
          : ""
      }
      ${
        settings.footerTemplate !== "NONE"
          ? `<footer class="bf-running-footer" style="margin-top:20px;border-top:1px solid #D9E2EC;padding-top:6px;font-size:9pt;color:${settings.primaryColor};display:flex;justify-content:space-between;">
              <span>${settings.footerTemplate === "BOOK_AND_PAGE" ? escapeHtml(book.title) : ""}</span>
              <strong>Page ${pageNum}</strong>
            </footer>`
          : ""
      }
    </section>`;
  });

  const estimatedPages = Math.max(chapters.length, Math.ceil(totalWords / 280));
  const html = `<!DOCTYPE html>
<html lang="${book.language}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(book.title)} — Print Export</title>
  <style>${css}</style>
</head>
<body class="bf-print-body">
  ${tocHtml}
  ${chapterHtmlSections.join("\n")}
</body>
</html>`;

  return { html, estimatedPages, warnings };
}
