"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DualModeEditor } from "@/features/editor/DualModeEditor";
import { MASTER_BOOK_PRESET } from "@/features/design/presets";
import { messages, type Locale } from "@/lib/i18n/messages";

interface StudioChapter {
  id: string;
  kind: "FRONTMATTER" | "CHAPTER" | "BACKMATTER";
  title: string;
  markdown: string;
  revisionNumber: number;
}

export default function BookWorkspacePage() {
  const [locale, setLocale] = useState<Locale>("bn");
  const [activeTab, setActiveTab] = useState<"editor" | "design" | "preview" | "revisions">(
    "editor"
  );
  const [chapters, setChapters] = useState<StudioChapter[]>([
    {
      id: "ch-1",
      kind: "FRONTMATTER",
      title: "প্রাককথন ও প্রস্তুতি কৌশল",
      markdown:
        "# প্রাককথন ও প্রস্তুতি কৌশল\n\n> 💡 **এক্সাম টিপস:** পরীক্ষার আগের রাতে শুধুমাত্র লাল চিহ্নিত অংশগুলো দ্রুত রিভিশন করুন।\n\nবাংলা ও ইংরেজি উভয় ভাষায় নিখুঁত মুদ্রণযোগ্য বই তৈরির পূর্ণাঙ্গ ওয়ার্কস্পেস।",
      revisionNumber: 1,
    },
    {
      id: "ch-2",
      kind: "CHAPTER",
      title: "অধ্যায় ০১: বাংলা ব্যাকরণ ও নির্মিতি (পূর্ণমান: ৪০)",
      markdown:
        "# অধ্যায় ০১: বাংলা ব্যাকরণ ও নির্মিতি\n\n> **মূল কবিতাংশ (কাজী নজরুল ইসলাম):** দুর্গম গিরি, কান্তার-মরু, দুস্তর পারাবার!\n\n## প্রশ্ন ১. দাপ্তরিক স্মারকলিপি রচনার নিয়মাবলি আলোচনা করুন।\n\n### উত্তর\nদাপ্তরিক স্মারকলিপিতে অবশ্যই স্মারক নম্বর, তারিখ, প্রেরক ও প্রাপকের পদবি স্পষ্টভাবে উল্লেখ করতে হবে।",
      revisionNumber: 2,
    },
  ]);
  const [activeChapterId, setActiveChapterId] = useState("ch-2");
  const [profile, setProfile] = useState(MASTER_BOOK_PRESET);
  const [revisions, setRevisions] = useState([
    {
      id: "rev-2",
      revisionNumber: 2,
      label: "Added official memorandum rules",
      markdown: chapters[1].markdown,
      createdAt: "2026-10-14 11:30",
    },
    {
      id: "rev-1",
      revisionNumber: 1,
      label: "Initial chapter baseline",
      markdown: "# অধ্যায় ০১: বাংলা ব্যাকরণ ও নির্মিতি\n\nপ্রাথমিক খসড়া।",
      createdAt: "2026-10-14 10:15",
    },
  ]);

  const t = messages[locale];
  const activeChapter =
    chapters.find((c) => c.id === activeChapterId) ?? chapters[0];

  const updateActiveMarkdown = (nextMarkdown: string) => {
    setChapters(
      chapters.map((c) =>
        c.id === activeChapter.id ? { ...c, markdown: nextMarkdown } : c
      )
    );
  };

  const updateActiveTitle = (nextTitle: string) => {
    setChapters(
      chapters.map((c) =>
        c.id === activeChapter.id ? { ...c, title: nextTitle } : c
      )
    );
  };

  const handleSaveSnapshot = (label: string) => {
    const nextRevNum = activeChapter.revisionNumber + 1;
    setChapters(
      chapters.map((c) =>
        c.id === activeChapter.id ? { ...c, revisionNumber: nextRevNum } : c
      )
    );
    setRevisions([
      {
        id: `rev-${Date.now()}`,
        revisionNumber: nextRevNum,
        label,
        markdown: activeChapter.markdown,
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      },
      ...revisions,
    ]);
  };

  const moveChapter = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= chapters.length) return;
    const copy = [...chapters];
    const [removed] = copy.splice(idx, 1);
    copy.splice(target, 0, removed);
    setChapters(copy);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-8">
      <header className="mx-auto mb-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold"
          >
            ← Dashboard
          </Link>
          <h1 className="text-lg font-bold text-[#123B6D]">
            পিএসসি লিখিত পরীক্ষা সহায়িকা
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["editor", "design", "preview", "revisions"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                activeTab === tab
                  ? "bg-[#123B6D] text-white"
                  : "bg-white text-[var(--muted)] border border-[var(--border)]"
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLocale(locale === "bn" ? "en" : "bn")}
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold"
          >
            {locale === "bn" ? "EN" : "বাংলা"}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm h-fit">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
              {t.chapters}
            </h2>
            <button
              type="button"
              onClick={() => {
                const newCh: StudioChapter = {
                  id: `ch-${Date.now()}`,
                  kind: "CHAPTER",
                  title: `অধ্যায় ০${chapters.length + 1}: নতুন অধ্যায়`,
                  markdown: "# নতুন অধ্যায়\n\nএখানে লিখুন...",
                  revisionNumber: 1,
                };
                setChapters([...chapters, newCh]);
                setActiveChapterId(newCh.id);
              }}
              className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-white"
            >
              + Add
            </button>
          </div>

          <div className="space-y-2">
            {chapters.map((ch, idx) => (
              <div
                key={ch.id}
                className={`rounded-xl border p-3 transition ${
                  ch.id === activeChapter.id
                    ? "border-[var(--accent)] bg-[#edf4ef]"
                    : "border-[var(--border)] bg-[var(--background)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveChapterId(ch.id)}
                  className="w-full text-left"
                >
                  <span className="block text-[10px] font-bold uppercase text-[#F26B21]">
                    {ch.kind}
                  </span>
                  <span className="mt-0.5 block text-xs font-semibold">{ch.title}</span>
                </button>
                <div className="mt-2 flex gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => moveChapter(idx, -1)}
                    className="rounded border bg-white px-1.5 py-0.5"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveChapter(idx, 1)}
                    className="rounded border bg-white px-1.5 py-0.5"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section>
          {activeTab === "editor" && (
            <DualModeEditor
              chapterTitle={activeChapter.title}
              markdown={activeChapter.markdown}
              revisionNumber={activeChapter.revisionNumber}
              saveStatus="saved"
              locale={locale}
              onChangeMarkdown={updateActiveMarkdown}
              onChangeTitle={updateActiveTitle}
              onSaveSnapshot={handleSaveSnapshot}
            />
          )}

          {activeTab === "design" && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-[#123B6D]">{t.design.heading}</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Trim Width (mm)
                  </label>
                  <input
                    type="number"
                    value={profile.widthMm}
                    onChange={(e) =>
                      setProfile({ ...profile, widthMm: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Trim Height (mm)
                  </label>
                  <input
                    type="number"
                    value={profile.heightMm}
                    onChange={(e) =>
                      setProfile({ ...profile, heightMm: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Inside Margin + Gutter (mm)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={`${profile.marginInsideMm}mm + ${profile.gutterMm}mm gutter`}
                    className="w-full rounded-lg border bg-[var(--background)] px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "preview" && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-sm">
              <div className="mb-4 flex items-center justify-between border-b pb-3">
                <span className="text-xs font-bold uppercase text-[var(--muted)]">
                  Print Trim: {profile.widthMm}mm × {profile.heightMm}mm · Mirror Margins Active
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg bg-[#123B6D] px-4 py-2 text-xs font-semibold text-white"
                >
                  {t.publishing.exportFullBook}
                </button>
              </div>
              <div className="mx-auto max-w-2xl border border-[#D9E2EC] bg-[#fcfbf9] p-8 shadow-inner">
                <div className="mb-6 flex justify-between border-b pb-2 text-xs text-[var(--muted)]">
                  <span>পিএসসি লিখিত পরীক্ষা সহায়িকা</span>
                  <span>{activeChapter.title}</span>
                </div>
                <div className="prose max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                  {activeChapter.markdown}
                </div>
              </div>
            </div>
          )}

          {activeTab === "revisions" && (
            <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm space-y-3">
              <h2 className="text-lg font-bold text-[#123B6D]">
                {t.editor.revisionsHeading}
              </h2>
              {revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] p-4"
                >
                  <div>
                    <div className="text-sm font-bold">
                      Revision #{rev.revisionNumber} — {rev.label}
                    </div>
                    <div className="text-xs text-[var(--muted)]">{rev.createdAt}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveMarkdown(rev.markdown);
                      handleSaveSnapshot(`Restored from Revision #${rev.revisionNumber}`);
                      setActiveTab("editor");
                    }}
                    className="rounded-lg border border-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]"
                  >
                    {t.editor.restoreRevision}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
