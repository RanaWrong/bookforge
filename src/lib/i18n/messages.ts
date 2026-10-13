export type Locale = "bn" | "en";

export const messages = {
  bn: {
    brand: "BookForge",
    eyebrow: "আপনার বই লেখার কর্মক্ষেত্র",
    title: "লিখুন। সাজান। প্রকাশ করুন।",
    description: "বাংলা ও English মিশ্র বইয়ের জন্য একটি সুসংগঠিত লেখার ও প্রকাশনার workspace.",
    createBook: "নতুন বই তৈরি করুন",
    importBook: "বই Import করুন",
    phaseLabel: "Phase 1 · Foundation",
    structureTitle: "একটি বই, একটি নির্ভরযোগ্য কাঠামো",
    structureDescription: "অধ্যায়, লেখা ও ডিজাইন আলাদা থাকবে—তাই পুরো বইয়ের formatting এক জায়গা থেকে নিয়ন্ত্রণ করা যাবে।",
    chapters: "অধ্যায়",
    typography: "টাইপোগ্রাফি",
    export: "PDF প্রকাশনা",
    comingSoon: "পরবর্তী ধাপে আসছে",
  },
  en: {
    brand: "BookForge",
    eyebrow: "Your book writing workspace",
    title: "Write. Organize. Publish.",
    description: "A structured writing and publishing workspace for books mixing Bangla and English.",
    createBook: "Create a book",
    importBook: "Import a manuscript",
    phaseLabel: "Phase 1 · Foundation",
    structureTitle: "One book, one reliable structure",
    structureDescription: "Keep chapters, content, and design separate so the entire book's formatting can be managed consistently.",
    chapters: "Chapters",
    typography: "Typography",
    export: "PDF publishing",
    comingSoon: "Coming in a later phase",
  },
} satisfies Record<Locale, Record<string, string>>;
