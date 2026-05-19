/**
 * Static RTL / Arabic rendering validator for the legal-grade HTML preview.
 *
 * This is a heuristic, internal-only check. It does NOT claim Arabic
 * production readiness. It only verifies that the HTML preview emits the
 * structural and CSS hints required for Arabic / mixed-language rendering.
 */

import {
  expectAllSubstrings,
  expectSubstring,
  summarizeSection,
  type ValidationCheck,
  type ValidationSection,
} from "./validation-report";

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export interface RtlValidationInput {
  html: string;
  /** Optional: language used to render the preview (en | ar | bilingual). */
  language?: string;
}

export function validateRtlRendering(input: RtlValidationInput): ValidationSection {
  const html = input.html ?? "";
  const language = (input.language ?? "bilingual").toLowerCase();

  const checks: ValidationCheck[] = [];

  // 1) Arabic text present (only meaningful when language != "en")
  if (language === "en") {
    checks.push({
      id: "rtl.lang.en-only",
      label: "English-only render skips Arabic checks",
      status: "SKIPPED",
      detail: "language=en; RTL checks intentionally skipped.",
    });
  } else {
    checks.push(
      ARABIC_RANGE.test(html)
        ? { id: "rtl.arabic-glyphs.present", label: "Arabic glyphs present in HTML", status: "PASS" }
        : {
            id: "rtl.arabic-glyphs.present",
            label: "Arabic glyphs present in HTML",
            status: "FAIL",
            detail: "No Arabic-range characters detected in rendered HTML.",
          },
    );
  }

  // 2) Direction hints
  checks.push(
    /dir\s*=\s*"rtl"/i.test(html) || /direction:\s*rtl/i.test(html)
      ? { id: "rtl.dir.rtl-present", label: "dir=\"rtl\" or direction:rtl present", status: language === "en" ? "SKIPPED" : "PASS" }
      : {
          id: "rtl.dir.rtl-present",
          label: "dir=\"rtl\" or direction:rtl present",
          status: language === "en" ? "SKIPPED" : "WARNING",
          detail: "No explicit RTL direction attribute or CSS rule found.",
        },
  );

  // 3) lang attribute for accessibility / shaping hints
  checks.push(
    /\blang\s*=\s*"ar/i.test(html)
      ? { id: "rtl.lang.ar-attr", label: "lang=\"ar\" attribute present for Arabic regions", status: language === "en" ? "SKIPPED" : "PASS" }
      : {
          id: "rtl.lang.ar-attr",
          label: "lang=\"ar\" attribute present for Arabic regions",
          status: language === "en" ? "SKIPPED" : "WARNING",
          detail: "Arabic regions should carry lang=\"ar\" for shaping and a11y.",
        },
  );

  // 4) Bilingual structure: both EN and AR markers
  if (language === "bilingual") {
    checks.push(
      expectAllSubstrings(
        "rtl.bilingual.markers",
        "Bilingual EN+AR class markers present",
        html,
        ["lg-bilingual", "lg-lang-ar"],
      ),
    );
  }

  // 5) Punctuation safety: comma / period rendered with Arabic context tolerable
  //    (heuristic — flag mixed quotation collisions)
  if (language !== "en") {
    const arBlocks = html.match(/lang="ar"[^>]*>[^<]*</g) ?? [];
    const punctIssue = arBlocks.some((b) => /[\u201c\u201d]/.test(b));
    checks.push({
      id: "rtl.punctuation.quotes",
      label: "Arabic blocks do not mix curly Latin quotes",
      status: punctIssue ? "WARNING" : "PASS",
      detail: punctIssue
        ? "Found Latin curly quotation marks inside Arabic-tagged blocks; review legal wording."
        : undefined,
    });
  }

  // 6) Print-safe RTL: @page rule + section rules retained
  checks.push(
    expectSubstring("rtl.print.page-rule", "@page A4 declaration retained", html, "@page"),
  );

  return summarizeSection("rtl", "RTL / Arabic rendering", checks);
}
