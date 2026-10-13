"use client";

import { useState } from "react";
import { messages, type Locale } from "@/lib/i18n/messages";

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("bn");
  const t = messages[locale];

  return (
    <main className="min-h-screen px-5 py-8 sm:px-10 lg:px-16">
      <header className="mx-auto flex max-w-6xl items-center justify-between">
        <a href="/" className="text-xl font-bold tracking-tight">{t.brand}<span className="text-[var(--accent)]">.</span></a>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-white p-1 text-sm">
          <button onClick={() => setLocale("bn")} aria-pressed={locale === "bn"} className={`rounded-full px-3 py-1.5 ${locale === "bn" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>বাংলা</button>
          <button onClick={() => setLocale("en")} aria-pressed={locale === "en"} className={`rounded-full px-3 py-1.5 ${locale === "en" ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"}`}>English</button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-28">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">{t.eyebrow}</p>
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">{t.title}</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[var(--muted)]">{t.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button disabled className="cursor-not-allowed rounded-xl bg-[var(--accent)] px-5 py-3 font-medium text-white opacity-90">{t.createBook}</button>
            <button disabled className="cursor-not-allowed rounded-xl border border-[var(--border)] bg-white px-5 py-3 font-medium">{t.importBook}</button>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">{t.phaseLabel} — {t.comingSoon}</p>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--muted)]">{t.brand} workspace</p>
              <h2 className="mt-1 text-lg font-semibold">{t.structureTitle}</h2>
            </div>
            <span className="rounded-full bg-[#edf4ef] px-3 py-1 text-xs font-medium text-[var(--accent)]">MVP</span>
          </div>
          <p className="py-5 text-sm leading-6 text-[var(--muted)]">{t.structureDescription}</p>
          <div className="space-y-3">
            {[
              { number: "01", title: t.chapters, detail: locale === "bn" ? "ভূমিকা · অধ্যায় · পরিশিষ্ট" : "Preface · Chapters · Appendix" },
              { number: "02", title: t.typography, detail: locale === "bn" ? "বাংলা + English ফন্ট ও spacing" : "Bangla + English fonts and spacing" },
              { number: "03", title: t.export, detail: locale === "bn" ? "অধ্যায় বা সম্পূর্ণ বই" : "Individual chapters or complete book" },
            ].map((item) => (
              <div key={item.number} className="flex items-center gap-4 rounded-2xl bg-[var(--background)] p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold">{item.number}</span>
                <div><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{item.detail}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="mx-auto max-w-6xl border-t border-[var(--border)] py-5 text-xs text-[var(--muted)]">BookForge · Built for thoughtful writing and reliable publishing.</footer>
    </main>
  );
}
