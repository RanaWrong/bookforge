import { mutateLibrary } from "../../app/dashboard/actions";
import type { Result } from "../../modules/books/contracts";
import type { EditorDocument } from "./types";

export async function saveDocument(bookId: string, chapterId: string, document: EditorDocument, revision: number): Promise<Result<{ revision: number }>> {
  const result = await mutateLibrary({ kind: "saveDocument", bookId, chapterId, document, revision });
  if (!result.ok) return result;
  return result.data.revision === undefined ? { ok: false, code: "UNAVAILABLE" } : { ok: true, data: { revision: result.data.revision } };
}
