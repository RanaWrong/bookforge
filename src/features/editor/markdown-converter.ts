import {
  CURRENT_CANONICAL_SCHEMA_VERSION,
  type CanonicalBlock,
  type CanonicalDocument,
  type ConversionResult,
} from "./schema.ts";

/**
 * Bidirectional converter between Markdown and CanonicalDocument.
 * Rule from PROJECT.md: "Never silently discard unsupported content during editor conversion or import."
 */
export function markdownToCanonicalDocument(markdown: string): ConversionResult {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const blocks: CanonicalBlock[] = [];
  const warnings: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Blank lines
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^(---|\*\*\*|___)\s*$/.test(line.trim())) {
      blocks.push({ type: "horizontal_rule" });
      i += 1;
      continue;
    }

    // Fenced code block
    const fenceMatch = line.match(/^```([a-zA-Z0-9_-]*)\s*$/);
    if (fenceMatch) {
      const language = fenceMatch[1] || "text";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        i += 1; // skip closing ```
      } else {
        warnings.push("Unclosed code block fence detected; preserved up to end of file.");
      }
      blocks.push({
        type: "code_block",
        language,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // Headings (# to ####)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({
        type: "heading",
        level,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Image block ![alt](src "caption")
    const imageMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (imageMatch) {
      blocks.push({
        type: "image",
        alt: imageMatch[1],
        src: imageMatch[2],
        ...(imageMatch[3] ? { caption: imageMatch[3] } : {}),
      });
      i += 1;
      continue;
    }

    // Blockquotes / Callout boxes (> 💡 **এক্সাম টিপস:** ... or > **মূল কবিতাংশ:** ...)
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      const joined = quoteLines.join("\n").trim();
      if (joined.includes("💡") || joined.includes("এক্সাম টিপস") || joined.includes("Exam Alert")) {
        blocks.push({
          type: "callout",
          variant: "EXAM_TIP",
          label: "💡 এক্সাম টিপস / পরামর্শ:",
          text: joined.replace(/^💡\s*\*\*[^*]+\*\*:?\s*/, ""),
        });
      } else if (joined.includes("⚠️") || joined.includes("ভুল")) {
        blocks.push({
          type: "callout",
          variant: "COMMON_MISTAKE",
          label: "⚠️ পরীক্ষার্থীরা এখানে বেশি ভুল করে:",
          text: joined,
        });
      } else {
        blocks.push({
          type: "callout",
          variant: "QUOTE",
          label: "উদ্ধৃতি / মূল কবিতাংশ:",
          text: joined,
        });
      }
      continue;
    }

    // Pipe Table
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i += 1;
      }
      if (tableLines.length >= 2) {
        const parseRow = (r: string): string[] =>
          r
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
        const headers = parseRow(tableLines[0]);
        const isSeparator = /^[\s|:-]+$/.test(tableLines[1]);
        const dataLines = isSeparator ? tableLines.slice(2) : tableLines.slice(1);
        const rows = dataLines.map(parseRow);
        blocks.push({ type: "table", headers, rows });
        continue;
      }
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "bullet_list", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "ordered_list", items });
      continue;
    }

    // Raw HTML or LaTeX block -> preserve as unsupported_raw with warning (never silently drop!)
    if (/^\s*<[a-zA-Z]/.test(line) || /^\s*\$\$/.test(line)) {
      const reason = line.trim().startsWith("$$")
        ? "Raw LaTeX display math block preserved for review."
        : "Raw inline HTML block preserved without execution.";
      warnings.push(reason);
      blocks.push({
        type: "unsupported_raw",
        rawMarkdown: line,
        reason,
      });
      i += 1;
      continue;
    }

    // Standard Paragraph (collect consecutive non-blank plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4}\s+|```|---|\*\*\*|___|!\[|>|\||\s*[-*]\s+|\s*\d+\.\s+|\s*<[a-zA-Z]|\s*\$\$)/.test(
        lines[i]
      )
    ) {
      paraLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push({
      type: "paragraph",
      text: paraLines.join(" "),
    });
  }

  const document: CanonicalDocument = {
    schemaVersion: CURRENT_CANONICAL_SCHEMA_VERSION,
    blocks,
  };

  return {
    document,
    markdown: canonicalDocumentToMarkdown(document),
    warnings,
  };
}

export function canonicalDocumentToMarkdown(doc: CanonicalDocument): string {
  const parts: string[] = [];

  for (const block of doc.blocks) {
    switch (block.type) {
      case "heading":
        parts.push(`${"#".repeat(block.level)} ${block.text}`);
        break;
      case "paragraph":
        parts.push(block.text);
        break;
      case "callout":
        if (block.variant === "EXAM_TIP") {
          parts.push(`> 💡 **এক্সাম টিপস:** ${block.text}`);
        } else {
          parts.push(
            block.text
              .split("\n")
              .map((l) => `> ${l}`)
              .join("\n")
          );
        }
        break;
      case "bullet_list":
        parts.push(block.items.map((item) => `- ${item}`).join("\n"));
        break;
      case "ordered_list":
        parts.push(block.items.map((item, idx) => `${idx + 1}. ${item}`).join("\n"));
        break;
      case "code_block":
        parts.push(`\`\`\`${block.language}\n${block.code}\n\`\`\``);
        break;
      case "table": {
        const headerRow = `| ${block.headers.join(" | ")} |`;
        const sepRow = `| ${block.headers.map(() => "---").join(" | ")} |`;
        const bodyRows = block.rows.map((r) => `| ${r.join(" | ")} |`).join("\n");
        parts.push([headerRow, sepRow, bodyRows].filter(Boolean).join("\n"));
        break;
      }
      case "image":
        parts.push(
          block.caption
            ? `![${block.alt}](${block.src} "${block.caption}")`
            : `![${block.alt}](${block.src})`
        );
        break;
      case "horizontal_rule":
        parts.push("---");
        break;
      case "unsupported_raw":
        parts.push(block.rawMarkdown);
        break;
    }
  }

  return parts.join("\n\n");
}
