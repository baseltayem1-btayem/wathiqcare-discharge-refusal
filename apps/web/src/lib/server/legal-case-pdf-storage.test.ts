import assert from "node:assert/strict";
import { existsSync } from "node:fs";
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

test("persistPdfBinary: local file write is verified before metadata return", async () => {
  const previousRoot = process.env.PDF_STORAGE_ROOT;
  const previousMode = process.env.PDF_BINARY_STORAGE_MODE;
  const previousVercel = process.env.VERCEL;
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "pdf-persist-test-"));

  try {
    process.env.PDF_STORAGE_ROOT = tempRoot;
    process.env.PDF_BINARY_STORAGE_MODE = "local_file";
    delete process.env.VERCEL;

    const persisted = await __casePdfStorageInternals.persistPdfBinary({
      tenantId: "tenant-1",
      caseId: "case-1",
      version: 7,
      fileName: "report.pdf",
      pdfBuffer: Buffer.from("sample-pdf-content"),
      reportPayload: { a: 1 },
    });

    const relativePath = persisted.storagePath.replace(/^local:\/\//, "");
    const absolutePath = path.join(tempRoot, relativePath);
    assert.equal(existsSync(absolutePath), true);

    const availability = await __casePdfStorageInternals.getDocumentBinaryAvailability({
      storagePath: persisted.storagePath,
      payloadJson: persisted.payloadJson,
    });

    assert.equal(availability.available, true);
  } finally {
    if (previousRoot) {
      process.env.PDF_STORAGE_ROOT = previousRoot;
    } else {
      delete process.env.PDF_STORAGE_ROOT;
    }

    if (previousMode) {
      process.env.PDF_BINARY_STORAGE_MODE = previousMode;
    } else {
      delete process.env.PDF_BINARY_STORAGE_MODE;
    }

    if (previousVercel) {
      process.env.VERCEL = previousVercel;
    } else {
      delete process.env.VERCEL;
    }

    await rm(tempRoot, { recursive: true, force: true });
  }
});

test("persistPdfBinary: local_file mode is blocked on Vercel runtime", async () => {
  const previousMode = process.env.PDF_BINARY_STORAGE_MODE;
  const previousVercel = process.env.VERCEL;

  try {
    process.env.PDF_BINARY_STORAGE_MODE = "local_file";
    process.env.VERCEL = "1";

    await assert.rejects(
      __casePdfStorageInternals.persistPdfBinary({
        tenantId: "tenant-1",
        caseId: "case-1",
        version: 1,
        fileName: "blocked.pdf",
        pdfBuffer: Buffer.from("data"),
        reportPayload: {},
      }),
      /external object storage/i,
    );
  } finally {
    if (previousMode) {
      process.env.PDF_BINARY_STORAGE_MODE = previousMode;
    } else {
      delete process.env.PDF_BINARY_STORAGE_MODE;
    }

    if (previousVercel) {
      process.env.VERCEL = previousVercel;
    } else {
      delete process.env.VERCEL;
    }
  }
});

test("runtime target: detects local Windows when not on Vercel", () => {
  const previousVercel = process.env.VERCEL;
  const originalPlatform = process.platform;

  try {
    delete process.env.VERCEL;
    Object.defineProperty(process, "platform", { value: "win32" });

    assert.equal(__casePdfStorageInternals.detectPdfRuntimeTarget(), "local_windows");
  } finally {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    if (previousVercel) {
      process.env.VERCEL = previousVercel;
    } else {
      delete process.env.VERCEL;
    }
  }
});

test("configured executable path: ignores Windows path on Vercel production", () => {
  const previousPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  try {
    process.env.PUPPETEER_EXECUTABLE_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

    assert.equal(__casePdfStorageInternals.getConfiguredPuppeteerExecutablePath("production"), null);
    assert.equal(__casePdfStorageInternals.getConfiguredPuppeteerExecutablePath("preview"), null);
  } finally {
    if (previousPath) {
      process.env.PUPPETEER_EXECUTABLE_PATH = previousPath;
    } else {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
    }
  }
});

test("configured executable path: keeps valid Windows path for local Windows", () => {
  const previousPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  try {
    process.env.PUPPETEER_EXECUTABLE_PATH = process.execPath;

    assert.equal(
      __casePdfStorageInternals.getConfiguredPuppeteerExecutablePath("local_windows"),
      process.execPath,
    );
  } finally {
    if (previousPath) {
      process.env.PUPPETEER_EXECUTABLE_PATH = previousPath;
    } else {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
    }
  }
});
