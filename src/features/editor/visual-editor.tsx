"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "../../lib/i18n/messages";
import { editorExtensions, safeLink } from "./schema";
import type { EditorDocument } from "./types";
import { editorMessages } from "./messages";

export function VisualEditor({ initialDocument, onChange, locale }: { initialDocument: EditorDocument; onChange: (value: unknown) => void; locale: Locale }) {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const t = editorMessages[locale];
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [invalid, setInvalid] = useState(false);
  const editor = useEditor({
    extensions: editorExtensions,
    content: initialDocument,
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: "bf-rich-text", role: "textbox", "aria-multiline": "true", "aria-label": t.visualLabel } },
    onUpdate: ({ editor }) => onChangeRef.current(editor.getJSON()),
  });
  useEffect(() => {
    if (editor) editor.setOptions({ editorProps: { attributes: { class: "bf-rich-text", role: "textbox", "aria-multiline": "true", "aria-label": t.visualLabel } } });
  }, [editor, t.visualLabel]);
  if (!editor) return <p role="status">{t.loading}</p>;
  const tools = [
    { label: t.bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: t.italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: t.bullet, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: t.ordered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: t.quote, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: t.code, active: editor.isActive("codeBlock"), run: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: t.inlineCode, active: editor.isActive("code"), run: () => editor.chain().focus().toggleCode().run() },
  ];
  return <div>
    <div role="group" aria-label={t.toolbar} className="mb-3 flex flex-wrap gap-2">
      <select className="bf-button" aria-label={t.heading} value={editor.isActive("heading") ? Number(editor.getAttributes("heading").level) : 0} onChange={(event) => {
        const level = Number(event.target.value);
        if (level === 0) editor.chain().focus().setParagraph().run();
        else editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
      }}><option value={0}>{t.paragraph}</option>{[1, 2, 3, 4, 5, 6].map((level) => <option key={level} value={level}>{t.heading} {level}</option>)}</select>
      {tools.map((tool) => <button type="button" key={tool.label} className="bf-button" aria-pressed={tool.active} onClick={tool.run}>{tool.label}</button>)}
      <button type="button" className="bf-button" aria-pressed={editor.isActive("link")} onClick={() => { setUrl(String(editor.getAttributes("link").href ?? "")); setInvalid(false); setLinkOpen(true); }}>{t.link}</button>
      <button type="button" className="bf-button" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}>{t.unlink}</button>
      <button type="button" className="bf-button" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>{t.undo}</button>
      <button type="button" className="bf-button" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>{t.redo}</button>
    </div>
    {linkOpen && <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(event) => {
      event.preventDefault();
      if (!safeLink(url)) { setInvalid(true); return; }
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run(); setLinkOpen(false);
    }}>
      <label className="min-w-0 flex-1">{t.url}<input className="bf-input" value={url} onChange={(event) => setUrl(event.target.value)} autoFocus required /></label>
      <button className="bf-button" type="submit">{t.apply}</button><button className="bf-button" type="button" onClick={() => setLinkOpen(false)}>{t.cancel}</button>
      {invalid && <p className="w-full text-[var(--danger)]" role="alert">{t.invalidLink}</p>}
    </form>}
    <EditorContent editor={editor} />
  </div>;
}
