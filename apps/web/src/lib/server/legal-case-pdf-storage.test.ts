import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { __casePdfStorageInternals } from "./legal-case-pdf-service";

test("pdf binary availability: inline payload is available", async () => {
  const availability = await __casePdfStorageInternals.getDocumentBinaryAvailability({
    storagePath: null,
    payloadJson: {
      pdf_base64: Buffer.from("hello").toString("base64"),
    },
  });

  assert.equal(availability.available, true);
  assert.equal(availability.reason, null);
});

test("pdf binary availability: db-inline storage without base64 is unavailable", async () => {
  const availability = await __casePdfStorageInternals.getDocumentBinaryAvailability({
    storagePath: "db-inline://payload",
    payloadJson: {},
  });

  assert.equal(availability.available, false);
  assert.equal(availability.reason, "db_inline_payload_missing");
});

test("pdf binary availability: local storage path resolves and is available", async () => {
  const previousRoot = process.env.PDF_STORAGE_ROOT;
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pdf-storage-test-"));

  try {
    process.env.PDF_STORAGE_ROOT = tempRoot;

    const relativePath = "tenant-1/case-1/v1/sample.pdf";
    const absolutePath = path.join(tempRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from("pdf-content"));

    const availability = await __casePdfStorageInternals.getDocumentBinaryAvailability({
      storagePath: `local://${relativePath}`,
      payloadJson: {},
    });

    assert.equal(availability.available, true);
    assert.equal(availability.reason, null);
  } finally {
    if (previousRoot) {
      process.env.PDF_STORAGE_ROOT = previousRoot;
    } else {
      delete process.env.PDF_STORAGE_ROOT;
    }
    await rm(tempRoot, { recursive: true, force: true });
  }
});
