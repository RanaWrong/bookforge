import type { BookDetail, BookSummary, ChapterDetail, ErrorCode } from "../../modules/books/contracts";
import type { Locale } from "../../lib/i18n/messages";

// ---------------------------------------------------------------------------
// Dialog state — one variant per dialog kind
// ---------------------------------------------------------------------------
export type DialogState =
  | { kind: "createBook" }
  | { kind: "renameBook"; bookId: string; currentTitle: string }
  | { kind: "deleteBook"; bookId: string; bookTitle: string }
  | { kind: "createChapter"; bookId: string }
  | { kind: "renameChapter"; bookId: string; chapterId: string; currentTitle: string }
  | { kind: "deleteChapter"; bookId: string; chapterId: string; chapterTitle: string }
  | { kind: "inviteMember" }
  | { kind: "manageMembers" };

// ---------------------------------------------------------------------------
// Workspace state
// ---------------------------------------------------------------------------
export interface WorkspaceState {
  /** All books visible in the sidebar. */
  books: BookSummary[];
  /** The currently opened book, or null if none is selected. */
  activeBook: BookDetail | null;
  /** The currently opened chapter, or null if none is selected. */
  activeChapter: ChapterDetail | null;
  /** True while any async operation is in flight. */
  busy: boolean;
  /** Active UI locale. */
  locale: Locale;
  /** Active colour theme. */
  theme: "light" | "dark" | "system";
  /** The authenticated user's role in the current workspace, or null before load. */
  role: "OWNER" | "EDITOR" | "VIEWER" | null;
  /** When true, hides all chrome except the editor canvas. */
  focusMode: boolean;
  /** Whether the sidebar panel is visible. */
  sidebarOpen: boolean;
  /** Width of the sidebar in pixels (persisted to localStorage). */
  sidebarWidth: number;
  /** Most recent error code, or null when there is no error. */
  error: ErrorCode | null;
  /** Ephemeral notice shown after a successful mutation. */
  notice: "saved" | "deleted" | null;
  /** The dialog that is currently open, or null when no dialog is showing. */
  dialog: DialogState | null;
  /** The current editor text (plain-text / markdown view). */
  text: string;
}

// ---------------------------------------------------------------------------
// Action discriminated union
// ---------------------------------------------------------------------------
export type WorkspaceAction =
  /** Replace the full book list (e.g. after initial load or any mutation). */
  | { type: "SET_BOOKS"; books: BookSummary[] }
  /** Set or clear the active book. */
  | { type: "SET_ACTIVE_BOOK"; book: BookDetail | null }
  /** Set or clear the active chapter. */
  | { type: "SET_ACTIVE_CHAPTER"; chapter: ChapterDetail | null }
  /** Update the live editor text. */
  | { type: "SET_TEXT"; text: string }
  /** Toggle the in-flight loading indicator. */
  | { type: "SET_BUSY"; busy: boolean }
  /** Switch the UI locale. */
  | { type: "SET_LOCALE"; locale: Locale }
  /** Switch the colour theme. */
  | { type: "SET_THEME"; theme: "light" | "dark" | "system" }
  /** Set the user's workspace role after a permission check. */
  | { type: "SET_ROLE"; role: "OWNER" | "EDITOR" | "VIEWER" | null }
  /** Toggle distraction-free (focus) mode on or off. */
  | { type: "TOGGLE_FOCUS" }
  /** Toggle sidebar visibility. */
  | { type: "TOGGLE_SIDEBAR" }
  /** Persist a new sidebar width. */
  | { type: "SET_SIDEBAR_WIDTH"; width: number }
  /** Set or clear the current error code. */
  | { type: "SET_ERROR"; error: ErrorCode | null }
  /** Set or clear the ephemeral notice. */
  | { type: "SET_NOTICE"; notice: "saved" | "deleted" | null }
  /** Open a specific dialog. */
  | { type: "SET_DIALOG"; dialog: DialogState }
  /** Close the currently open dialog. */
  | { type: "CLEAR_DIALOG" };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------
export function workspaceReducer(state: WorkspaceState, action: WorkspaceAction): WorkspaceState {
  switch (action.type) {
    case "SET_BOOKS":
      return { ...state, books: action.books };

    case "SET_ACTIVE_BOOK":
      return { ...state, activeBook: action.book };

    case "SET_ACTIVE_CHAPTER":
      return { ...state, activeChapter: action.chapter };

    case "SET_TEXT":
      return { ...state, text: action.text };

    case "SET_BUSY":
      return { ...state, busy: action.busy };

    case "SET_LOCALE":
      return { ...state, locale: action.locale };

    case "SET_THEME":
      return { ...state, theme: action.theme };

    case "SET_ROLE":
      return { ...state, role: action.role };

    case "TOGGLE_FOCUS":
      return { ...state, focusMode: !state.focusMode };

    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };

    case "SET_SIDEBAR_WIDTH":
      return { ...state, sidebarWidth: action.width };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "SET_NOTICE":
      return { ...state, notice: action.notice };

    case "SET_DIALOG":
      return { ...state, dialog: action.dialog };

    case "CLEAR_DIALOG":
      return { ...state, dialog: null };

    default: {
      // Exhaustiveness check — TypeScript will error if a case is missing.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
