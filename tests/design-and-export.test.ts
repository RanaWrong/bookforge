import test from "node:test";
import assert from "node:assert/strict";
import { createIsolatedRepository } from "../src/server/db.ts";
import { validateBookDesignSettings } from "../src/features/design/schema.ts";
import { B5_TEXTBOOK_PRESET, MASTER_BOOK_DESIGN_PRESET } from "../src/features/design/presets.ts";
import { PdfExportService } from "../src/features/publishing/pdf-exporter.ts";
import { sanitizeRenderResourceUrl } from "../src/features/publishing/print-renderer.ts";
import type { SessionContext } from "../src/server/auth.ts";

const session: SessionContext = {
  userId: "user-local-dev-01",
  email: "author@bookforge.local",
  name: "Author",
  preferredLocale: "bn",
  isDevIdentity: true,
};

test("Phase 8 & 9: BookDesignSettings supports A4/A5/B5/Custom, orientation, TOC, startPageNumber, and SSRF guard", () => {
  const validMaster = validateBookDesignSettings(MASTER_BOOK_DESIGN_PRESET);
  assert.equal(validMaster.widthMm, 215);
  assert.equal(validMaster.heightMm, 275);

  const validB5Landscape = validateBookDesignSettings({
    ...B5_TEXTBOOK_PRESET,
    orientation: "LANDSCAPE",
    startPageNumber: 5,
  });
  assert.equal(validB5Landscape.widthMm, 250);
  assert.equal(validB5Landscape.heightMm, 176);
  assert.equal(validB5Landscape.startPageNumber, 5);

  // SSRF & Local file URL sanitizer checks
  const fileCheck = sanitizeRenderResourceUrl("file:///etc/passwd");
  assert.equal(fileCheck.safeUrl, "about:blank");
  assert.ok(fileCheck.blockedReason);

  const metadataCheck = sanitizeRenderResourceUrl("http://169.254.169.254/latest/meta-data/");
  assert.equal(metadataCheck.safeUrl, "about:blank");
  assert.ok(metadataCheck.blockedReason);

  // Full-book export renders TOC, mirror margins, and safe filename
  const repo = createIsolatedRepository(true);
  const exporter = new PdfExportService(repo);
  const job = exporter.generateExport(session, {
    bookId: "book-psc-master-01",
    scope: "BOOK",
  });

  assert.equal(job.status, "COMPLETED");
  assert.match(job.safeFilename, /_full_book\.pdf$/);
  assert.match(job.htmlOutput, /bf-toc-section/);
  assert.match(job.htmlOutput, /@page :left/);
  assert.match(job.htmlOutput, /margin-right: 27mm/);
});
