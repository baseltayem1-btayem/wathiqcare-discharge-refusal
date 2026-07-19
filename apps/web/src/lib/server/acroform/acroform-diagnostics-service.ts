import { computeAcroFormManifestHash, type AcroFormTemplateManifest } from "@/lib/server/acroform/field-addressed-template-manifest";
import amputationManifest from "@/lib/server/acroform/manifests/imc-mr-1135-amputation.manifest.json";
import { resolveCanonicalAcroFormTemplateId } from "./acroform-template-identity";

const ACROFORM_MANIFESTS: Record<string, AcroFormTemplateManifest> = {
  "imc-approved-amputation": amputationManifest as AcroFormTemplateManifest,
};

export type AcroFormTemplateDiagnostics = {
  formId: string;
  manifestPresent: boolean;
  manifestHashMatches: boolean;
  manifestHash: string | null;
  canonicalApprovedPdf: {
    sha256: string;
    pageCount: number;
    pageSizePoints: { width: number; height: number };
  } | null;
  acroFormAuthoringArtifact: {
    hasJavaScript: boolean;
    hasOpenAction: boolean;
    hasActiveActions: boolean;
    runtimeUsage: string;
  } | null;
  fieldCounts: {
    total: number;
    text: number;
    button: number;
    signature: number;
  } | null;
  status: "READY" | "NOT_READY";
  blockers: string[];
};

/**
 * Runtime diagnostics for AcroForm-backed approved consent forms.
 *
 * Verifies that the verified manifest is present, its internal hash is
 * consistent, and the authoring artifact has been marked as safe for offline
 * use only.
 */
export function getAcroFormTemplateDiagnostics(formId: string): AcroFormTemplateDiagnostics {
  const canonical = resolveCanonicalAcroFormTemplateId(formId);
  const canonicalFormId = canonical?.canonicalFormId ?? formId;
  const manifest = ACROFORM_MANIFESTS[canonicalFormId];
  const blockers: string[] = [];

  if (!manifest) {
    blockers.push(`No verified AcroForm manifest registered for form "${formId}".`);
    return {
      formId,
      manifestPresent: false,
      manifestHashMatches: false,
      manifestHash: null,
      canonicalApprovedPdf: null,
      acroFormAuthoringArtifact: null,
      fieldCounts: null,
      status: "NOT_READY",
      blockers,
    };
  }

  const recomputedHash = computeAcroFormManifestHash(manifest);
  const manifestHashMatches = recomputedHash === manifest.manifestHash;

  if (!manifestHashMatches) {
    blockers.push("Manifest hash mismatch: the verified manifest may have been corrupted or modified.");
  }

  if (manifest.acroFormAuthoringArtifact.runtimeUsage !== "AUTHORING_INPUT_ONLY") {
    blockers.push("Authoring artifact runtime usage must be AUTHORING_INPUT_ONLY.");
  }

  if (manifest.fieldCounts.signature === 0) {
    blockers.push("Manifest does not declare any signature widgets.");
  }

  return {
    formId,
    manifestPresent: true,
    manifestHashMatches,
    manifestHash: manifest.manifestHash,
    canonicalApprovedPdf: manifest.canonicalApprovedPdf,
    acroFormAuthoringArtifact: {
      hasJavaScript: manifest.acroFormAuthoringArtifact.hasJavaScript,
      hasOpenAction: manifest.acroFormAuthoringArtifact.hasOpenAction,
      hasActiveActions: manifest.acroFormAuthoringArtifact.hasActiveActions,
      runtimeUsage: manifest.acroFormAuthoringArtifact.runtimeUsage,
    },
    fieldCounts: manifest.fieldCounts,
    status: blockers.length === 0 ? "READY" : "NOT_READY",
    blockers,
  };
}
