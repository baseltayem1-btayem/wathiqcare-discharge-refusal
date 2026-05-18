import type { DynamicConsentBuildResult, DynamicConsentRenderedDocument } from "@/modules/consent-engine/engine/types";

function buildFileName(result: Pick<DynamicConsentBuildResult, "payload" | "generatedAt">): string {
  const specialty = result.payload.specialty.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `dynamic-consent-${specialty}-${result.generatedAt.slice(0, 10)}.html`;
}

export function buildDynamicConsentRenderedDocument(result: Omit<DynamicConsentBuildResult, "rendered" | "audit"> & { html: string }): DynamicConsentRenderedDocument {
  return {
    titleAr: result.template.displayNameAr,
    titleEn: result.template.displayNameEn,
    html: result.html,
    pdfFileName: buildFileName(result),
  };
}