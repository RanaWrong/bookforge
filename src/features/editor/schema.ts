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
