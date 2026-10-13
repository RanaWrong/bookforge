import assert from "node:assert/strict";
import test from "node:test";
import { loadBook, loadBooks, loadChapter, mutateLibrary } from "../src/app/dashboard/actions";

test("every public action blocks production even with development opt-in and forged identity", async () => {
  const previous = { NODE_ENV: process.env.NODE_ENV, BOOKFORGE_DEV_IDENTITY: process.env.BOOKFORGE_DEV_IDENTITY };
  Object.assign(process.env, { NODE_ENV: "production", BOOKFORGE_DEV_IDENTITY: "true" });
  try {
    const results = await Promise.all([
      loadBooks(), loadBook("forged"), loadChapter("forged", "forged"),
      mutateLibrary({ kind: "createBook", title: "Unauthorized", language: "en", userId: "forged" }),
    ]);
    for (const result of results) assert.deepEqual(result, { ok: false, code: "IDENTITY_DISABLED" });
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
  }
});
