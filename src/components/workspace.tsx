"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { loadBook, loadBooks, loadChapter, mutateLibrary } from "../app/dashboard/actions";
import type { BookDetail, BookSummary, ChapterDetail, ErrorCode, Mutation, Result } from "../modules/books/contracts";
import { workspaceMessages } from "../lib/i18n/workspace";
import type { Locale } from "../lib/i18n/messages";

type DialogState = { kind: "createBook" | "renameBook" | "deleteBook" | "createChapter" | "renameChapter" | "deleteChapter"; title: string; bookId?: string; chapterId?: string };
const button = "bf-button";

export function Workspace({ initialLocale }: { initialLocale: Locale }) {
  const [locale, setLocale] = useState(initialLocale);
  const t = workspaceMessages[locale];
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [chapter, setChapter] = useState<ChapterDetail | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [notice, setNotice] = useState<"saved" | "deleted" | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogError, setDialogError] = useState<ErrorCode | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const dirty = chapter !== null && text !== chapter.text;

  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (dialog) modal.current?.showModal(); else modal.current?.close();
  }, [dialog]);

  const work = useCallback(async (task: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true); setError(null); setNotice(null);
    try { await task(); } catch { setError("UNAVAILABLE"); }
    finally { locked.current = false; setBusy(false); }
  }, []);

  const accept = <T,>(result: Result<T>, apply: (value: T) => void): boolean => {
    if (!result.ok) { setError(result.code); return false; }
    apply(result.data); return true;
  };
  const refreshBooks = useCallback(async () => {
    const result = await loadBooks();
    if (result.ok) { setBooks(result.data); setReady(true); }
    else { setError(result.code); setReady(false); }
  }, []);
  useEffect(() => { void work(refreshBooks); }, [work, refreshBooks]);

  function mayLeave() { return !dirty || window.confirm(t.discard); }
  async function openBook(bookId: string) {
    if (!mayLeave()) return;
    await work(async () => {
      accept(await loadBook(bookId), (value) => { setBook(value); setChapter(null); setText(""); });
    });
  }
  async function openChapter(chapterId: string) {
    if (!book || !mayLeave()) return;
    await work(async () => {
      accept(await loadChapter(book.id, chapterId), (value) => { setChapter(value); setText(value.text ?? ""); });
    });
  }
  function showDialog(value: DialogState) {
    if (busy) return;
    if ((value.kind === "deleteBook" && value.bookId === book?.id || value.kind === "deleteChapter" && value.chapterId === chapter?.id) && !mayLeave()) return;
    setDialogError(null); setDialog(value);
  }
  async function move(chapterId: string, direction: "up" | "down") {
    if (!book) return;
    await work(async () => {
      const result = await mutateLibrary({ kind: "moveChapter", bookId: book.id, chapterId, direction });
      if (!result.ok) { setError(result.code); return; }
      accept(await loadBook(book.id), setBook);
      await refreshBooks();
      setNotice("saved");
    });
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!book || !chapter) return;
    await work(async () => {
      const result = await mutateLibrary({ kind: "saveChapter", bookId: book.id, chapterId: chapter.id, revision: chapter.revision, text });
      if (!result.ok) { setError(result.code); return; }
      if (result.data.revision === undefined) { setError("UNAVAILABLE"); return; }
      setChapter({ ...chapter, text, revision: result.data.revision });
      setNotice("saved");
      await refreshBooks();
    });
  }
  async function submitDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialog) return;
    const name = String(new FormData(event.currentTarget).get("title") ?? "");
    let command: Mutation;
    if (dialog.kind === "createBook") command = { kind: dialog.kind, title: name, language: locale };
    else if (!dialog.bookId) return;
    else if (dialog.kind === "renameBook" || dialog.kind === "createChapter") command = { kind: dialog.kind, bookId: dialog.bookId, title: name };
    else if (dialog.kind === "deleteBook") command = { kind: dialog.kind, bookId: dialog.bookId, confirmed: true };
    else if (!dialog.chapterId) return;
    else if (dialog.kind === "renameChapter") command = { kind: dialog.kind, bookId: dialog.bookId, chapterId: dialog.chapterId, title: name };
    else command = { kind: dialog.kind, bookId: dialog.bookId, chapterId: dialog.chapterId, confirmed: true };
    await work(async () => {
      setDialogError(null);
      let result;
      try { result = await mutateLibrary(command); }
      catch { setDialogError("UNAVAILABLE"); return; }
      if (!result.ok) { setDialogError(result.code); return; }
      setDialog(null);
      if (command.kind === "deleteBook" && book?.id === command.bookId) { setBook(null); setChapter(null); setText(""); }
      if (command.kind === "deleteChapter" && chapter?.id === command.chapterId) { setChapter(null); setText(""); }
      if (command.kind === "renameChapter" && chapter?.id === command.chapterId) setChapter({ ...chapter, title: name.trim() });
      // Preserve unsaved editor text when metadata or ordering changes.
      if (book && command.kind !== "createBook" && command.bookId === book.id && command.kind !== "deleteBook") accept(await loadBook(book.id), setBook);
      await refreshBooks();
      setNotice(command.kind === "deleteBook" || command.kind === "deleteChapter" ? "deleted" : "saved");
    });
  }

  const deleting = dialog?.kind === "deleteBook" || dialog?.kind === "deleteChapter";
  const dialogTitle = dialog?.kind === "createBook" ? t.newBook : dialog?.kind === "createChapter" ? t.newChapter : deleting ? t.delete : t.rename;

  return <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8" lang={locale}>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
      <Link href="/" onClick={(event) => { if (!mayLeave()) event.preventDefault(); }} className="text-xl font-bold" aria-label={`BookForge · ${t.home}`}>BookForge<span className="text-[var(--accent)]">.</span></Link>
      <div className="flex gap-2" role="group" aria-label={t.language}>
        {(["bn", "en"] as const).map((value) => <button key={value} className={button} aria-pressed={locale === value} onClick={() => setLocale(value)}>{value === "bn" ? "বাংলা" : "English"}</button>)}
      </div>
    </header>
    <p className="my-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--muted)]">{t.dev}</p>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-semibold">{t.dashboard}</h1><p className="mt-2 text-[var(--muted)]">{t.intro}</p></div><button className={`${button} bf-primary`} disabled={busy || !ready} onClick={() => showDialog({ kind: "createBook", title: "" })}>{t.newBook}</button></div>
    <div aria-live="polite" role="status" className="min-h-7 text-sm">{busy ? t.loading : notice ? t[notice] : ""}</div>
    {error && <div role="alert" className="mb-5 rounded-xl border border-[var(--danger)] p-4"><p>{t.errors[error]}</p><button className={`${button} mt-3`} disabled={busy} onClick={() => void work(refreshBooks)}>{t.retry}</button></div>}
    <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]" aria-busy={busy}>
      <aside aria-label={t.books} className="bf-panel">
        <h2 className="mb-4 text-lg font-semibold">{t.books} <span className="text-[var(--muted)]">({books.length})</span></h2>
        {ready && !books.length && <p className="text-sm text-[var(--muted)]">{t.emptyBooks}</p>}
        <ul className="space-y-4">{books.map((item) => <li key={item.id} className={`rounded-xl border p-3 ${book?.id === item.id ? "border-[var(--accent)]" : "border-[var(--border)]"}`}>
          <button className="w-full break-words text-left font-semibold underline-offset-4 hover:underline" disabled={busy} onClick={() => void openBook(item.id)} aria-pressed={book?.id === item.id}>{item.title}</button>
          <p className="mt-2 text-sm text-[var(--muted)]">{item.chapterCount} {t.chapters}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{t.updated}: <time dateTime={item.updatedAt}>{new Date(item.updatedAt).toLocaleString(locale === "bn" ? "bn-BD" : "en-GB")}</time></p>
          <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={busy} aria-label={`${t.rename}: ${item.title}`} onClick={() => showDialog({ kind: "renameBook", title: item.title, bookId: item.id })}>{t.rename}</button><button className={button} disabled={busy} aria-label={`${t.delete}: ${item.title}`} onClick={() => showDialog({ kind: "deleteBook", title: item.title, bookId: item.id })}>{t.delete}</button></div>
        </li>)}</ul>
      </aside>
      <section className="min-w-0 space-y-6" aria-label={t.chapters}>
        {!book ? <div className="bf-panel text-[var(--muted)]">{t.selectBook}</div> : <>
          <div className="bf-panel">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-semibold">{book.title}</h2><button className={button} disabled={busy} onClick={() => showDialog({ kind: "createChapter", bookId: book.id, title: "" })}>{t.newChapter}</button></div>
            {!book.chapters.length && <p className="text-[var(--muted)]">{t.emptyChapters}</p>}
            <ol className="space-y-3">{book.chapters.map((item, index) => <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--background)] p-3">
              <button className="min-w-0 flex-1 break-words text-left font-medium" disabled={busy} aria-pressed={chapter?.id === item.id} onClick={() => void openChapter(item.id)}>{index + 1}. {item.title}</button>
              <div className="flex flex-wrap gap-1"><button className={button} aria-label={`${t.up}: ${item.title}`} disabled={busy || index === 0} onClick={() => void move(item.id, "up")}>↑</button><button className={button} aria-label={`${t.down}: ${item.title}`} disabled={busy || index === book.chapters.length - 1} onClick={() => void move(item.id, "down")}>↓</button><button className={button} disabled={busy} aria-label={`${t.rename}: ${item.title}`} onClick={() => showDialog({ kind: "renameChapter", title: item.title, bookId: book.id, chapterId: item.id })}>{t.rename}</button><button className={button} disabled={busy} aria-label={`${t.delete}: ${item.title}`} onClick={() => showDialog({ kind: "deleteChapter", title: item.title, bookId: book.id, chapterId: item.id })}>{t.delete}</button></div>
            </li>)}</ol>
          </div>
          {!chapter ? <p className="bf-panel text-[var(--muted)]">{t.selectChapter}</p> : <form onSubmit={save} className="bf-panel">
            <h2 className="break-words text-xl font-semibold">{chapter.title}</h2><p className="my-2 text-sm text-[var(--muted)]">{t.plainText}</p>
            <label htmlFor="chapter-text" className="mb-2 block font-medium">{t.content}</label>
            <textarea id="chapter-text" className="bf-input min-h-80 resize-y leading-8" value={text} onChange={(event) => { setText(event.target.value); setNotice(null); }} maxLength={200000} disabled={busy} aria-describedby="content-help" />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4"><p id="content-help" className="text-sm text-[var(--muted)]">{dirty ? t.unsaved : t.clean} · {t.limit}</p><button className={`${button} bf-primary`} disabled={busy || !dirty} type="submit">{busy ? t.saving : t.save}</button></div>
          </form>}
        </>}
      </section>
    </div>
    <dialog ref={modal} aria-labelledby="dialog-title" aria-describedby={deleting ? "delete-description" : undefined} onCancel={(event) => { if (busy) event.preventDefault(); else setDialog(null); }} onClose={() => setDialog(null)} className="w-[min(92vw,28rem)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--foreground)] backdrop:bg-black/40">
      {dialog && <form onSubmit={submitDialog} key={`${dialog.kind}-${dialog.chapterId ?? dialog.bookId ?? "new"}`}>
        <h2 id="dialog-title" className="mb-4 text-xl font-semibold">{dialogTitle}</h2>
        {deleting ? <><p id="delete-description">{dialog.kind === "deleteBook" ? t.deleteBook : t.deleteChapter}</p><p className="mt-3 break-words font-semibold">{dialog.title}</p></> : <><label htmlFor="item-title" className="mb-2 block">{t.title}</label><input id="item-title" name="title" className="bf-input" defaultValue={dialog.title} maxLength={300} required disabled={busy} autoFocus /></>}
        {dialogError && <p role="alert" className="mt-4 text-[var(--danger)]">{t.errors[dialogError]}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" className={button} disabled={busy} autoFocus={deleting} onClick={() => setDialog(null)}>{t.cancel}</button><button type="submit" className={`${button} ${deleting ? "bf-danger" : "bf-primary"}`} disabled={busy}>{busy ? t.saving : deleting ? t.confirmDelete : dialogTitle}</button></div>
      </form>}
    </dialog>
  </main>;
}
