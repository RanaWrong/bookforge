"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, drawSelection, highlightActiveLine, highlightSpecialChars, keymap, lineNumbers } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { markdown } from "@codemirror/lang-markdown";

export function SourceEditor({ initialValue, onChange, label }: { initialValue: string; onChange: (value: string) => void; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const value = useRef(initialValue);
  const changed = useRef(onChange);
  useEffect(() => { changed.current = onChange; }, [onChange]);
  useEffect(() => {
    if (!host.current) return;
    const view = new EditorView({
      parent: host.current,
      state: EditorState.create({ doc: value.current, extensions: [
        markdown(), history(), keymap.of([...defaultKeymap, ...historyKeymap]),
        lineNumbers(), drawSelection(), highlightActiveLine(), highlightSpecialChars(),
        syntaxHighlighting(defaultHighlightStyle), EditorView.lineWrapping,
        EditorView.contentAttributes.of({ "aria-label": label, "aria-multiline": "true", spellcheck: "false" }),
        EditorView.theme({ "&": { minHeight: "20rem", border: "1px solid var(--border)", borderRadius: ".6rem" }, ".cm-content": { padding: "1rem", fontFamily: "monospace", lineHeight: "1.8" }, ".cm-gutters": { background: "var(--background)", color: "var(--muted)", border: "none" } }),
        EditorView.updateListener.of((update) => { if (update.docChanged) { value.current = update.state.doc.toString(); changed.current(value.current); } }),
      ] }),
    });
    return () => view.destroy();
  }, [label]);
  return <div ref={host} className="min-w-0" />;
}
