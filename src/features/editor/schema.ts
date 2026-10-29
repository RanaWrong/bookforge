export const CURRENT_CANONICAL_SCHEMA_VERSION = 1;

export type CalloutVariant = "EXAM_TIP" | "QUOTE" | "COMMON_MISTAKE" | "NOTE";

export type CanonicalBlock =
  | {
      type: "heading";
      level: 1 | 2 | 3 | 4;
      text: string;
    }
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "callout";
      variant: CalloutVariant;
      label: string;
      text: string;
    }
  | {
      type: "bullet_list";
      items: string[];
    }
  | {
      type: "ordered_list";
      items: string[];
    }
  | {
      type: "code_block";
      language: string;
      code: string;
    }
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
    }
  | {
      type: "horizontal_rule";
    }
  | {
      type: "unsupported_raw";
      rawMarkdown: string;
      reason: string;
    };

export interface CanonicalDocument {
  schemaVersion: number;
  blocks: CanonicalBlock[];
}

export interface ConversionResult {
  document: CanonicalDocument;
  markdown: string;
  warnings: string[];
}

import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

export function safeLink(href: string): boolean {
  if (!href || /[\s\u0000-\u001f\u007f]/u.test(href)) return false;
  if (/^(#|\/(?!\/))/.test(href)) return true;
  try { return ["https:", "http:", "mailto:"].includes(new URL(href).protocol); }
  catch { return false; }
}

const TitledLink = Link.extend({
  addAttributes() { return { ...this.parent?.(), title: { default: null } }; },
});

// Shared by TipTap, the Markdown adapter and server-side validation.
export const editorExtensions = [
  StarterKit.configure({ link: false, strike: false, underline: false, trailingNode: false }),
  TitledLink.configure({
    openOnClick: false, autolink: false, linkOnPaste: false,
    HTMLAttributes: { target: null, rel: "noopener noreferrer nofollow", class: null },
    isAllowedUri: (url) => safeLink(url),
  }),
];
export const editorSchema = getSchema(editorExtensions);
