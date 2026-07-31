import type { ConsentFieldMappingReadiness } from "../lib/api";

/**
 * Determine whether the AcroForm filled-draft preview card should be rendered.
 * This is governed by the same canonical prerequisites required by generateFilledDraftPreview:
 * a verified approved PDF source, a verified field mapping, and a verified READY manifest hash.
 */
export function computeSupportsFilledDraftPreview(args: {
  fieldMappingReadiness?: ConsentFieldMappingReadiness;
  hasApprovedPdfSource: boolean;
  fieldMappingVerified: boolean;
}): boolean {
  const manifestState = args.fieldMappingReadiness?.acroForm?.manifestState;
  const manifestHashReady = Boolean(manifestState?.hash) && manifestState?.status === "READY";
  return args.hasApprovedPdfSource && args.fieldMappingVerified && manifestHashReady;
}
