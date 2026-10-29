import { AppError } from "../../lib/errors.ts";
import type { ErrorCode, Result } from "../../modules/books/contracts";
import type { EditorDocument } from "./types";
import type { SessionContext } from "../../server/auth.ts";
import {
  getRepository,
  type BookForgeRepository,
  type ChapterRecord,
  type ChapterVersionRecord,
} from "../../server/db.ts";
import { countManuscriptMetrics } from "../books/validation.ts";
import { markdownToCanonicalDocument } from "./markdown-converter.ts";

export type SaveState = { status: "saved" | "dirty" | "saving" | "error"; dirty: boolean; inFlight: boolean; error?: ErrorCode };
type Save = (document: EditorDocument, revision: number) => Promise<Result<{ revision: number }>>;
export type Scheduler = { set: (callback: () => void, delay: number) => unknown; clear: (handle: unknown) => void };
const browserScheduler: Scheduler = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class Autosave {
  private latest: EditorDocument;
  private persisted: string;
  private revision: number;
  private timer: unknown;
  private inFlight = false;
  private invalid: ErrorCode | undefined;
  private failure: ErrorCode | undefined;
  private disposed = false;

  constructor(document: EditorDocument, revision: number, private save: Save,
    private notify: (state: SaveState) => void, private scheduler = browserScheduler,
    private delay = 800, private onSaved?: () => void) {
    this.latest = document; this.persisted = JSON.stringify(document); this.revision = revision;
  }
  snapshot(): SaveState {
    const dirty = !!this.invalid || JSON.stringify(this.latest) !== this.persisted;
    const error = this.failure ?? this.invalid;
    return { dirty, inFlight: this.inFlight, status: error ? "error" : this.inFlight ? "saving" : dirty ? "dirty" : "saved", ...(error ? { error } : {}) };
  }
  private emit() { if (!this.disposed) this.notify(this.snapshot()); }
  private cancel() { if (this.timer !== undefined) this.scheduler.clear(this.timer); this.timer = undefined; }
  private schedule() {
    this.cancel();
    if (this.disposed || this.inFlight || this.invalid || this.failure || !this.snapshot().dirty) return;
    this.timer = this.scheduler.set(() => { this.timer = undefined; void this.flush(); }, this.delay);
  }
  change(document: EditorDocument) {
    this.latest = document; this.invalid = undefined; this.emit(); this.schedule();
  }
  reject(error: ErrorCode) { this.invalid = error; this.cancel(); this.emit(); }
  retry() { if (this.failure === "CONFLICT") return; this.failure = undefined; void this.flush(); }
  async flush(): Promise<void> {
    this.cancel();
    if (this.disposed || this.inFlight || this.invalid || this.failure || !this.snapshot().dirty) return;
    const document = this.latest;
    this.inFlight = true; this.emit();
    let result: Awaited<ReturnType<Save>>;
    try { result = await this.save(document, this.revision); }
    catch { result = { ok: false, code: "UNAVAILABLE" }; }
    if (this.disposed) return;
    this.inFlight = false;
    if (result.ok) {
      this.revision = result.data.revision; this.persisted = JSON.stringify(document);
      this.onSaved?.();
    } else this.failure = result.code;
    this.emit(); this.schedule();
  }
  dispose() { this.disposed = true; this.cancel(); }
}

export type SaveStatus = "saved" | "dirty" | "saving" | "conflict" | "error";

export interface AutosavePayload {
  chapterId: string;
  title?: string;
  markdown: string;
  expectedVersionNumber: number;
  createVersionSnapshot?: boolean;
  versionLabel?: string;
}

export interface AutosaveResponse {
  status: SaveStatus;
  chapter?: ChapterRecord;
  warnings: string[];
  errorMessage?: string;
  serverVersionNumber?: number;
}

export class EditorAutosaveService {
  private readonly repo: BookForgeRepository;

  constructor(repo: BookForgeRepository = getRepository()) {
    this.repo = repo;
  }

  public saveDraft(session: SessionContext, payload: AutosavePayload): AutosaveResponse {
    const current = this.repo.getChapter(session.userId, payload.chapterId);
    if (!current) {
      return {
        status: "error",
        warnings: [],
        errorMessage: "Chapter not found or access denied.",
      };
    }

    if (payload.expectedVersionNumber !== current.versionNumber) {
      return {
        status: "conflict",
        warnings: [],
        serverVersionNumber: current.versionNumber,
        errorMessage: `Conflict detected: local draft based on v${payload.expectedVersionNumber}, but server is at v${current.versionNumber}.`,
      };
    }

    const conversion = markdownToCanonicalDocument(payload.markdown);
    const metrics = countManuscriptMetrics(payload.markdown);

    const updated = this.repo.saveChapterContent(session.userId, payload.chapterId, {
      title: payload.title,
      markdown: payload.markdown,
      canonicalJson: JSON.stringify(conversion.document),
      wordCount: metrics.wordCount,
      characterCount: metrics.characterCount,
      expectedVersionNumber: payload.expectedVersionNumber,
      createVersionSnapshot: payload.createVersionSnapshot ?? true,
      versionLabel: payload.versionLabel ?? null,
    });

    return {
      status: "saved",
      chapter: updated,
      warnings: conversion.warnings,
      serverVersionNumber: updated.versionNumber,
    };
  }

  public listChapterVersions(
    session: SessionContext,
    chapterId: string
  ): ChapterVersionRecord[] {
    return this.repo.listChapterVersions(session.userId, chapterId);
  }

  public previewChapterVersion(
    session: SessionContext,
    versionId: string
  ): ChapterVersionRecord {
    const version = this.repo.getChapterVersion(session.userId, versionId);
    if (!version) {
      throw new AppError("NOT_FOUND", "Chapter version not found.", 404);
    }
    return version;
  }

  /**
   * Phase 10 Requirement: "Restoring a version must not silently destroy newer content."
   * Restores a historical version by creating a brand new version snapshot at the head.
   */
  public restoreChapterVersion(
    session: SessionContext,
    chapterId: string,
    targetVersionId: string
  ): ChapterRecord {
    const chapter = this.repo.getChapter(session.userId, chapterId);
    if (!chapter) {
      throw new AppError("NOT_FOUND", "Chapter not found or access denied.", 404);
    }
    const targetVer = this.repo.getChapterVersion(session.userId, targetVersionId);
    if (!targetVer || targetVer.chapterId !== chapterId) {
      throw new AppError("NOT_FOUND", "Target version not found for this chapter.", 404);
    }

    const metrics = countManuscriptMetrics(targetVer.markdown);
    return this.repo.saveChapterContent(session.userId, chapterId, {
      markdown: targetVer.markdown,
      canonicalJson: targetVer.canonicalJson,
      wordCount: metrics.wordCount,
      characterCount: metrics.characterCount,
      expectedVersionNumber: chapter.versionNumber,
      createVersionSnapshot: true,
      versionLabel: `Restored from Version v${targetVer.versionNumber}`,
      restoredFromId: targetVer.id,
    });
  }
}
