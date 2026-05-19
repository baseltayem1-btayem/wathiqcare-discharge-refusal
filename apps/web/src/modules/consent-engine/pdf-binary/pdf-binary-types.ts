/**
 * Types for the internal-only deterministic PDF binary preview pipeline.
 *
 * NOT a production PDF renderer. This module exists as a parallel,
 * feature-gated proof-of-concept around the dynamic-consent engine's
 * legal-grade HTML preview and evidence package.
 */

import type { EvidencePackage } from "../pdf-evidence/evidence-types";

export type PdfPageFormat = "A4" | "Letter";

export interface PdfBinaryRendererCapability {
  /** True if a server-side HTML-to-PDF binary renderer is usable in this runtime. */
  available: boolean;
  /** Stable machine-readable code describing why (when unavailable). */
  reasonCode?:
    | "OK"
    | "PUPPETEER_CORE_MISSING"
    | "CHROMIUM_MISSING"
    | "EXECUTABLE_PATH_UNAVAILABLE"
    | "UNKNOWN_ERROR";
  /** Human-readable detail (safe for logs and the 501 payload). */
  detail: string;
  /** Renderer identifier when available, e.g. "puppeteer-core+sparticuz-chromium". */
  rendererId?: string;
}

export interface PdfBinaryDeterministicMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
}

export interface PdfBinaryPreviewInput {
  html: string;
  evidencePackage: EvidencePackage;
  /** Page format, default "A4". */
  format?: PdfPageFormat;
}

export interface PdfBinaryPreviewResult {
  buffer: Buffer;
  contentType: "application/pdf";
  filename: string;
  byteLength: number;
  rendererId: string;
  metadata: PdfBinaryDeterministicMetadata;
}
