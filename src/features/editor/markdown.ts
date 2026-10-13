import { MarkdownParser, MarkdownSerializer, defaultMarkdownParser, defaultMarkdownSerializer } from "prosemirror-markdown";
import { LibraryError } from "../../lib/errors";
import { editorSchema } from "./schema";
import { validateDocument, MAX_TEXT_LENGTH } from "./document";
import type { EditorDocument } from "./types";

// Recognize unsupported tokens so they fail explicitly instead of being flattened.
const tokenizer = defaultMarkdownParser.tokenizer.set({ html: true }).enable(["table", "strikethrough"]);
const parser = new MarkdownParser(editorSchema, tokenizer, {
  blockquote: { block: "blockquote" }, paragraph: { block: "paragraph" },
  list_item: { block: "listItem" }, bullet_list: { block: "bulletList" },
  ordered_list: { block: "orderedList", getAttrs: (token) => ({ start: Number(token.attrGet("start")) || 1 }) },
  heading: { block: "heading", getAttrs: (token) => ({ level: Number(token.tag.slice(1)) }) },
  code_block: { block: "codeBlock", noCloseToken: true },
  fence: { block: "codeBlock", noCloseToken: true, getAttrs: (token) => ({ language: token.info || null }) },
  hr: { node: "horizontalRule" }, hardbreak: { node: "hardBreak" },
  em: { mark: "italic" }, strong: { mark: "bold" },
  link: { mark: "link", getAttrs: (token) => ({ href: token.attrGet("href"), title: token.attrGet("title") || null }) },
  code_inline: { mark: "code", noCloseToken: true },
});
const base = defaultMarkdownSerializer.nodes;
const serializer = new MarkdownSerializer({
  blockquote: base.blockquote, paragraph: base.paragraph, heading: base.heading,
  text: base.text, bulletList: base.bullet_list, listItem: base.list_item,
  hardBreak: base.hard_break, horizontalRule: base.horizontal_rule,
  orderedList(state, node) {
    const start: number = node.attrs.start;
    const width = String(start + node.childCount - 1).length;
    state.renderList(node, " ".repeat(width + 2), (index) => `${String(start + index).padStart(width)}. `);
  },
  codeBlock(state, node) {
    const runs = node.textContent.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
    state.write(`${fence}${node.attrs.language ?? ""}\n`);
    state.text(node.textContent, false);
    state.write(`\n${fence}`);
    state.closeBlock(node);
  },
}, {
  bold: defaultMarkdownSerializer.marks.strong, italic: defaultMarkdownSerializer.marks.em,
  link: defaultMarkdownSerializer.marks.link, code: defaultMarkdownSerializer.marks.code,
}, { hardBreakNodeName: "hardBreak", strict: true });

export function fromMarkdown(markdown: string): EditorDocument {
  if (markdown.length > MAX_TEXT_LENGTH || markdown.includes("\0")) throw new LibraryError("INVALID_INPUT");
  try { return validateDocument(parser.parse(markdown).toJSON()); }
  catch (error) {
    if (error instanceof LibraryError) throw error;
    throw new LibraryError("UNSUPPORTED_CONTENT");
  }
}

export function toMarkdown(document: EditorDocument): string {
  const validated = validateDocument(document);
  const node = editorSchema.nodeFromJSON(validated);
  const markdown = serializer.serialize(node);
  // Markdown cannot express all valid editor documents (e.g. trailing blank
  // paragraphs). Refuse a lossy switch; keep the original visual draft intact.
  if (!node.eq(editorSchema.nodeFromJSON(fromMarkdown(markdown)))) throw new LibraryError("UNSUPPORTED_CONTENT");
  return markdown;
}
