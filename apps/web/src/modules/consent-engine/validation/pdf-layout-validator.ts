/**
 * Top-level PDF / HTML preview layout validator. Aggregates structural
 * presence checks (title, sections, audit footer, evidence metadata block
 * if rendered) into a single section. Pure static analysis.
 */

import {
  expectSubstring,
  summarizeSection,
  type ValidationCheck,
  type ValidationSection,
} from "./validation-report";

export interface PdfLayoutValidationInput {
  html: string;
  /** Optional evidence-package metadata expected to be reflected somewhere. */
  expectedEvidenceId?: string;
  expectedAuditHash?: string;
}

export function validatePdfLayout(
  input: PdfLayoutValidationInput,
): ValidationSection {
  const html = input.html ?? "";
  const checks: ValidationCheck[] = [];

  checks.push({
    id: "layout.html-shell",
    label: "<html> shell present",
    status: /<html[\s>]/i.test(html) ? "PASS" : "FAIL",
  });
  checks.push({
    id: "layout.head-title",
    label: "<title> tag present",
    status: /<title>[\s\S]*?<\/title>/i.test(html) ? "PASS" : "WARNING",
  });
  checks.push({
    id: "layout.body",
    label: "<body> shell present",
    status: /<body[\s>]/i.test(html) ? "PASS" : "FAIL",
  });

  checks.push(
    expectSubstring(
      "layout.style.embedded",
      "Embedded <style> tag present (no external CSS dependency)",
      html,
      "<style",
    ),
  );

  checks.push({
    id: "layout.no-remote-stylesheets",
    label: "No remote <link rel=\"stylesheet\"> tags",
    status: /<link\s+[^>]*rel="stylesheet"[^>]*href="https?:/i.test(html)
      ? "WARNING"
      : "PASS",
  });

  checks.push({
    id: "layout.no-remote-scripts",
    label: "No remote <script src=\"http(s)://...\"> tags",
    status: /<script[^>]*src="https?:/i.test(html) ? "WARNING" : "PASS",
  });

  checks.push(
    expectSubstring("layout.audit-footer", ".lg-audit-footer rendered", html, "lg-audit-footer"),
  );

  if (input.expectedAuditHash) {
    const shortHash = input.expectedAuditHash.slice(0, 12);
    checks.push({
      id: "layout.audit-hash.embedded",
      label: "Audit hash (first 12 chars) appears in rendered HTML",
      status: html.includes(shortHash) ? "PASS" : "WARNING",
      detail: html.includes(shortHash)
        ? undefined
        : "Audit-hash prefix not found in HTML; visual evidence may rely on a different display strategy.",
    });
  }

  return summarizeSection("layout", "PDF / HTML layout integrity", checks);
}
