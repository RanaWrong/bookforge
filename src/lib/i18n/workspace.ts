import type { Locale } from "./messages";
import type { ErrorCode } from "../../modules/books/contracts";

export const workspaceMessages = {
  en: {
    dashboard: "Your library", home: "Home", language: "Interface language", intro: "A little space for your next book.",
    dev: "Development only — all visitors share one local identity. This is not production authentication.",
    newBook: "Create book", newChapter: "Add chapter", title: "Title", books: "Books", chapters: "Chapters", updated: "Updated",
    emptyBooks: "Your shelf is empty. Create a book to begin.", emptyChapters: "No chapters yet. Add your first chapter.",
    selectBook: "Choose a book to manage its chapters.", selectChapter: "Open a chapter to start writing.",
    rename: "Rename", delete: "Delete", open: "Open", cancel: "Cancel", confirmDelete: "Delete permanently",
    deleteBook: "Delete this book and all its chapters? This cannot be undone.", deleteChapter: "Delete this chapter? This cannot be undone.",
    save: "Save chapter", saving: "Working…", loading: "Loading…", saved: "Changes saved.", deleted: "Deleted.",
    retry: "Retry", up: "Move up", down: "Move down", content: "Chapter text", plainText: "Plain-text editor · Bangla + English",
    unsaved: "Unsaved changes", clean: "All changes saved", discard: "Discard your unsaved chapter changes?", limit: "Maximum 200,000 characters.",
    errors: {
      INVALID_INPUT: "Check your input. Titles need 1–300 characters; chapter text allows up to 200,000 characters.",
      NOT_FOUND: "This item is unavailable or you do not have access. Refresh the library.",
      CONFLICT: "This chapter changed in another window. Your text is kept here. Copy it before reloading the chapter and merging your changes.",
      UNSUPPORTED_CONTENT: "This chapter uses an unsupported content format. Its stored content has not been changed.",
      IDENTITY_DISABLED: "Workspace disabled. For local development, set BOOKFORGE_DEV_IDENTITY=true in .env and run npm run dev. Production requires real authentication.",
      UNAVAILABLE: "Could not reach the workspace. Check the database connection and migrations, then retry. Your unsaved text is kept here.",
    },
  },
  bn: {
    dashboard: "আপনার বইয়ের সংগ্রহ", home: "হোম", language: "ইন্টারফেসের ভাষা", intro: "আপনার পরবর্তী বই লেখার শান্ত একটি জায়গা।",
    dev: "শুধু ডেভেলপমেন্টের জন্য — সব দর্শক একই স্থানীয় পরিচয় ব্যবহার করেন। এটি প্রোডাকশন লগইন নয়।",
    newBook: "নতুন বই", newChapter: "অধ্যায় যোগ করুন", title: "শিরোনাম", books: "বই", chapters: "অধ্যায়", updated: "হালনাগাদ",
    emptyBooks: "এখনো কোনো বই নেই। শুরু করতে একটি বই তৈরি করুন।", emptyChapters: "এখনো অধ্যায় নেই। প্রথম অধ্যায়টি যোগ করুন।",
    selectBook: "অধ্যায় পরিচালনা করতে একটি বই বেছে নিন।", selectChapter: "লেখা শুরু করতে একটি অধ্যায় খুলুন।",
    rename: "নাম বদলান", delete: "মুছুন", open: "খুলুন", cancel: "বাতিল", confirmDelete: "স্থায়ীভাবে মুছুন",
    deleteBook: "বইটি এবং এর সব অধ্যায় মুছবেন? এটি ফেরানো যাবে না।", deleteChapter: "অধ্যায়টি মুছবেন? এটি ফেরানো যাবে না।",
    save: "অধ্যায় সংরক্ষণ করুন", saving: "কাজ চলছে…", loading: "লোড হচ্ছে…", saved: "পরিবর্তন সংরক্ষিত হয়েছে।", deleted: "মুছে ফেলা হয়েছে।",
    retry: "আবার চেষ্টা করুন", up: "উপরে নিন", down: "নিচে নিন", content: "অধ্যায়ের লেখা", plainText: "সাধারণ টেক্সট সম্পাদক · বাংলা + English",
    unsaved: "অসংরক্ষিত পরিবর্তন", clean: "সব পরিবর্তন সংরক্ষিত", discard: "অধ্যায়ের অসংরক্ষিত পরিবর্তন বাদ দেবেন?", limit: "সর্বোচ্চ ২০০,০০০ অক্ষর।",
    errors: {
      INVALID_INPUT: "তথ্য যাচাই করুন। শিরোনাম ১–৩০০ অক্ষর এবং অধ্যায়ের লেখা সর্বোচ্চ ২০০,০০০ অক্ষর হতে পারে।",
      NOT_FOUND: "এটি পাওয়া যাচ্ছে না অথবা আপনার অনুমতি নেই। বইয়ের তালিকা আবার লোড করুন।",
      CONFLICT: "অন্য উইন্ডোতে অধ্যায়টি বদলেছে। আপনার লেখা এখানেই আছে। লেখা কপি করে অধ্যায়টি আবার খুলুন এবং পরিবর্তন মেলান।",
      UNSUPPORTED_CONTENT: "এই অধ্যায়ের লেখার ধরন এখনো সমর্থিত নয়। সংরক্ষিত লেখা বদলানো হয়নি।",
      IDENTITY_DISABLED: "কর্মক্ষেত্র বন্ধ আছে। স্থানীয় ডেভেলপমেন্টে .env-এ BOOKFORGE_DEV_IDENTITY=true দিয়ে npm run dev চালান। প্রোডাকশনে প্রকৃত লগইন প্রয়োজন।",
      UNAVAILABLE: "কর্মক্ষেত্রে সংযোগ করা যায়নি। ডেটাবেস সংযোগ ও মাইগ্রেশন যাচাই করে আবার চেষ্টা করুন। অসংরক্ষিত লেখা এখানেই আছে।",
    },
  },
} satisfies Record<Locale, { errors: Record<ErrorCode, string> } & Record<string, unknown>>;
