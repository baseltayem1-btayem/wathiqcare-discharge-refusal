/**
 * Blank-form PDF intake.
 *
 * Loads a blank approved PDF, validates that it is safe to process, and runs
 * the deterministic extraction pipeline. No PHI is accepted at this stage.
 */

import crypto from "node:crypto";
import { PDFDocument } from "pdf-lib";
import { extractTextBlocksFromPdf } from "../extraction/extract-text-blocks";
import { detectWritingLines } from "../extraction/detect-writing-lines";
import { detectCheckboxes } from "../extraction/detect-checkboxes";
import { detectSignatureRegions } from "../extraction/detect-signature-regions";
import { detectPageColumns } from "../extraction/detect-page-columns";
import type { ExtractedDocumentLayout } from "../extraction/document-layout-types";

export type PdfInspectionResult = {
  ok: true;
  sha256: string;
  sizeBytes: number;
  pageCount: number;
  pageSizePoints: { width: number; height: number };
  layout: ExtractedDocumentLayout;
};

export type PdfInspectionError = {
  ok: false;
  code: string;
  message: string;
};

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

export async function inspectBlankPdf(
  pdfBytes: Uint8Array,
): Promise<PdfInspectionResult | PdfInspectionError> {
  if (pdfBytes.byteLength === 0) {
    return { ok: false, code: "EMPTY_PDF", message: "PDF bytes are empty." };
  }

  // Reject encrypted PDFs at intake.
  try {
    const doc = await PDFDocument.load(pdfBytes, { updateMetadata: false, ignoreEncryption: false });
    if (doc.isEncrypted) {
      return { ok: false, code: "ENCRYPTED_PDF", message: "Encrypted PDFs are not accepted." };
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.toLowerCase().includes("encrypt")) {
      return { ok: false, code: "ENCRYPTED_PDF", message: "Encrypted PDFs are not accepted." };
    }
    return { ok: false, code: "PARSE_ERROR", message: `Unable to parse PDF: ${message}` };
  }

  let layout: ExtractedDocumentLayout;
  try {
    layout = await extractTextBlocksFromPdf(pdfBytes);
    layout = detectWritingLines(layout);
    layout = detectCheckboxes(layout);
    layout = detectSignatureRegions(layout);
    layout = detectPageColumns(layout);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, code: "EXTRACTION_ERROR", message: `Layout extraction failed: ${message}` };
  }

  return {
    ok: true,
    sha256: sha256(pdfBytes),
    sizeBytes: pdfBytes.byteLength,
    pageCount: layout.pageCount,
    pageSizePoints: layout.pageSizePoints,
    layout,
  };
}
