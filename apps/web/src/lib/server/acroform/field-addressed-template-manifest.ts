import crypto from "node:crypto";

/**
 * Field-addressed AcroForm template manifest schema.
 *
 * pdfFiller (or any blank AcroForm authoring tool) is used only as an offline
 * field-authoring aid. The authoring artifact is parsed once, reviewed, and
 * converted into this deterministic JSON manifest. Runtime never uses the
 * authoring PDF as the patient-facing background; the canonical approved static
 * PDF is the only runtime background source.
 */

export type AcroFormTemplateStatus =
  | "DRAFT"
  | "INSPECTED"
  | "VERIFIED"
  | "PREVIEW_ACTIVE"
  | "PRODUCTION_ACTIVE";

export type AcroFormFieldRole =
  | "SYSTEM"
  | "PHYSICIAN"
  | "PATIENT"
  | "SUBSTITUTE"
  | "WITNESS"
  | "INTERPRETER"
  | "READ_ONLY";

export type AcroFormFieldLanguage = "EN" | "AR" | "BILINGUAL" | "NONE";

export type AcroFormRawFieldType = "/Tx" | "/Btn" | "/Sig";

/**
 * Widget rectangle in AcroForm convention: [left, bottom, right, top] in PDF points.
 * This matches the exact shape of the supplied expected manifest.
 */
export type AcroFormWidgetRect = [number, number, number, number];

export type AcroFormWidget = {
  page: number;
  rect: AcroFormWidgetRect;
  appearanceStates: string[] | null;
};

export function parseWidgetRect(rect: AcroFormWidgetRect): { left: number; bottom: number; right: number; top: number; width: number; height: number } {
  const [left, bottom, right, top] = rect;
  return { left, bottom, right, top, width: right - left, height: top - bottom };
}

export type AcroFormFieldRecord = {
  /** Original AcroForm field name from the authoring artifact. */
  name: string;
  /** Canonical WathiqCare semantic key. */
  semanticKey: string;
  /** Human-readable alternate name from the PDF (usually bilingual). */
  altName: string;
  role: AcroFormFieldRole;
  language: AcroFormFieldLanguage;
  /** Raw AcroForm field type: /Tx, /Btn, /Sig. */
  type: AcroFormRawFieldType;
  /** Bitmask from the AcroForm field flags (e.g. 4096 = multiline). */
  flags: number;
  required: boolean;
  /** Rule describing when the field is applicable (e.g. "always", "substitute_required"). */
  applicabilityRule: string;
  /** AcroForm on-state name for checkboxes/radio buttons (e.g. "/Yes"). */
  checkboxOnState: string | null;
  multiline: boolean;
  autofit: boolean;
  widgets: AcroFormWidget[];
  /** Rendering strategy hint. */
  renderingStrategy: "TEXT" | "SIGNATURE_IMAGE" | "CHECKBOX_MARK" | "DATE" | "TIME";
};

export type AcroFormProvenance = {
  importedAt: string;
  reviewedAt: string;
  reviewedBy: string;
  sourceTool: string;
  notes: string;
};

export type AcroFormTemplateManifest = {
  templateCode: string;
  templateVersion: string;
  titleEn: string;
  titleAr: string;
  canonicalApprovedPdf: {
    sha256: string;
    sizeBytes: number;
    pageCount: number;
    pageSizePoints: { width: number; height: number };
  };
  acroFormAuthoringArtifact: {
    sha256: string;
    sizeBytes: number;
    pageCount: number;
    pageSizePoints: { width: number; height: number };
    hasJavaScript: boolean;
    hasOpenAction: boolean;
    hasActiveActions: boolean;
    runtimeUsage: "AUTHORING_INPUT_ONLY";
  };
  status: AcroFormTemplateStatus;
  provenance: AcroFormProvenance;
  /** Deterministic SHA-256 of the canonical manifest fields. */
  manifestHash: string;
  fieldCounts: {
    total: number;
    text: number;
    button: number;
    signature: number;
  };
  fields: AcroFormFieldRecord[];
};

export type AcroFormImportSecurityReport = {
  hasJavaScript: boolean;
  hasOpenAction: boolean;
  hasXfa: boolean;
  hasAttachments: boolean;
  hasSignedValues: boolean;
  hasActiveActions: boolean;
  actionTypes: string[];
  nonEmptyFieldNames: string[];
};

export type AcroFormImportResult = {
  manifest: AcroFormTemplateManifest;
  securityReport: AcroFormImportSecurityReport;
};

/**
 * Compute a deterministic manifest hash from the canonical fields.
 * Volatile provenance metadata is excluded so status transitions do not
 * invalidate the hash.
 */
export function computeAcroFormManifestHash(manifest: Omit<AcroFormTemplateManifest, "manifestHash">): string {
  const canonical = {
    templateCode: manifest.templateCode,
    templateVersion: manifest.templateVersion,
    titleEn: manifest.titleEn,
    titleAr: manifest.titleAr,
    canonicalApprovedPdf: {
      sha256: manifest.canonicalApprovedPdf.sha256,
      sizeBytes: manifest.canonicalApprovedPdf.sizeBytes,
      pageCount: manifest.canonicalApprovedPdf.pageCount,
      pageSizePoints: manifest.canonicalApprovedPdf.pageSizePoints,
    },
    acroFormAuthoringArtifact: {
      sha256: manifest.acroFormAuthoringArtifact.sha256,
      sizeBytes: manifest.acroFormAuthoringArtifact.sizeBytes,
      pageCount: manifest.acroFormAuthoringArtifact.pageCount,
      pageSizePoints: manifest.acroFormAuthoringArtifact.pageSizePoints,
      hasJavaScript: manifest.acroFormAuthoringArtifact.hasJavaScript,
      hasOpenAction: manifest.acroFormAuthoringArtifact.hasOpenAction,
      hasActiveActions: manifest.acroFormAuthoringArtifact.hasActiveActions,
      runtimeUsage: manifest.acroFormAuthoringArtifact.runtimeUsage,
    },
    status: manifest.status,
    fields: manifest.fields
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((field) => ({
        name: field.name,
        semanticKey: field.semanticKey,
        altName: field.altName,
        role: field.role,
        language: field.language,
        type: field.type,
        flags: field.flags,
        required: field.required,
        applicabilityRule: field.applicabilityRule,
        checkboxOnState: field.checkboxOnState,
        multiline: field.multiline,
        autofit: field.autofit,
        renderingStrategy: field.renderingStrategy,
        widgets: field.widgets
          .slice()
          .sort((a, b) => a.page - b.page || a.rect[0] - b.rect[0])
          .map((widget) => ({
            page: widget.page,
            rect: widget.rect,
            appearanceStates: widget.appearanceStates,
          })),
      })),
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
