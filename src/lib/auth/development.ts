import "server-only";
import { getDb } from "../db/client";
import { LibraryError } from "../../modules/books/validation";

export function assertDevelopmentIdentity(env: { NODE_ENV?: string; BOOKFORGE_DEV_IDENTITY?: string }): void {
  if (env.NODE_ENV !== "development" || env.BOOKFORGE_DEV_IDENTITY !== "true") throw new LibraryError("IDENTITY_DISABLED");
}

// NOT authentication. Every visitor shares this local development identity.
// This adapter cannot run in production, even if the opt-in flag is set.
export async function requireIdentity(): Promise<string> {
  assertDevelopmentIdentity(process.env);
  const user = await getDb().user.upsert({
    where: { email: "developer@bookforge.local" },
    create: { email: "developer@bookforge.local", name: "Local developer" },
    update: {},
    select: { id: true },
  });
  return user.id;
}
