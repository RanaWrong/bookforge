import { LibraryError } from "../../lib/errors";
import { editorSchema, safeLink } from "./schema";
import type { EditorDocument, EditorNode } from "./types";

export const MAX_TEXT_LENGTH = 200_000;
const allowedNodes = new Set(["doc", "paragraph", "heading", "text", "bulletList", "orderedList", "listItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule"]);
const nodeAttrs: Record<string, string[]> = { heading: ["level"], orderedList: ["start", "type"], codeBlock: ["language"] };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export function validateDocument(value: unknown): EditorDocument {
  let nodes = 0;
  let characters = 0;
  function visit(node: unknown, depth: number) {
    if (!record(node) || typeof node.type !== "string" || !allowedNodes.has(node.type) || depth > 32 || ++nodes > 20_000) throw new LibraryError("INVALID_INPUT");
    if (Object.keys(node).some((key) => !["type", "attrs", "text", "marks", "content"].includes(key))) throw new LibraryError("INVALID_INPUT");
    if (node.attrs !== undefined) {
      if (!record(node.attrs) || Object.keys(node.attrs).some((key) => !(nodeAttrs[node.type as string] ?? []).includes(key))) throw new LibraryError("INVALID_INPUT");
      if (node.type === "heading" && (!Number.isInteger(node.attrs.level) || Number(node.attrs.level) < 1 || Number(node.attrs.level) > 6)) throw new LibraryError("INVALID_INPUT");
      if (node.type === "orderedList" && (node.attrs.start !== undefined && (!Number.isSafeInteger(node.attrs.start) || Number(node.attrs.start) < 1 || Number(node.attrs.start) > 999_999_999) || node.attrs.type != null)) throw new LibraryError("INVALID_INPUT");
      if (node.type === "codeBlock" && node.attrs.language != null && (typeof node.attrs.language !== "string" || !/^[\w+-]{1,40}$/.test(node.attrs.language))) throw new LibraryError("INVALID_INPUT");
    }
    if (node.text !== undefined) {
      if (node.type !== "text" || typeof node.text !== "string" || node.text.includes("\0")) throw new LibraryError("INVALID_INPUT");
      characters += node.text.length;
    }
    if (node.marks !== undefined) {
      if (!Array.isArray(node.marks) || node.marks.length > 4) throw new LibraryError("INVALID_INPUT");
      for (const mark of node.marks) {
        if (!record(mark) || !["bold", "italic", "code", "link"].includes(String(mark.type)) || Object.keys(mark).some((key) => !["type", "attrs"].includes(key))) throw new LibraryError("INVALID_INPUT");
        if (mark.type === "link") {
          const attrs = mark.attrs;
          if (!record(attrs) || typeof attrs.href !== "string" || !safeLink(attrs.href) || Object.keys(attrs).some((key) => !["href", "title", "target", "rel", "class"].includes(key)) || attrs.target != null || attrs.class != null || attrs.rel !== undefined && attrs.rel !== "noopener noreferrer nofollow" || attrs.title != null && (typeof attrs.title !== "string" || attrs.title.length > 500)) throw new LibraryError("INVALID_INPUT");
        } else if (mark.attrs !== undefined && (!record(mark.attrs) || Object.keys(mark.attrs).length)) throw new LibraryError("INVALID_INPUT");
      }
    }
    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) throw new LibraryError("INVALID_INPUT");
      for (const child of node.content) visit(child, depth + 1);
    }
  }
  visit(value, 0);
  if (!record(value) || value.type !== "doc" || characters > MAX_TEXT_LENGTH || new TextEncoder().encode(JSON.stringify(value)).length > 800_000) throw new LibraryError("INVALID_INPUT");
  try {
    const node = editorSchema.nodeFromJSON(value);
    node.check();
    return node.toJSON() as EditorDocument;
  } catch { throw new LibraryError("INVALID_INPUT"); }
}

export function plainTextDocument(text: string): EditorDocument {
  const content: EditorNode[] = [];
  text.split(/\r\n?|\n/).forEach((line, index) => {
    if (index) content.push({ type: "hardBreak" });
    if (line) content.push({ type: "text", text: line });
  });
  return validateDocument({ type: "doc", content: [{ type: "paragraph", ...(content.length ? { content } : {}) }] });
}

export function loadDocument(content: unknown, version: number): EditorDocument {
  if (version === 1 && content === null) return plainTextDocument("");
  if (version === 1 && record(content) && content.type === "plain-text" && typeof content.text === "string") return plainTextDocument(content.text);
  if (version === 2) {
    try { return validateDocument(content); } catch { throw new LibraryError("UNSUPPORTED_CONTENT"); }
  }
  throw new LibraryError("UNSUPPORTED_CONTENT");
}
