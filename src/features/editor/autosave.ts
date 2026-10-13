import type { ErrorCode, Result } from "../../modules/books/contracts";
import type { EditorDocument } from "./types";

export type SaveState = { status: "saved" | "dirty" | "saving" | "error"; dirty: boolean; inFlight: boolean; error?: ErrorCode };
type Save = (document: EditorDocument, revision: number) => Promise<Result<{ revision: number }>>;
export type Scheduler = { set: (callback: () => void, delay: number) => unknown; clear: (handle: unknown) => void };
const browserScheduler: Scheduler = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** One request at a time; edits made during a save stay dirty and are queued.
 * A failure pauses saving until retry. Conflicts require explicit reload/merge.
 * dispose cancels queued work and suppresses callbacks from an old chapter.
 */
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
