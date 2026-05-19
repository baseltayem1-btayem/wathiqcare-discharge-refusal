/**
 * Capability detection for the internal PDF binary preview pipeline.
 *
 * This module intentionally uses dynamic `import()` so that the absence of
 * a renderer at runtime (e.g. missing Chromium binary in a constrained
 * environment) NEVER breaks the build or the rest of the app — it just
 * surfaces an honest "unavailable" response from the preview route.
 *
 * No production code path depends on this module.
 */

import type { PdfBinaryRendererCapability } from "./pdf-binary-types";

let cachedCapability: PdfBinaryRendererCapability | null = null;

export async function detectPdfBinaryRendererCapability(): Promise<PdfBinaryRendererCapability> {
  if (cachedCapability) return cachedCapability;

  // 1) puppeteer-core present?
  try {
    await import("puppeteer-core");
  } catch (err) {
    cachedCapability = {
      available: false,
      reasonCode: "PUPPETEER_CORE_MISSING",
      detail:
        "puppeteer-core could not be loaded in this runtime. " +
        (err instanceof Error ? err.message : String(err)),
    };
    return cachedCapability;
  }

  // 2) @sparticuz/chromium present?
  let chromiumModule: unknown;
  try {
    chromiumModule = await import("@sparticuz/chromium");
  } catch (err) {
    cachedCapability = {
      available: false,
      reasonCode: "CHROMIUM_MISSING",
      detail:
        "@sparticuz/chromium could not be loaded. " +
        (err instanceof Error ? err.message : String(err)),
    };
    return cachedCapability;
  }

  // 3) Can we resolve an executable path?
  try {
    const mod = chromiumModule as {
      default?: { executablePath?: () => Promise<string | undefined> };
    };
    const exec = await mod.default?.executablePath?.();
    if (!exec) {
      cachedCapability = {
        available: false,
        reasonCode: "EXECUTABLE_PATH_UNAVAILABLE",
        detail:
          "Chromium executable path could not be resolved in this environment.",
      };
      return cachedCapability;
    }
  } catch (err) {
    cachedCapability = {
      available: false,
      reasonCode: "EXECUTABLE_PATH_UNAVAILABLE",
      detail:
        "Failed to resolve Chromium executable path. " +
        (err instanceof Error ? err.message : String(err)),
    };
    return cachedCapability;
  }

  cachedCapability = {
    available: true,
    reasonCode: "OK",
    detail: "puppeteer-core + @sparticuz/chromium available.",
    rendererId: "puppeteer-core+sparticuz-chromium",
  };
  return cachedCapability;
}

/** Internal hook for tests; resets the cached capability probe. */
export function __resetPdfBinaryCapabilityCacheForTesting(): void {
  cachedCapability = null;
}
