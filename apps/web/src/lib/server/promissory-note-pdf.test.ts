import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { join } from "node:path";
import {
  buildPromissoryNoteDocumentData,
  buildPromissoryPdfFilename,
  type PromissoryNoteApiRecord,
} from "@/lib/promissory-note-document-data";
import { buildPromissoryPdfHtml } from "@/lib/server/promissory-note-pdf";

const sampleRecord: PromissoryNoteApiRecord = {
  id: "pn-123",
  noteNumber: "PN-20260513-AB12CD",
  debtorName: "أحمد خالد",
  debtorIdNumber: "1010101010",
  issuerName: null,
  amount: "12000.5",
  currency: "SAR",
  dueDate: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-05-13T09:00:00.000Z",
  status: "ACTIVE",
  metadata: {
    issue_city: "جدة",
    payment_city: "الرياض",
    reason: "رسوم طبية",
    creditor_cr: "4030001111",
  },
  case: {
    id: "case-1",
    caseNumber: "CASE-1001",
    patientName: "Ahmed",
  },
};

test("promissory PDF Arabic HTML includes all key fields with RTL layout", () => {
  const noteData = buildPromissoryNoteDocumentData(sampleRecord, {
    language: "ar",
    qrDataUrl: "data:image/png;base64,AAAA",
    verificationBaseUrl: "https://wathiqcare.example",
  });

  const html = buildPromissoryPdfHtml({
    logoSrc: "https://example.com/logo.jpg",
    noteData,
    embeddedArabicFontCss: "@font-face { font-family: 'WathiqArabicPdf'; src: local('Arial'); }",
  });

  assert.match(html, /dir="rtl"/);
  assert.match(html, /font-family:\s*'WathiqArabicPdf'/);
  assert.match(html, /سند لأمر/);
  assert.match(html, /تفاصيل الدائن/);
  assert.match(html, /تفاصيل المدين/);
  assert.match(html, /أحمد خالد/);
  assert.match(html, /رسوم طبية/);
  assert.match(html, /href="https:\/\/wathiqcare\.example\/verify\/pn\/pn-123"/);
  assert.match(html, /PN-20260513-AB12CD/);
});

test("promissory PDF English HTML includes all key fields with LTR layout", () => {
  const noteData = buildPromissoryNoteDocumentData(sampleRecord, {
    language: "en",
    qrDataUrl: "data:image/png;base64,AAAA",
    verificationBaseUrl: "https://wathiqcare.example",
  });

  const html = buildPromissoryPdfHtml({
    logoSrc: "https://example.com/logo.jpg",
    noteData,
    embeddedArabicFontCss: "",
  });

  assert.match(html, /dir="ltr"/);
  assert.match(html, /Promissory Note/);
  assert.match(html, /Creditor Details/);
  assert.match(html, /Debtor Details/);
  assert.match(html, /Amount \(In Words\)/);
  assert.match(html, /href="https:\/\/wathiqcare\.example\/verify\/pn\/pn-123"/);
});

test("promissory filename normalization avoids duplicated PN prefix", () => {
  assert.equal(
    buildPromissoryPdfFilename("PN-20260513-AB12CD", "pn-123", "ar"),
    "PN-20260513-AB12CD-ar.pdf",
  );
  assert.equal(
    buildPromissoryPdfFilename("20260513-AB12CD", "pn-123", "en"),
    "PN-20260513-AB12CD-en.pdf",
  );
});

test("shared promissory data builder keeps preview and PDF field mapping identical", () => {
  const previewData = buildPromissoryNoteDocumentData(sampleRecord, {
    language: "ar",
    verificationBaseUrl: "https://wathiqcare.example",
  });
  const pdfData = buildPromissoryNoteDocumentData(sampleRecord, {
    language: "ar",
    verificationBaseUrl: "https://wathiqcare.example",
  });

  assert.deepEqual(pdfData, previewData);
});

test("promissory print stylesheet keeps print controls and page-break protection", async () => {
  const cssPath = join(process.cwd(), "src", "styles", "promissory-note.css");
  const css = await readFile(cssPath, "utf8");

  assert.match(css, /@media print/);
  assert.match(css, /\.no-print\s*\{/);
  assert.match(css, /page-break-inside:\s*avoid/);
});
