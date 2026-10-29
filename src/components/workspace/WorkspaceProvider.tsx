"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";
import type { Locale } from "../../lib/i18n/messages";
import { workspaceReducer } from "./state";
import type { WorkspaceAction, WorkspaceState } from "./state";

// ---------------------------------------------------------------------------
// Context value type
// ---------------------------------------------------------------------------
interface WorkspaceContextValue {
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
}

// ---------------------------------------------------------------------------
// Context — undefined sentinel so useWorkspace can detect missing provider
// ---------------------------------------------------------------------------
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Initial state helpers
// ---------------------------------------------------------------------------

/** Read the persisted theme from localStorage without throwing on SSR. */
function readPersistedTheme(): "light" | "dark" | "system" {
  if (typeof window === "undefined") return "system";
  const stored = localStorage.getItem("bf:theme");
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return "system";
}

/** Read the persisted sidebar width from localStorage without throwing on SSR. */
function readPersistedSidebarWidth(): number {
  if (typeof window === "undefined") return 260;
  const stored = localStorage.getItem("bf-sidebar-width");
  const parsed = stored !== null ? parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 260;
}

// ---------------------------------------------------------------------------
// Provider props
// ---------------------------------------------------------------------------
interface WorkspaceProviderProps {
  children: React.ReactNode;
  /** Initial locale, typically resolved server-side from the user's preference. */
  initialLocale?: Locale;
}

// ---------------------------------------------------------------------------
// WorkspaceProvider
// ---------------------------------------------------------------------------
export function WorkspaceProvider({ children, initialLocale = "en" }: WorkspaceProviderProps) {
  const initialState: WorkspaceState = {
    books: [],
    activeBook: null,
    activeChapter: null,
    busy: false,
    locale: initialLocale,
    theme: readPersistedTheme(),
    role: null,
    focusMode: false,
    sidebarOpen: true,
    sidebarWidth: readPersistedSidebarWidth(),
    error: null,
    notice: null,
    dialog: null,
    text: "",
  };

  const [state, dispatch] = useReducer(workspaceReducer, initialState);

  // -------------------------------------------------------------------------
  // Side-effect: apply theme to DOM and persist to localStorage
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.theme = state.theme;
    localStorage.setItem("bf:theme", state.theme);
  }, [state.theme]);

  // -------------------------------------------------------------------------
  // Side-effect: persist sidebar width to localStorage
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("bf-sidebar-width", String(state.sidebarWidth));
  }, [state.sidebarWidth]);

  return (
    <WorkspaceContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// useWorkspace hook
// ---------------------------------------------------------------------------
/**
 * Returns the workspace context value. Must be called inside a
 * `<WorkspaceProvider>` subtree; throws otherwise.
 */
export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (ctx === undefined) {
    throw new Error("useWorkspace must be used within a <WorkspaceProvider>");
  }
  return ctx;
}
