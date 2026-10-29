"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ChapterDetail, ErrorCode } from "../../modules/books/contracts";
import type { EditorDocument } from "./types";
import type { Locale } from "../../lib/i18n/messages";
import { workspaceMessages } from "../../lib/i18n/workspace";
import { LibraryError } from "../../lib/errors";
import { Autosave, type SaveState } from "./autosave";
import { saveDocument } from "./persistence";
import { validateDocument } from "./document";
import { fromMarkdown, toMarkdown } from "./markdown";
import { editorMessages } from "./messages";

const VisualEditor = dynamic(() => import("./visual-editor").then((module) => module.VisualEditor), { ssr: false });
const SourceEditor = dynamic(() => import("./source-editor").then((module) => module.SourceEditor), { ssr: false });

export function ChapterEditor({ bookId, chapter, locale, onState, onSaved }: {
  bookId: string; chapter: ChapterDetail; locale: Locale;
  onState: (state: SaveState) => void; onSaved: () => void;
}) {
  const [document, setDocument] = useState(chapter.document);
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [source, setSource] = useState("");
  const [warning, setWarning] = useState<ErrorCode | null>(null);
  const [state, setState] = useState<SaveState>({ status: "saved", dirty: false, inFlight: false });
  const autosave = useRef<Autosave | null>(null);
  const callbacks = useRef({ onState, onSaved });
  const initial = useRef({ bookId, chapter });
  useEffect(() => { callbacks.current = { onState, onSaved }; }, [onState, onSaved]);
  useEffect(() => {
    const { bookId, chapter } = initial.current;
    const controller = new Autosave(chapter.document, chapter.revision,
      (doc: EditorDocument, rev: number) => saveDocument(bookId, chapter.id, doc, rev),
      (next: SaveState) => { setState(next); callbacks.current.onState(next); },
      undefined, 800, () => callbacks.current.onSaved());
    autosave.current = controller;
    return () => controller.dispose();
  }, []);
  const t = editorMessages[locale];
  const errors = workspaceMessages[locale].errors;

  function changed(value: unknown) {
    try {
      const next = validateDocument(value);
      setDocument(next); setWarning(null); autosave.current?.change(next);
    } catch (error) { autosave.current?.reject(error instanceof LibraryError ? error.code : "INVALID_INPUT"); }
  }
  function sourceChanged(value: string) {
    setSource(value);
    try { changed(fromMarkdown(value)); }
    catch (error) { autosave.current?.reject(error instanceof LibraryError ? error.code : "UNSUPPORTED_CONTENT"); }
  }
  function switchMode(next: "visual" | "source") {
    if (next === mode) return;
    try {
      if (next === "source") setSource(toMarkdown(document));
      else changed(fromMarkdown(source));
      setWarning(null); setMode(next);
    } catch (error) { setWarning(error instanceof LibraryError ? error.code : "UNSUPPORTED_CONTENT"); }
  }
  return <section className="bf-panel min-w-0" aria-label={chapter.title}>
    <h2 className="mb-4 break-words text-xl font-semibold">{chapter.title}</h2>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label={t.modes} className="flex flex-wrap gap-2">
        <button className="bf-button" type="button" aria-pressed={mode === "visual"} onClick={() => switchMode("visual")}>{t.visual}</button>
        <button className="bf-button" type="button" aria-pressed={mode === "source"} onClick={() => switchMode("source")}>{t.source}</button>
      </div>
      <span role="status" aria-live="polite" className="text-sm">{(t as Record<string, string>)[state.status]}</span>
    </div>
    <p className="mb-4 text-sm text-[var(--muted)]">{t.help}</p>
    {warning && <p role="alert" className="mb-4 text-[var(--danger)]">{warning === "UNSUPPORTED_CONTENT" ? t.conversion : (errors as Record<string, string>)[warning]}</p>}
    {state.error && <div role="alert" className="mb-4 text-[var(--danger)]"><p>{state.error === "UNSUPPORTED_CONTENT" ? t.conversion : (errors as Record<string, string>)[state.error]}</p>{state.error === "CONFLICT" && <p>{t.recover}</p>}</div>}
    {mode === "visual" ? <VisualEditor initialDocument={document} onChange={changed} locale={locale} /> : <SourceEditor initialValue={source} onChange={sourceChanged} label={t.sourceLabel} />}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-[var(--muted)]">{state.error ? t.copy : workspaceMessages[locale].limit}</p>
      <button className="bf-button" type="button" disabled={!state.dirty || state.inFlight || state.error === "CONFLICT"} onClick={() => state.error ? autosave.current?.retry() : void autosave.current?.flush()}>{state.error ? t.retry : t.save}</button>
    </div>
  </section>;
}
