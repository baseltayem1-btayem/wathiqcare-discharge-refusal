/**
 * Static signature-zone layout validator for the legal-grade HTML preview.
 * Verifies presence and integrity of signature blocks and that they carry
 * page-break-inside: avoid rules so they are not split across pages.
 */

import {
  summarizeSection,
  type ValidationCheck,
  type ValidationSection,
} from "./validation-report";

export interface SignatureValidationInput {
  html: string;
}

export function validateSignatureLayout(
  input: SignatureValidationInput,
): ValidationSection {
  const html = input.html ?? "";
  const checks: ValidationCheck[] = [];

  // Container
  const containerPresent = /class="lg-signatures"/.test(html);
  checks.push({
    id: "sig.container.present",
    label: "Signature container .lg-signatures present",
    status: containerPresent ? "PASS" : "FAIL",
  });

  // At least one signature block
  const blockMatches = html.match(/class="lg-signature-block/g) ?? [];
  checks.push({
    id: "sig.blocks.count",
    label: "At least one .lg-signature-block present",
    status: blockMatches.length > 0 ? "PASS" : "FAIL",
    detail: `count=${blockMatches.length}`,
  });

  // Page-break protection on signature blocks
  const blockBreakProtected =
    /\.lg-signature-block\s*{[^}]*page-break-inside:\s*avoid/.test(html) ||
    /\.lg-signature-block\s*{[^}]*break-inside:\s*avoid/.test(html);
  checks.push({
    id: "sig.blocks.break-protected",
    label: "Signature block CSS includes page-break-inside: avoid",
    status: blockBreakProtected ? "PASS" : "WARNING",
    detail: blockBreakProtected
      ? undefined
      : "Could not find page-break-inside: avoid in .lg-signature-block rule.",
  });

  // Container also break-protected
  const containerBreakProtected =
    /\.lg-signatures\s*{[^}]*page-break-inside:\s*avoid/.test(html) ||
    /\.lg-signatures\s*{[^}]*break-inside:\s*avoid/.test(html);
  checks.push({
    id: "sig.container.break-protected",
    label: "Signature container CSS includes page-break-inside: avoid",
    status: containerBreakProtected ? "PASS" : "WARNING",
  });

  // Minimum height baseline (long names should not crush block)
  const minHeightPresent = /\.lg-signature-block\s*{[^}]*min-height:/.test(html);
  checks.push({
    id: "sig.blocks.min-height",
    label: "Signature block has min-height baseline",
    status: minHeightPresent ? "PASS" : "WARNING",
  });

  return summarizeSection("signatures", "Signature zone stability", checks);
}
