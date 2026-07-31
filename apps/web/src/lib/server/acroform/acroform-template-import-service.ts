import crypto from "node:crypto";
import { PDFDict, PDFDocument, PDFName, PDFNumber, PDFString, PDFHexString } from "pdf-lib";
import type {
  AcroFormFieldRecord,
  AcroFormImportResult,
  AcroFormImportSecurityReport,
  AcroFormTemplateManifest,
  AcroFormWidget,
} from "./field-addressed-template-manifest";
import { computeAcroFormManifestHash } from "./field-addressed-template-manifest";

export type AcroFormImportOptions = {
  /** Expected manifest to compare against (optional but recommended for verification). */
  expectedManifest?: object;
  /** Canonical approved PDF bytes for page-count/dimension validation. */
  canonicalApprovedPdfBytes?: Uint8Array;
  /** Reject if any field value is non-empty. */
  rejectNonEmptyValues?: boolean;
};

export class AcroFormImportError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AcroFormImportError";
    this.code = code;
  }
}

function asUint8Array(value: Buffer | Uint8Array): Uint8Array {
  if (Buffer.isBuffer(value)) return new Uint8Array(value);
  return value;
}

function sha256(bytes: Uint8Array): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function decodePdfString(obj: unknown): string | null {
  if (!obj) return null;
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    try {
      return obj.decodeText();
    } catch {
      return obj.asString?.() ?? null;
    }
  }
  if (obj instanceof PDFName) {
    return obj.asString();
  }
  return null;
}

function decodeName(obj: unknown): string | null {
  if (obj instanceof PDFName) {
    const str = obj.asString();
    return str.startsWith("/") ? str.slice(1) : str;
  }
  return decodePdfString(obj);
}

function getNumber(obj: unknown): number | null {
  if (obj instanceof PDFNumber) return obj.asNumber();
  if (typeof obj === "number" && Number.isFinite(obj)) return obj;
  return null;
}

function getRectangle(rectObj: unknown): { x: number; y: number; width: number; height: number } | null {
  const rect = rectObj && typeof rectObj === "object" && "asRectangle" in rectObj ? (rectObj as { asRectangle(): { x: number; y: number; width: number; height: number } }).asRectangle() : null;
  return rect ?? null;
}

function pdfNameKey(keyObj: PDFName): string {
  const str = keyObj.asString();
  return str.startsWith("/") ? str.slice(1) : str;
}

function resolveDict(value: unknown, context?: { lookup(ref: { objectNumber: number; generationNumber: number }): unknown }): PDFDict | null {
  if (value instanceof PDFDict) return value;
  if (value && typeof value === "object" && "objectNumber" in value && context) {
    const resolved = context.lookup(value as { objectNumber: number; generationNumber: number });
    return resolved instanceof PDFDict ? resolved : null;
  }
  return null;
}

function collectActionTypes(dict: PDFDict | unknown, found: Set<string>, context?: { lookup(ref: { objectNumber: number; generationNumber: number }): unknown }): void {
  if (!(dict instanceof PDFDict)) return;
  for (const [keyObj, value] of dict.entries()) {
    const key = pdfNameKey(keyObj);
    if (key === "S" && value instanceof PDFName) {
      const str = value.asString();
      found.add(str.startsWith("/") ? str.slice(1) : str);
    } else if (key === "A" || key === "AA") {
      const actionDict = resolveDict(value, context);
      if (actionDict) collectActionTypes(actionDict, found, context);
    }
  }
}

function hasJavaScriptAction(dict: PDFDict | unknown, context?: { lookup(ref: { objectNumber: number; generationNumber: number }): unknown }): boolean {
  if (!(dict instanceof PDFDict)) return false;
  for (const [keyObj, value] of dict.entries()) {
    const key = pdfNameKey(keyObj);
    if (key === "S" && value instanceof PDFName && value.asString() === "/JavaScript") {
      return true;
    }
    if (key === "A" || key === "AA") {
      const actionDict = resolveDict(value, context);
      if (actionDict && hasJavaScriptAction(actionDict, context)) {
        return true;
      }
    }
  }
  return false;
}

function getFullFieldName(widgetOrField: PDFDict): string {
  const parts: string[] = [];
  let current: PDFDict | null = widgetOrField;
  while (current) {
    const t = current.lookup(PDFName.of("T"));
    const decoded = decodePdfString(t);
    if (decoded) parts.unshift(decoded);
    const parent = current.lookup(PDFName.of("Parent"));
    current = parent instanceof PDFDict ? parent : null;
  }
  return parts.join(".");
}

function getFieldFlags(widgetOrField: PDFDict): number {
  let current: PDFDict | null = widgetOrField;
  while (current) {
    const ff = getNumber(current.lookup(PDFName.of("Ff")));
    if (ff !== null) return ff;
    const parent = current.lookup(PDFName.of("Parent"));
    current = parent instanceof PDFDict ? parent : null;
  }
  return 0;
}

function decodePdfNameRaw(obj: unknown): string | null {
  if (obj instanceof PDFName) return obj.asString();
  return decodePdfString(obj);
}

function getFieldType(widgetOrField: PDFDict): string | null {
  let current: PDFDict | null = widgetOrField;
  while (current) {
    const ft = decodePdfNameRaw(current.lookup(PDFName.of("FT")));
    if (ft) return ft;
    const parent = current.lookup(PDFName.of("Parent"));
    current = parent instanceof PDFDict ? parent : null;
  }
  return null;
}

function getAlternateName(widgetOrField: PDFDict): string | null {
  let current: PDFDict | null = widgetOrField;
  while (current) {
    const tu = decodePdfString(current.lookup(PDFName.of("TU")));
    if (tu) return tu;
    const parent = current.lookup(PDFName.of("Parent"));
    current = parent instanceof PDFDict ? parent : null;
  }
  return null;
}

function getAppearanceStates(widgetOrField: PDFDict): string[] | null {
  const ap = widgetOrField.lookup(PDFName.of("AP"));
  if (!(ap instanceof PDFDict)) return null;
  const n = ap.lookup(PDFName.of("N"));
  if (!(n instanceof PDFDict)) return null;
  const states: string[] = [];
  for (const key of n.keys()) {
    states.push(key.asString());
  }
  return states.length > 0 ? states : null;
}

function getFieldValue(widgetOrField: PDFDict, context?: { lookup(ref: { objectNumber: number; generationNumber: number }): unknown }): string | null {
  let current: PDFDict | null = widgetOrField;
  while (current) {
    const v = current.lookup(PDFName.of("V"));
    if (v) return decodeName(v);
    const parent = current.lookup(PDFName.of("Parent"));
    current = resolveDict(parent, context);
  }
  return null;
}

function hasNonEmptyValue(fieldType: string | null, value: string | null): boolean {
  if (value === null || value === undefined) return false;
  if (fieldType === "/Btn") {
    return value !== "/Off" && value !== "Off";
  }
  return value.trim().length > 0;
}

function detectDocumentLevelJavaScript(catalog: PDFDict, context: { lookup(ref: { objectNumber: number; generationNumber: number }): unknown }): boolean {
  // Check /Names > JavaScript
  const names = catalog.lookup(PDFName.of("Names"));
  if (names instanceof PDFDict) {
    const js = names.lookup(PDFName.of("JavaScript"));
    if (js) return true;
  }
  // Check /OpenAction
  const openAction = resolveDict(catalog.lookup(PDFName.of("OpenAction")), context);
  if (openAction && hasJavaScriptAction(openAction, context)) {
    return true;
  }
  // Check catalog /AA
  const aa = resolveDict(catalog.lookup(PDFName.of("AA")), context);
  if (aa && hasJavaScriptAction(aa, context)) {
    return true;
  }
  return false;
}

function detectOpenAction(catalog: PDFDict): boolean {
  return catalog.lookup(PDFName.of("OpenAction")) instanceof PDFDict;
}

function detectXfa(catalog: PDFDict): boolean {
  const acroForm = catalog.lookup(PDFName.of("AcroForm"));
  if (!(acroForm instanceof PDFDict)) return false;
  return !!acroForm.lookup(PDFName.of("XFA"));
}

function detectAttachments(catalog: PDFDict): boolean {
  const names = catalog.lookup(PDFName.of("Names"));
  if (!(names instanceof PDFDict)) return false;
  return !!names.lookup(PDFName.of("EmbeddedFiles"));
}

function detectSignedValues(
  fields: AcroFormFieldRecord[],
  widgets: Array<{ pageIndex: number; widget: PDFDict }>,
  context?: { lookup(ref: { objectNumber: number; generationNumber: number }): unknown },
): boolean {
  const signatureWidgets = widgets.filter((w) => getFieldType(w.widget) === "/Sig");
  for (const { widget } of signatureWidgets) {
    const value = getFieldValue(widget, context);
    if (value && value !== "Off" && value !== "/Off") return true;
  }
  return false;
}

async function loadPdfDocument(pdfBytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(pdfBytes, {
      updateMetadata: false,
      ignoreEncryption: false,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (message.toLowerCase().includes("encrypt")) {
      throw new AcroFormImportError("Encrypted PDFs are not accepted as AcroForm authoring artifacts.", "ENCRYPTED_PDF");
    }
    throw new AcroFormImportError(`Unable to parse AcroForm PDF: ${message}`, "PARSE_ERROR");
  }
}

function extractPageDimensions(doc: PDFDocument): { width: number; height: number } {
  const pages = doc.getPages();
  if (pages.length === 0) {
    throw new AcroFormImportError("AcroForm PDF has no pages.", "NO_PAGES");
  }
  const size = pages[0].getSize();
  return { width: size.width, height: size.height };
}

function collectWidgetAnnotations(doc: PDFDocument): Array<{ pageIndex: number; widget: PDFDict }> {
  const result: Array<{ pageIndex: number; widget: PDFDict }> = [];
  const pages = doc.getPages();
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    const annotsRef = page.node.lookup(PDFName.of("Annots"));
    if (!annotsRef) continue;

    const annotsArray =
      typeof (annotsRef as { asArray?: () => unknown[] }).asArray === "function"
        ? (annotsRef as { asArray(): unknown[] }).asArray()
        : null;

    if (!Array.isArray(annotsArray)) continue;

    for (const annotRef of annotsArray) {
      let annot: PDFDict | null = null;
      if (annotRef instanceof PDFDict) {
        annot = annotRef;
      } else if (annotRef && typeof annotRef === "object" && "objectNumber" in annotRef) {
        const resolved = page.doc.context.lookup(annotRef as { objectNumber: number; generationNumber: number });
        if (resolved instanceof PDFDict) annot = resolved;
      }
      if (!annot) continue;
      const subtype = decodeName(annot.lookup(PDFName.of("Subtype")));
      if (subtype !== "Widget") continue;
      result.push({ pageIndex, widget: annot });
    }
  }
  return result;
}

function groupWidgetsByFullName(
  widgets: Array<{ pageIndex: number; widget: PDFDict }>,
): Map<string, Array<{ pageIndex: number; widget: PDFDict }>> {
  const groups = new Map<string, Array<{ pageIndex: number; widget: PDFDict }>>();
  for (const item of widgets) {
    const fullName = getFullFieldName(item.widget);
    if (!fullName) continue;
    const list = groups.get(fullName) ?? [];
    list.push(item);
    groups.set(fullName, list);
  }
  return groups;
}

function validateRectangles(args: {
  fieldName: string;
  widgets: AcroFormWidget[];
  pageWidth: number;
  pageHeight: number;
}): void {
  const { fieldName, widgets, pageWidth, pageHeight } = args;
  for (const widget of widgets) {
    const [left, bottom, right, top] = widget.rect;
    if (
      !Number.isFinite(left) ||
      !Number.isFinite(bottom) ||
      !Number.isFinite(right) ||
      !Number.isFinite(top)
    ) {
      throw new AcroFormImportError(
        `Malformed rectangle for field "${fieldName}" on page ${widget.page}.`,
        "MALFORMED_RECT",
      );
    }
    if (right <= left || top <= bottom) {
      throw new AcroFormImportError(
        `Degenerate rectangle for field "${fieldName}" on page ${widget.page}.`,
        "DEGENERATE_RECT",
      );
    }
    if (
      left < -1 ||
      bottom < -1 ||
      right > pageWidth + 1 ||
      top > pageHeight + 1
    ) {
      throw new AcroFormImportError(
        `Widget for field "${fieldName}" on page ${widget.page} is outside page bounds.`,
        "WIDGET_OUTSIDE_BOUNDS",
      );
    }
  }
}

function toAcroFormFieldType(ft: string | null): AcroFormFieldRecord["type"] {
  if (ft === "/Tx" || ft === "/Btn" || ft === "/Sig") return ft;
  throw new AcroFormImportError(`Unsupported AcroForm field type "${ft}".`, "UNSUPPORTED_FIELD_TYPE");
}

function inferLanguage(acroFormName: string, altName: string): AcroFormFieldRecord["language"] {
  const combined = `${acroFormName} ${altName}`;
  const lower = combined.toLowerCase();
  const hasExplicitEn = /\b(en|english)\b/.test(lower);
  const hasLatinLetters = /[a-zA-Z]/.test(combined);
  const hasAr = /[\u0600-\u06FF]/.test(combined) || /\b(ar|arabic|عربي)\b/.test(lower);
  const hasEn = hasExplicitEn || hasLatinLetters;
  if (hasEn && hasAr) return "BILINGUAL";
  if (hasAr) return "AR";
  if (hasEn) return "EN";
  return "NONE";
}

function inferRole(acroFormName: string): AcroFormFieldRecord["role"] {
  const lower = acroFormName.toLowerCase();
  if (
    lower === "patient_name" ||
    lower === "mrn" ||
    lower === "date_of_birth" ||
    lower === "consent_date" ||
    lower === "consent_time"
  ) {
    return "SYSTEM";
  }
  if (lower.startsWith("witness")) return "WITNESS";
  if (lower.startsWith("substitute")) return "SUBSTITUTE";
  if (lower.startsWith("doctor_") || lower.startsWith("physician_")) return "PHYSICIAN";
  if (lower.includes("patient") || lower === "consent_patient_name") return "PATIENT";
  if (lower.includes("interpreter")) return "INTERPRETER";
  return "READ_ONLY";
}

function inferRenderingStrategy(type: AcroFormFieldRecord["type"], acroFormName: string): AcroFormFieldRecord["renderingStrategy"] {
  if (type === "/Sig") return "SIGNATURE_IMAGE";
  if (type === "/Btn") return "CHECKBOX_MARK";
  if (acroFormName.includes("date") && !acroFormName.includes("time")) return "DATE";
  if (acroFormName.includes("time")) return "TIME";
  return "TEXT";
}

function inferApplicabilityRule(role: AcroFormFieldRecord["role"]): string {
  if (role === "WITNESS") return "conditional_witness_policy";
  if (role === "SUBSTITUTE") return "substitute_decision_required";
  if (role === "INTERPRETER") return "interpreter_decision_required";
  if (role === "READ_ONLY") return "education_decision_driven";
  return "always";
}

export async function importAcroFormTemplate(args: {
  authoringArtifactBytes: Uint8Array;
  canonicalApprovedPdfBytes?: Uint8Array;
  templateCode: string;
  templateVersion: string;
  titleEn: string;
  titleAr: string;
  provenance?: {
    importedAt: string;
    reviewedAt: string;
    reviewedBy: string;
    sourceTool: string;
    notes: string;
  };
  status?: AcroFormTemplateManifest["status"];
  options?: AcroFormImportOptions;
}): Promise<AcroFormImportResult> {
  const {
    authoringArtifactBytes,
    canonicalApprovedPdfBytes,
    templateCode,
    templateVersion,
    titleEn,
    titleAr,
    provenance,
    status = "VERIFIED",
    options = {},
  } = args;

  const artifactBytes = asUint8Array(authoringArtifactBytes);
  const artifactSha256 = sha256(artifactBytes);

  const doc = await loadPdfDocument(artifactBytes);
  const catalog = doc.catalog;

  // Security detections
  const hasJavaScript = detectDocumentLevelJavaScript(catalog, doc.context) || detectWidgetJavaScript(doc);
  const hasOpenAction = detectOpenAction(catalog);
  const hasXfa = detectXfa(catalog);
  const hasAttachments = detectAttachments(catalog);
  const actionTypes = detectAllActionTypes(doc);
  const hasActiveActions = actionTypes.some((type) =>
    ["URI", "Launch", "SubmitForm", "ImportData", "ResetForm", "JavaScript"].includes(type),
  );

  if (hasXfa) {
    throw new AcroFormImportError("XFA forms are not accepted.", "XFA_DETECTED");
  }
  if (hasAttachments) {
    throw new AcroFormImportError("PDF attachments/embedded files are not accepted.", "ATTACHMENTS_DETECTED");
  }

  const artifactPageCount = doc.getPageCount();
  const artifactPageSize = extractPageDimensions(doc);

  let canonicalPageCount = 0;
  let canonicalPageSize = { width: 0, height: 0 };

  if (canonicalApprovedPdfBytes) {
    const canonicalDoc = await PDFDocument.load(asUint8Array(canonicalApprovedPdfBytes), {
      updateMetadata: false,
    });
    canonicalPageCount = canonicalDoc.getPageCount();
    canonicalPageSize = extractPageDimensions(canonicalDoc);
    if (canonicalPageCount !== artifactPageCount) {
      throw new AcroFormImportError(
        `Page count mismatch: authoring artifact has ${artifactPageCount} pages, canonical PDF has ${canonicalPageCount}.`,
        "PAGE_COUNT_MISMATCH",
      );
    }
    if (
      Math.abs(canonicalPageSize.width - artifactPageSize.width) > 0.5 ||
      Math.abs(canonicalPageSize.height - artifactPageSize.height) > 0.5
    ) {
      throw new AcroFormImportError(
        `Page size mismatch: authoring artifact ${artifactPageSize.width}x${artifactPageSize.height}, canonical PDF ${canonicalPageSize.width}x${canonicalPageSize.height}.`,
        "PAGE_SIZE_MISMATCH",
      );
    }
  }

  const widgetItems = collectWidgetAnnotations(doc);
  const groups = groupWidgetsByFullName(widgetItems);

  if (groups.size === 0) {
    throw new AcroFormImportError("No AcroForm fields found in authoring artifact.", "NO_FIELDS");
  }

  // Detect duplicate full-name definitions with incompatible types
  const seenNames = new Map<string, string>();
  for (const [fullName, items] of groups.entries()) {
    const ft = getFieldType(items[0].widget);
    const prior = seenNames.get(fullName);
    if (prior && prior !== ft) {
      throw new AcroFormImportError(
        `Duplicate field definition with incompatible type: "${fullName}".`,
        "DUPLICATE_FIELD",
      );
    }
    seenNames.set(fullName, ft ?? "");
  }

  const fieldRecords: AcroFormFieldRecord[] = [];
  let textCount = 0;
  let buttonCount = 0;
  let signatureCount = 0;
  const nonEmptyFieldNames: string[] = [];

  for (const [fullName, items] of groups.entries()) {
    const representative = items[0].widget;
    const ft = getFieldType(representative);
    const flags = getFieldFlags(representative);
    const altName = getAlternateName(representative) ?? "";
    const value = getFieldValue(representative, doc.context);
    const fieldType = toAcroFormFieldType(ft);

    if (options.rejectNonEmptyValues !== false && hasNonEmptyValue(ft, value)) {
      nonEmptyFieldNames.push(fullName);
    }

    if (ft === "/Tx") textCount += 1;
    else if (ft === "/Btn") buttonCount += 1;
    else if (ft === "/Sig") signatureCount += 1;

    const appearanceStates = getAppearanceStates(representative);
    const checkboxOnState =
      fieldType === "CHECKBOX" && appearanceStates
        ? appearanceStates.find((s) => s !== "Off" && s !== "/Off") ?? "Yes"
        : null;

    const widgets: AcroFormWidget[] = items
      .map((item) => {
        const rect = getRectangle(item.widget.lookup(PDFName.of("Rect")));
        if (!rect) return null;
        return {
          page: item.pageIndex + 1,
          rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height] as [number, number, number, number],
          appearanceStates,
        };
      })
      .filter((w): w is AcroFormWidget => w !== null);

    validateRectangles({
      fieldName: fullName,
      widgets,
      pageWidth: artifactPageSize.width,
      pageHeight: artifactPageSize.height,
    });

    const role = inferRole(fullName);
    const language = inferLanguage(fullName, altName);
    const multiline = fieldType === "/Tx" && (flags & 0x1000) !== 0;

    fieldRecords.push({
      name: fullName,
      semanticKey: fullName,
      altName,
      role,
      language,
      type: fieldType,
      flags,
      required: false,
      applicabilityRule: inferApplicabilityRule(role),
      checkboxOnState,
      multiline,
      autofit: multiline,
      widgets,
      renderingStrategy: inferRenderingStrategy(fieldType, fullName),
    });
  }

  if (nonEmptyFieldNames.length > 0) {
    throw new AcroFormImportError(
      `Non-empty patient/clinical/signature values detected: ${nonEmptyFieldNames.join(", ")}.`,
      "NON_EMPTY_VALUES",
    );
  }

  const hasSignedValues = detectSignedValues(fieldRecords, widgetItems, doc.context);
  if (hasSignedValues) {
    throw new AcroFormImportError("Signed form values detected.", "SIGNED_VALUES");
  }

  const signatureFields = fieldRecords.filter((f) => f.type === "/Sig");
  if (signatureFields.length === 0) {
    throw new AcroFormImportError("No signature widgets found; form cannot capture signatures.", "MISSING_SIGNATURE_WIDGETS");
  }

  const canonicalApprovedPdf = canonicalApprovedPdfBytes
    ? {
        sha256: sha256(asUint8Array(canonicalApprovedPdfBytes)),
        sizeBytes: canonicalApprovedPdfBytes.byteLength,
        pageCount: canonicalPageCount,
        pageSizePoints: canonicalPageSize,
      }
    : {
        sha256: "",
        sizeBytes: 0,
        pageCount: artifactPageCount,
        pageSizePoints: artifactPageSize,
      };

  const manifestWithoutHash: Omit<AcroFormTemplateManifest, "manifestHash"> = {
    templateCode,
    templateVersion,
    titleEn,
    titleAr,
    canonicalApprovedPdf,
    acroFormAuthoringArtifact: {
      sha256: artifactSha256,
      sizeBytes: artifactBytes.byteLength,
      pageCount: artifactPageCount,
      pageSizePoints: artifactPageSize,
      hasJavaScript,
      hasOpenAction,
      hasActiveActions,
      runtimeUsage: "AUTHORING_INPUT_ONLY",
    },
    status,
    provenance: provenance ?? {
      importedAt: new Date().toISOString(),
      reviewedAt: new Date().toISOString(),
      reviewedBy: "system",
      sourceTool: "pdf-lib-acroform-importer",
      notes: "Auto-imported AcroForm authoring artifact.",
    },
    fieldCounts: {
      total: fieldRecords.length,
      text: textCount,
      button: buttonCount,
      signature: signatureCount,
    },
    fields: fieldRecords,
  };

  const manifestHash = computeAcroFormManifestHash(manifestWithoutHash);
  const manifest: AcroFormTemplateManifest = { ...manifestWithoutHash, manifestHash };

  if (options.expectedManifest) {
    compareManifests(manifest, options.expectedManifest);
  }

  const securityReport: AcroFormImportSecurityReport = {
    hasJavaScript,
    hasOpenAction,
    hasXfa,
    hasAttachments,
    hasSignedValues,
    hasActiveActions,
    actionTypes,
    nonEmptyFieldNames,
  };

  return { manifest, securityReport };
}

function detectWidgetJavaScript(doc: PDFDocument): boolean {
  const widgets = collectWidgetAnnotations(doc);
  for (const { widget } of widgets) {
    if (hasJavaScriptAction(widget, doc.context)) return true;
  }
  return false;
}

function detectAllActionTypes(doc: PDFDocument): string[] {
  const found = new Set<string>();
  const catalog = doc.catalog;
  collectActionTypes(catalog, found, doc.context);
  const widgets = collectWidgetAnnotations(doc);
  for (const { widget } of widgets) {
    collectActionTypes(widget, found, doc.context);
  }
  return Array.from(found).sort();
}

function compareManifests(actual: AcroFormTemplateManifest, expected: object): void {
  const expectedRecord = expected as Record<string, unknown>;

  function deepEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true;
    if (a == null || b == null) return a === b;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, index) => deepEqual(item, b[index]));
    }
    if (typeof a === "object" && typeof b === "object") {
      const aKeys = Object.keys(a as object).sort();
      const bKeys = Object.keys(b as object).sort();
      if (aKeys.length !== bKeys.length) return false;
      return aKeys.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
    }
    return false;
  }

  function compareField(path: string, actualValue: unknown, expectedValue: unknown): void {
    if (!deepEqual(actualValue, expectedValue)) {
      throw new AcroFormImportError(
        `Expected manifest mismatch at ${path}: got ${JSON.stringify(actualValue)}, expected ${JSON.stringify(expectedValue)}.`,
        "MANIFEST_MISMATCH",
      );
    }
  }

  compareField("templateCode", actual.templateCode, expectedRecord.templateCode);
  compareField("templateVersion", actual.templateVersion, expectedRecord.templateVersion);
  compareField("titleEn", actual.titleEn, expectedRecord.titleEn);
  compareField("titleAr", actual.titleAr, expectedRecord.titleAr);
  compareField(
    "acroFormAuthoringArtifact.pageCount",
    actual.acroFormAuthoringArtifact.pageCount,
    (expectedRecord.acroFormAuthoringArtifact as Record<string, unknown> | undefined)?.pageCount,
  );
  compareField(
    "acroFormAuthoringArtifact.pageSizePoints",
    actual.acroFormAuthoringArtifact.pageSizePoints,
    (expectedRecord.acroFormAuthoringArtifact as Record<string, unknown> | undefined)?.pageSizePoints,
  );
  compareField(
    "canonicalApprovedPdf.pageCount",
    actual.canonicalApprovedPdf.pageCount,
    (expectedRecord.canonicalApprovedPdf as Record<string, unknown> | undefined)?.pageCount,
  );
  compareField(
    "canonicalApprovedPdf.pageSizePoints",
    actual.canonicalApprovedPdf.pageSizePoints,
    (expectedRecord.canonicalApprovedPdf as Record<string, unknown> | undefined)?.pageSizePoints,
  );
  compareField("fieldCounts", actual.fieldCounts, expectedRecord.fieldCounts);

  const expectedFields = expectedRecord.fields;
  if (Array.isArray(expectedFields)) {
    const actualFields = actual.fields;
    if (actualFields.length !== expectedFields.length) {
      throw new AcroFormImportError(
        `Field count mismatch: imported ${actualFields.length}, expected ${expectedFields.length}.`,
        "FIELD_COUNT_MISMATCH",
      );
    }
    const actualByName = new Map(actualFields.map((f) => [f.name, f]));
    for (const rawExpected of expectedFields) {
      const expectedField = rawExpected as Record<string, unknown>;
      const name = String(expectedField.name ?? "");
      const actualField = actualByName.get(name);
      if (!actualField) {
        throw new AcroFormImportError(`Expected field "${name}" not found in imported manifest.`, "EXPECTED_FIELD_MISSING");
      }
      compareField(`fields[${name}].type`, actualField.type, expectedField.type);
      compareField(`fields[${name}].flags`, actualField.flags, expectedField.flags);
      compareField(`fields[${name}].widgets`, actualField.widgets, expectedField.widgets);
    }
  }
}
