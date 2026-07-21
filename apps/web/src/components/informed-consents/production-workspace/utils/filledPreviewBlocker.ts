import type { ConsentFieldMappingReadiness } from "../lib/api";

export type FilledPreviewBlockerInput = {
  supportsFilledDraftPreview: boolean;
  hasApprovedPdfSource: boolean;
  fieldMappingVerified: boolean;
  patientReady: boolean;
  patientDob?: string | null;
  encounterReady: boolean;
  assemblyReady: boolean;
  doctorCompletionReady: boolean;
  anesthesiaMappingReady: boolean;
  patientSignatureMapped: boolean;
  filledDraftStatus: "idle" | "loading" | "current" | "stale" | "error";
  fieldMappingReadiness?: ConsentFieldMappingReadiness;
};

/**
 * Compute the exact blocker preventing the physician from generating a filled
 * draft preview. Returns null when generation is allowed.
 */
export function computeFilledPreviewBlocker(input: FilledPreviewBlockerInput): string | null {
  const {
    supportsFilledDraftPreview,
    hasApprovedPdfSource,
    fieldMappingVerified,
    patientReady,
    patientDob,
    encounterReady,
    assemblyReady,
    doctorCompletionReady,
    anesthesiaMappingReady,
    patientSignatureMapped,
    filledDraftStatus,
    fieldMappingReadiness,
  } = input;

  if (!supportsFilledDraftPreview) {
    if (!hasApprovedPdfSource) return "Approved PDF source is required";
    if (!fieldMappingVerified) return "Mapping not verified";
    if (!fieldMappingReadiness?.acroForm || fieldMappingReadiness.acroForm.manifestState.status !== "READY") {
      return "Manifest not ready";
    }
    return "Filled preview is not available for this form";
  }

  if (!patientReady) return "Select a patient first";
  if (!patientDob) return "Missing patient DOB";
  if (!encounterReady) return "Select an encounter first";
  if (!assemblyReady) return "Load the package first";
  if (!doctorCompletionReady) return "Incomplete physician field";
  if (!anesthesiaMappingReady) return "Anesthesia decision missing";
  if (!patientSignatureMapped) return "Patient signature field is not mapped";
  if (!fieldMappingVerified) return "Mapping not verified";
  if (filledDraftStatus === "loading") return "Generating preview…";

  return null;
}
