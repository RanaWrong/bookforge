"use client";

import React, { useState } from "react";
import { markdownToCanonicalDocument } from "./markdown-converter";

export interface DualModeEditorProps {
  chapterTitle: string;
  markdown: string;
  revisionNumber: number;
  saveStatus: "saved" | "dirty" | "saving" | "conflict" | "error";
  locale: "bn" | "en";
  onChangeMarkdown: (nextMarkdown: string) => void;
  onChangeTitle: (nextTitle: string) => void;
  onSaveSnapshot: (label: string) => void;
}

export function DualModeEditor({
  chapterTitle,
  markdown,
  revisionNumber,
  saveStatus,
  locale,
  onChangeMarkdown,
  onChangeTitle,
  onSaveSnapshot,
}: DualModeEditorProps) {
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const conversion = markdownToCanonicalDocument(markdown);

  const insertSnippet = (snippet: string) => {
    const separator = markdown.endsWith("\n") || markdown.length === 0 ? "" : "\n\n";
    onChangeMarkdown(`${markdown}${separator}${snippet}\n`);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("visual")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              mode === "visual"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--background)] text-[var(--muted)]"
            }`}
          >
            {locale === "bn" ? "ভিজ্যুয়াল এডিটর (TipTap)" : "Visual Mode (TipTap)"}
          </button>
          <button
            type="button"
            onClick={() => setMode("source")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              mode === "source"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--background)] text-[var(--muted)]"
            }`}
          >
            {locale === "bn" ? "মার্কডাউন সোর্স (CodeMirror)" : "Markdown Source"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() =>
              insertSnippet("> 💡 **এক্সাম টিপস:** পরীক্ষার জন্য গুরুত্বপূর্ণ পরামর্শ এখানে লিখুন।")
            }
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--background)]"
          >
            + 💡 Exam Tip
          </button>
          <button
            type="button"
            onClick={() =>
              insertSnippet("> **মূল কবিতাংশ:** উদ্ধৃতি বা কবিতাংশ এখানে যুক্ত করুন।")
            }
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--background)]"
          >
            + ❝ Quote Box
          </button>
          <button
            type="button"
            onClick={() =>
              insertSnippet(
                "| ক্রমিক | মূল উপজীব্য | উপস্থাপনের কৌশল |\n| --- | --- | --- |\n| ০১ | বিষয় | বিশ্লেষণ |"
              )
            }
            className="rounded-lg border border-[var(--border)] px-2.5 py-1 hover:bg-[var(--background)]"
          >
            + ⊞ Table
          </button>
          <span className="ml-2 rounded-full bg-[#edf4ef] px-2.5 py-1 font-medium text-[var(--accent)]">
            v{revisionNumber} · {saveStatus}
          </span>
        </div>
      </div>

      <div className="border-b border-[var(--border)] px-6 py-3">
        <input
          type="text"
          value={chapterTitle}
          onChange={(e) => onChangeTitle(e.target.value)}
          aria-label="Chapter Title"
          className="w-full text-xl font-bold text-[#123B6D] focus:outline-none"
        />
      </div>

      {conversion.warnings.length > 0 && (
        <div className="bg-[#FFF4ED] px-6 py-2 text-xs text-[#9E2A2B]">
          {conversion.warnings.map((w, i) => (
            <div key={i}>⚠️ {w}</div>
          ))}
        </div>
      )}

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {mode === "source" ? "Markdown Source Editor" : "Interactive Manuscript Canvas"}
          </label>
          <textarea
            value={markdown}
            onChange={(e) => onChangeMarkdown(e.target.value)}
            rows={18}
            className="w-full rounded-xl border border-[var(--border)] bg-[#fcfbf9] p-4 font-mono text-sm leading-relaxed focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-white p-5">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {locale === "bn"
              ? "লাইভ স্ট্রাকচারাল প্রিভিউ (215 × 275 মিমি স্টাইল)"
              : "Live Canonical Block Preview"}
          </div>
          <div className="space-y-3 text-sm leading-relaxed">
            {conversion.document.blocks.map((block, index) => {
              if (block.type === "heading") {
                return (
                  <h3 key={index} className="font-bold text-[#123B6D] text-lg">
                    {block.text}
                  </h3>
                );
              }
              if (block.type === "callout") {
                const isTip = block.variant === "EXAM_TIP" || block.variant === "COMMON_MISTAKE";
                return (
                  <div
                    key={index}
                    className="rounded p-3"
                    style={{
                      background: isTip ? "#FFF4ED" : "#F4F7FB",
                      borderLeft: `5px solid ${isTip ? "#F26B21" : "#123B6D"}`,
                    }}
                  >
                    <div
                      className="font-bold text-xs mb-1"
                      style={{ color: isTip ? "#F26B21" : "#123B6D" }}
                    >
                      {block.label}
                    </div>
                    <div>{block.text}</div>
                  </div>
                );
              }
              if (block.type === "bullet_list") {
                return (
                  <ul key={index} className="list-disc pl-5 space-y-1">
                    {block.items.map((it, idx) => (
                      <li key={idx}>{it}</li>
                    ))}
                  </ul>
                );
              }
              if (block.type === "paragraph") {
                return <p key={index}>{block.text}</p>;
              }
              return (
                <pre key={index} className="rounded bg-[var(--background)] p-2 text-xs">
                  {JSON.stringify(block)}
                </pre>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--background)] px-6 py-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={snapshotLabel}
            onChange={(e) => setSnapshotLabel(e.target.value)}
            placeholder={
              locale === "bn" ? "রিভিশন নোট লিখুন..." : "Revision snapshot note..."
            }
            className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => {
              onSaveSnapshot(snapshotLabel || `Manual Snapshot v${revisionNumber + 1}`);
              setSnapshotLabel("");
            }}
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {locale === "bn" ? "রিভিশন সংরক্ষণ করুন" : "Save Revision Snapshot"}
          </button>
        </div>
      </div>
    </div>
  );
}
