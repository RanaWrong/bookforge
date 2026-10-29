import "server-only";
import { AppError } from "../errors.ts";
import { getDb } from "../db/client.ts";
import type { SessionContext } from "../../server/auth.ts";

/**
 * Mirror of the `WorkspaceRole` enum from `prisma/schema.prisma`.
 * Defined locally so the file does not depend on generated Prisma output
 * that may not include this enum yet (pre-migration environments).
 */
export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";

/**
 * Role hierarchy — higher index means more privilege.
 * OWNER can do everything an EDITOR or VIEWER can do.
 * EDITOR can do everything a VIEWER can do.
 */
const ROLE_RANK: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
};

/**
 * Checks that `session.userId` is a member of `workspaceId` with at least
 * `requiredRole` access. Throws `AppError("FORBIDDEN", …, 403)` when:
 *   - the user is not a member of the workspace at all, or
 *   - the user's role ranks lower than `requiredRole`.
 *
 * Callers that need a specific role should prefer the convenience wrappers
 * (`requireEditorOrOwner`, `requireOwner`) for readability.
 */
export async function checkPermission(
  session: SessionContext,
  workspaceId: string,
  requiredRole: WorkspaceRole
): Promise<void> {
  const db = getDb();

  const membership = await db.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: session.userId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new AppError(
      "FORBIDDEN",
      "You do not have access to this workspace.",
      403
    );
  }

  const memberRole = membership.role as WorkspaceRole;

  if (ROLE_RANK[memberRole] < ROLE_RANK[requiredRole]) {
    throw new AppError(
      "FORBIDDEN",
      `This action requires the ${requiredRole} role or higher.`,
      403
    );
  }
}

/**
 * Convenience wrapper — asserts the caller is at least an EDITOR.
 * Viewers are rejected; Editors and Owners are allowed through.
 */
export async function requireEditorOrOwner(
  session: SessionContext,
  workspaceId: string
): Promise<void> {
  return checkPermission(session, workspaceId, "EDITOR");
}

/**
 * Convenience wrapper — asserts the caller is the workspace OWNER.
 * Only Owners are allowed through; Editors and Viewers are rejected.
 */
export async function requireOwner(
  session: SessionContext,
  workspaceId: string
): Promise<void> {
  return checkPermission(session, workspaceId, "OWNER");
}
