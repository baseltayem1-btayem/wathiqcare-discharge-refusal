/**
 * Field-addressed overlay helpers.
 *
 * Shared browser-side font loading, glyph-coverage validation, and field-box
 * text fitting for the AcroForm field-addressed PDF renderer.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const ARABIC_FONT_FAMILY = '"WathiqOverlayArabic"';
export const LATIN_FONT_FAMILY = '"WathiqOverlaySans"';

export type TextFitMode = "single" | "multi";

export type FieldFitSpec = {
  mode: TextFitMode;
  minFontSize: number;
  maxFontSize: number;
  maxLines?: number;
  lineHeight: number;
};

/**
 * JavaScript source (not TypeScript) that is injected into the Puppeteer page
 * to load fonts, validate coverage, and fit text to field boxes before the
 * overlay is screenshotted.
 */
export function buildOverlayPrepareScript(args: {
  arabicStrings: string[];
  latinStrings: string[];
}): string {
  const arabicTest = mergeUniqueTestStrings(args.arabicStrings);
  const latinTest = mergeUniqueTestStrings(args.latinStrings);

  return `
    (async () => {
      const ARABIC_FONT = ${ARABIC_FONT_FAMILY};
      const LATIN_FONT = ${LATIN_FONT_FAMILY};
      const FONT_SIZE = "16px";
      const FONT_WEIGHT = "400";

      function exposeError(message) {
        if (!window.__overlayErrors) window.__overlayErrors = [];
        window.__overlayErrors.push(message);
      }

      // Load and wait for the embedded Unicode fonts. Use the actual rendered
      // strings as the test corpus so the browser resolves glyph coverage for
      // every code point we need.
      try {
        if (document.fonts) {
          await document.fonts.load(\`\${FONT_WEIGHT} \${FONT_SIZE} \${LATIN_FONT}\`);
          await document.fonts.load(\`\${FONT_WEIGHT} \${FONT_SIZE} \${ARABIC_FONT}\`);
          if (${JSON.stringify(arabicTest)}.length > 0) {
            await document.fonts.load(\`\${FONT_WEIGHT} \${FONT_SIZE} \${ARABIC_FONT}\`, ${JSON.stringify(arabicTest)});
          }
          if (${JSON.stringify(latinTest)}.length > 0) {
            await document.fonts.load(\`\${FONT_WEIGHT} \${FONT_SIZE} \${LATIN_FONT}\`, ${JSON.stringify(latinTest)});
          }
          await document.fonts.ready;
        }
      } catch (fontLoadError) {
        exposeError("font-load-failure:" + (fontLoadError && fontLoadError.message ? fontLoadError.message : "unknown"));
      }

      // Verify glyph coverage without exposing field values in diagnostics.
      if (document.fonts) {
        const arabicSample = ${JSON.stringify(arabicTest)};
        const latinSample = ${JSON.stringify(latinTest)};
        if (arabicSample.length > 0) {
          const arabicOk = document.fonts.check(\`\${FONT_WEIGHT} \${FONT_SIZE} \${ARABIC_FONT}\`, arabicSample);
          if (!arabicOk) {
            exposeError("arabic-font-coverage-failure");
          }
        }
        if (latinSample.length > 0) {
          const latinOk = document.fonts.check(\`\${FONT_WEIGHT} \${FONT_SIZE} \${LATIN_FONT}\`, latinSample);
          if (!latinOk) {
            exposeError("latin-font-coverage-failure");
          }
        }
      }

      // Give the browser at least two animation frames after font decoding so
      // glyph rasterization has settled before capture.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // Field-box text fitting: measure rendered text using the actual selected
      // font and reduce font size until the value fits inside the mapped
      // rectangle. Never truncate identity fields with ellipsis.
      const fitElements = Array.from(document.querySelectorAll("[data-fit]"));
      for (const el of fitElements) {
        const element = el;
        const mode = element.getAttribute("data-fit");
        const minFontSize = parseFloat(element.getAttribute("data-min-font-size") || "7");
        const maxFontSize = parseFloat(element.getAttribute("data-max-font-size") || "11");
        const lineHeight = parseFloat(element.getAttribute("data-line-height") || "1.25");
        const maxLinesAttr = element.getAttribute("data-max-lines");
        const maxLines = maxLinesAttr ? parseInt(maxLinesAttr, 10) : undefined;

        const style = window.getComputedStyle(element);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        const availableWidth = element.clientWidth - paddingLeft - paddingRight;
        const availableHeight = element.clientHeight - paddingTop - paddingBottom;

        if (availableWidth <= 0 || availableHeight <= 0) continue;

        let low = minFontSize;
        let high = maxFontSize;
        let chosen = minFontSize;

        if (mode === "single") {
          // Measure as a single unwrapped line so the width check is accurate.
          element.style.whiteSpace = "nowrap";
          // Binary search the largest font size that does not overflow horizontally.
          while (high - low > 0.25) {
            const mid = (low + high) / 2;
            element.style.fontSize = mid + "px";
            // Force a layout flush.
            const overflow = element.scrollWidth > element.clientWidth;
            if (overflow) {
              high = mid;
            } else {
              chosen = mid;
              low = mid;
            }
          }
          element.style.fontSize = chosen + "px";
        } else if (mode === "multi") {
          // Binary search the largest font size that fits vertically within the
          // box, respecting max-lines if specified.
          const measureHeight = () => {
            element.style.fontSize = chosen + "px";
            if (maxLines !== undefined && maxLines > 0) {
              const lineHeightPx = chosen * lineHeight;
              const maxAllowedHeight = maxLines * lineHeightPx;
              return Math.min(element.scrollHeight - paddingTop - paddingBottom, maxAllowedHeight);
            }
            return element.scrollHeight - paddingTop - paddingBottom;
          };

          while (high - low > 0.25) {
            const mid = (low + high) / 2;
            chosen = mid;
            const usedHeight = measureHeight();
            if (usedHeight > availableHeight) {
              high = mid;
            } else {
              low = mid;
            }
          }
          chosen = low;
          element.style.fontSize = chosen + "px";
        }
      }

      // Final layout flush after fitting.
      document.body.offsetHeight;
    })();
  `;
}

function mergeUniqueTestStrings(values: string[]): string {
  const seen = new Set<string>();
  const chars: string[] = [];
  for (const value of values) {
    if (!value) continue;
    for (const char of value) {
      if (!seen.has(char)) {
        seen.add(char);
        chars.push(char);
      }
    }
  }
  return chars.join("");
}

/**
 * Extract unique Arabic and Latin test strings from the rendered value map for
 * font coverage validation. PHI is never logged; only a deduplicated character
 * set is passed to the browser for coverage checking.
 */
export function extractCoverageTestStrings(values: Record<string, { kind: "text"; value: string } | unknown>): {
  arabic: string[];
  latin: string[];
} {
  const arabic: string[] = [];
  const latin: string[] = [];

  for (const entry of Object.values(values)) {
    if (!entry || typeof entry !== "object" || !("kind" in entry) || (entry as { kind: string }).kind !== "text") {
      continue;
    }
    const textEntry = entry as { kind: "text"; value: string };
    const value = textEntry.value;
    if (!value) continue;
    if (/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value)) {
      arabic.push(value);
    } else {
      latin.push(value);
    }
  }

  return { arabic, latin };
}

/**
 * Build an inline CSS @font-face block that resolves the embedded Arabic and
 * Latin fonts from the monorepo node_modules tree. Tries multiple candidate
 * roots so the renderer works regardless of whether the runtime cwd is the
 * workspace root, apps/web, or a nested process directory.
 */
export function buildInlinePdfFontFaceCss(): string {
  const candidates = [
    path.join("@fontsource", "ibm-plex-sans-arabic", "files", "ibm-plex-sans-arabic-arabic-400-normal.woff2"),
    path.join("@fontsource", "ibm-plex-sans-arabic", "files", "ibm-plex-sans-arabic-arabic-700-normal.woff2"),
    path.join("@fontsource", "tajawal", "files", "tajawal-arabic-400-normal.woff2"),
    path.join("@fontsource", "tajawal", "files", "tajawal-arabic-700-normal.woff2"),
  ];

  const resolveBase64 = (relativePath: string): string => {
    const absoluteCandidates = [
      path.join(process.cwd(), "node_modules", relativePath),
      path.join(process.cwd(), "..", "..", "node_modules", relativePath),
      path.join(process.cwd(), "..", "node_modules", relativePath),
      path.resolve(process.cwd(), "..", "..", "node_modules", relativePath),
      path.resolve(process.cwd(), "..", "node_modules", relativePath),
      path.resolve(__dirname, "..", "..", "..", "..", "node_modules", relativePath),
      path.resolve(__dirname, "..", "..", "..", "node_modules", relativePath),
    ];
    for (const candidate of absoluteCandidates) {
      if (existsSync(candidate)) {
        return readFileSync(candidate).toString("base64");
      }
    }
    return "";
  };

  const [plex400, plex700, tajawal400, tajawal700] = candidates.map(resolveBase64);
  const faces: string[] = [];
  if (plex400) {
    faces.push(`@font-face{font-family:"WathiqOverlaySans";src:url("data:font/woff2;base64,${plex400}") format("woff2");font-weight:400;font-style:normal;}`);
  }
  if (plex700) {
    faces.push(`@font-face{font-family:"WathiqOverlaySans";src:url("data:font/woff2;base64,${plex700}") format("woff2");font-weight:700;font-style:normal;}`);
  }
  if (tajawal400) {
    faces.push(`@font-face{font-family:"WathiqOverlayArabic";src:url("data:font/woff2;base64,${tajawal400}") format("woff2");font-weight:400;font-style:normal;}`);
  }
  if (tajawal700) {
    faces.push(`@font-face{font-family:"WathiqOverlayArabic";src:url("data:font/woff2;base64,${tajawal700}") format("woff2");font-weight:700;font-style:normal;}`);
  }
  return faces.join("\n");
}

const IDENTITY_FIELD_NAMES = new Set([
  "patient_name",
  "mrn",
  "date_of_birth",
  "consent_patient_name",
  "doctor_delegate_name",
  "doctor_delegate_designation",
  "substitute_name",
  "substitute_relationship",
  "substitute_contact",
]);

/**
 * Compute default fit specs for a field based on its manifest properties.
 */
export function resolveFieldFitSpec(args: {
  fieldName: string;
  cssHeight: number;
  multiline: boolean;
  autofit: boolean;
  isArabic: boolean;
}): FieldFitSpec {
  const { fieldName, cssHeight, multiline, autofit } = args;
  const maxFontSize = Math.max(7, Math.min(11, cssHeight * 0.55));
  // Identity fields may need to compress more to fit long legal names without
  // active ellipsis truncation, but never below a governed minimum.
  const minFontSize = IDENTITY_FIELD_NAMES.has(fieldName) ? 4.5 : 6;

  if (multiline) {
    return {
      mode: "multi",
      minFontSize,
      maxFontSize,
      lineHeight: 1.25,
      maxLines: autofit ? undefined : Math.max(2, Math.floor(cssHeight / (maxFontSize * 1.25))),
    };
  }

  return {
    mode: "single",
    minFontSize,
    maxFontSize,
    lineHeight: 1.25,
  };
}
