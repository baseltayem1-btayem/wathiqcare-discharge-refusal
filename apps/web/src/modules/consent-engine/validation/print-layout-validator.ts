/**
 * Static print-layout validator for the legal-grade HTML preview.
 *
 * Verifies @page declaration, A4 sizing hints, and per-block page-break
 * protections needed to keep risks, declarations, warnings, legal items,
 * and the audit footer from splitting in unsafe ways.
 */

import {
  summarizeSection,
  type ValidationCheck,
  type ValidationSection,
} from "./validation-report";

export interface PrintLayoutValidationInput {
  html: string;
}

const PROTECTED_CLASSES = [
  ".lg-section",
  ".lg-risk",
  ".lg-signature-block",
  ".lg-audit-footer",
  ".lg-declaration",
  ".lg-warning",
  ".lg-legal-item",
];

export function validatePrintLayout(
  input: PrintLayoutValidationInput,
): ValidationSection {
  const html = input.html ?? "";
  const checks: ValidationCheck[] = [];

  checks.push({
    id: "print.page-rule",
    label: "@page rule present",
    status: /@page\b/.test(html) ? "PASS" : "FAIL",
  });

  checks.push({
    id: "print.page-a4",
    label: "@page size: A4 declared",
    status: /@page\s*{[^}]*size:\s*A4/i.test(html) ? "PASS" : "WARNING",
    detail: "Looking for explicit `size: A4` in @page rule.",
  });

  checks.push({
    id: "print.media-block",
    label: "@media print block present",
    status: /@media\s+print/.test(html) ? "PASS" : "WARNING",
  });

  // Per-class page-break protections
  for (const cls of PROTECTED_CLASSES) {
    const rule = new RegExp(
      `${cls.replace(".", "\\.")}\\s*{[^}]*(page-break-inside\\s*:\\s*avoid|break-inside\\s*:\\s*avoid)`,
      "s",
    );
    checks.push({
      id: `print.break.${cls.slice(1)}`,
      label: `${cls} carries break-inside: avoid`,
      status: rule.test(html) ? "PASS" : "WARNING",
    });
  }

  // Audit footer present at all (no orphaning means at least it exists)
  checks.push({
    id: "print.audit-footer.present",
    label: ".lg-audit-footer element exists in HTML",
    status: /class="lg-audit-footer/.test(html) ? "PASS" : "FAIL",
  });

  // Section headers shouldn't appear at the bottom of a page alone (heuristic:
  // ensure renderer wraps headers + first block together — i.e. section rule
  // exists and applies). Already covered above; flag explicitly for the report.
  checks.push({
    id: "print.orphan.heading-guard",
    label: "Section-level page-break-inside avoidance present",
    status: /\.lg-section\s*{[^}]*page-break-inside:\s*avoid/s.test(html)
      ? "PASS"
      : "WARNING",
  });

  return summarizeSection("print", "Print / page break hardening", checks);
}
