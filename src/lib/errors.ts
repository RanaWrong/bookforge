import type { ErrorCode } from "../modules/books/contracts";

export class LibraryError extends Error {
  constructor(public readonly code: ErrorCode) { super(code); }
}
