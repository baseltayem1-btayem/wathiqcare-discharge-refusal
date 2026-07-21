import type {
  ProductionPatient,
  ProductionEncounter,
  ProductionAssembly,
  ProductionProcedure,
  SecureSigningResult,
  TimelineEvent,
} from "../types";

export async function searchPatients(query: string): Promise<ProductionPatient[]> {
  const response = await fetch(`/api/modules/informed-consents/patients/search?q=${encodeURIComponent(query)}`);
  const payload = (await response.json().catch(() => [])) as unknown;
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error || "Patient search failed.");
  }
  return Array.isArray(payload) ? payload : [];
}

export async function getPatientEncounters(mrn: string): Promise<ProductionEncounter[]> {
  const response = await fetch(`/api/modules/informed-consents/patients/${encodeURIComponent(mrn)}/encounters`);
  const payload = (await response.json().catch(() => [])) as unknown;
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error || "Failed to load patient encounters.");
  }
  return Array.isArray(payload) ? payload : [];
}

export type ConsentFieldMappingReadiness = {
  ok?: boolean;
  source?: string;
  formId: string;
  slug?: string;
  hasMapping: boolean;
  verificationStatus: string;
  sendBlocked: boolean;
  blockers: string[];
  requiredDoctorFields: Array<{
    key: string;
    labelEn: string;
    section?: string;
    type: string;
  }>;
  requiredAnesthesiaFields: Array<{
    key: string;
    labelEn: string;
    section?: string;
    type: string;
    requiredWhen?: string;
  }>;
  requiredPatientFields: Array<{
    key: string;
    labelEn: string;
    type: string;
  }>;
  persistedVerification?: {
    status: string;
    approvedAt: string;
    approvedByUserId: string | null;
    mappingHash: string;
    formVersion?: string;
  } | null;
  /** Safe diagnostic about the optional ConsentForm persistence table. */
  persistence?: {
    available: boolean;
    reason?: string;
  };
  /** AcroForm-specific canonical identity and manifest state. */
  interpreterApplicable?: boolean;
  substituteDecisionMakerApplicable?: boolean;
  witnessApplicable?: boolean;
  acroForm?: {
    canonicalTemplateIdentity: {
      formId: string;
      slug: string;
      titleEn: string;
      titleAr?: string;
      templateCode?: string;
      layoutFamily: string;
    };
    manifestState: {
      present: boolean;
      hashMatches: boolean;
      hash: string | null;
      status: "READY" | "NOT_READY";
      blockers: string[];
    };
    semanticPhysicianFields: Array<{
      key: string;
      labelEn: string;
      labelAr?: string;
      section?: string;
      type: string;
      required: boolean;
      requiredWhen?: string;
      role: string;
    }>;
    patientSignatureTargets: Array<{
      key: string;
      labelEn: string;
      labelAr?: string;
      role: string;
    }>;
    physicianSignatureTargets: Array<{
      key: string;
      labelEn: string;
      labelAr?: string;
      role: string;
    }>;
    interpreterApplicable: boolean;
    anesthesiaApplicable: boolean;
    educationRequired: boolean;
    substituteDecisionMakerApplicable: boolean;
    witnessApplicable: boolean;
  } | null;
};

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function parseAcroFormReadiness(value: unknown): ConsentFieldMappingReadiness["acroForm"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;

  const identity = record.canonicalTemplateIdentity;
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) return undefined;
  const identityRecord = identity as Record<string, unknown>;

  const manifest = record.manifestState;
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return undefined;
  const manifestRecord = manifest as Record<string, unknown>;

  const readStringField = (target: Record<string, unknown>, key: string): string =>
    typeof target[key] === "string" ? String(target[key]).trim() : "";

  const readBooleanField = (target: Record<string, unknown>, key: string): boolean =>
    Boolean(target[key]);

  const parseSignatureTarget = (item: unknown): { key: string; labelEn: string; labelAr?: string; role: string } | null => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const r = item as Record<string, unknown>;
    const key = readStringField(r, "key");
    const labelEn = readStringField(r, "labelEn");
    const role = readStringField(r, "role");
    if (!key || !labelEn) return null;
    return {
      key,
      labelEn,
      labelAr: readOptionalString(r.labelAr),
      role,
    };
  };

  const parseSemanticField = (item: unknown): {
    key: string;
    labelEn: string;
    labelAr?: string;
    section?: string;
    type: string;
    required: boolean;
    requiredWhen?: string;
    role: string;
  } | null => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const r = item as Record<string, unknown>;
    const key = readStringField(r, "key");
    const labelEn = readStringField(r, "labelEn");
    const type = readStringField(r, "type");
    const role = readStringField(r, "role");
    if (!key || !labelEn || !type) return null;
    return {
      key,
      labelEn,
      labelAr: readOptionalString(r.labelAr),
      section: readOptionalString(r.section),
      type,
      required: readBooleanField(r, "required"),
      requiredWhen: readOptionalString(r.requiredWhen),
      role,
    };
  };

  const parseArray = <T>(
    arr: unknown,
    parser: (item: unknown) => T | null,
  ): T[] => {
    if (!Array.isArray(arr)) return [];
    return arr.map(parser).filter((item): item is T => item !== null);
  };

  return {
    canonicalTemplateIdentity: {
      formId: readStringField(identityRecord, "formId"),
      slug: readStringField(identityRecord, "slug"),
      titleEn: readStringField(identityRecord, "titleEn"),
      titleAr: readOptionalString(identityRecord.titleAr),
      templateCode: readOptionalString(identityRecord.templateCode),
      layoutFamily: readStringField(identityRecord, "layoutFamily"),
    },
    manifestState: {
      present: readBooleanField(manifestRecord, "present"),
      hashMatches: readBooleanField(manifestRecord, "hashMatches"),
      hash: typeof manifestRecord.hash === "string" ? manifestRecord.hash : null,
      status: manifestRecord.status === "READY" || manifestRecord.status === "NOT_READY" ? manifestRecord.status : "NOT_READY",
      blockers: Array.isArray(manifestRecord.blockers)
        ? manifestRecord.blockers.map(String)
        : [],
    },
    semanticPhysicianFields: parseArray(record.semanticPhysicianFields, parseSemanticField),
    patientSignatureTargets: parseArray(record.patientSignatureTargets, parseSignatureTarget),
    physicianSignatureTargets: parseArray(record.physicianSignatureTargets, parseSignatureTarget),
    interpreterApplicable: readBooleanField(record, "interpreterApplicable"),
    anesthesiaApplicable: readBooleanField(record, "anesthesiaApplicable"),
    educationRequired: readBooleanField(record, "educationRequired"),
    substituteDecisionMakerApplicable: readBooleanField(record, "substituteDecisionMakerApplicable"),
    witnessApplicable: readBooleanField(record, "witnessApplicable"),
  };
}

export async function fetchConsentFieldMappingReadiness(formId: string): Promise<ConsentFieldMappingReadiness> {
  const response = await fetch(
    `/api/modules/informed-consents/forms/${encodeURIComponent(formId)}/field-mapping`,
    {
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || payload.ok === false) {
    throw new Error(String(payload.error || "Failed to load consent field mapping readiness."));
  }

  return {
    ok: Boolean(payload.ok ?? true),
    source: payload.source ? String(payload.source) : undefined,
    formId: String(payload.formId || formId),
    slug: payload.slug ? String(payload.slug) : undefined,
    hasMapping: Boolean(payload.hasMapping),
    verificationStatus: String(payload.verificationStatus || "MISSING"),
    sendBlocked: Boolean(payload.sendBlocked),
    blockers: Array.isArray(payload.blockers) ? payload.blockers.map(String) : [],
    requiredDoctorFields: Array.isArray(payload.requiredDoctorFields)
      ? payload.requiredDoctorFields as ConsentFieldMappingReadiness["requiredDoctorFields"]
      : [],
    requiredAnesthesiaFields: Array.isArray(payload.requiredAnesthesiaFields)
      ? payload.requiredAnesthesiaFields as ConsentFieldMappingReadiness["requiredAnesthesiaFields"]
      : [],
    requiredPatientFields: Array.isArray(payload.requiredPatientFields)
      ? payload.requiredPatientFields as ConsentFieldMappingReadiness["requiredPatientFields"]
      : [],
    persistedVerification: payload.persistedVerification
      ? {
          status: String((payload.persistedVerification as Record<string, unknown>).status || ""),
          approvedAt: String((payload.persistedVerification as Record<string, unknown>).approvedAt || ""),
          approvedByUserId:
            typeof (payload.persistedVerification as Record<string, unknown>).approvedByUserId === "string"
              ? (String((payload.persistedVerification as Record<string, unknown>).approvedByUserId) as string)
              : null,
          mappingHash: String((payload.persistedVerification as Record<string, unknown>).mappingHash || ""),
          formVersion:
            typeof (payload.persistedVerification as Record<string, unknown>).formVersion === "string"
              ? String((payload.persistedVerification as Record<string, unknown>).formVersion)
              : undefined,
        }
      : null,
    acroForm: parseAcroFormReadiness(payload.acroForm),
  };
}

export async function verifyConsentFieldMapping(formId: string): Promise<ConsentFieldMappingReadiness> {
  const response = await fetch(
    `/api/modules/informed-consents/forms/${encodeURIComponent(formId)}/field-mapping`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "verify" }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || payload.ok === false) {
    throw new Error(String(payload.error || "Failed to verify consent field mapping."));
  }

  return fetchConsentFieldMappingReadiness(formId);
}

export async function resolveContentMapping(args: {
  procedure: string;
  tenantId: string;
  procedureId?: string;
  procedureCode?: string;
  categoryCode?: string;
  reviewMode?: boolean;
  patientContext?: {
    capacityStatus?: string;
    languagePreference?: string;
    guardianName?: string;
    guardianRelationship?: string;
  };
  physicianContext?: {
    physicianId: string;
    name: string;
    licenseNumber: string;
    specialty: string;
    department: string;
  };
}): Promise<{
  ok: boolean;
  found: boolean;
  ckeEnabled?: boolean;
  clinicalKnowledgeAssembly?: ProductionAssembly;
  error?: string;
}> {
  const params = new URLSearchParams();
  params.set("procedure", args.procedure);
  params.set("tenantId", args.tenantId);
  params.set("useCke", "true");
  params.set("language", args.patientContext?.languagePreference || "bilingual");
  if (args.procedureId) params.set("procedureId", args.procedureId);
  if (args.procedureCode) params.set("procedureCode", args.procedureCode);
  if (args.categoryCode) params.set("categoryCode", args.categoryCode);
  if (args.reviewMode) {
    params.set("reviewMode", "true");
  }

  const response = await fetch(`/api/modules/informed-consents/content-mapping/resolve?${params.toString()}`);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    return { ok: false, found: false, error: String(payload.error || "Content mapping request failed.") };
  }

  if (payload.clinicalKnowledgeAssembly) {
    return {
      ok: true,
      found: true,
      ckeEnabled: Boolean(payload.ckeEnabled ?? true),
      clinicalKnowledgeAssembly: payload.clinicalKnowledgeAssembly as ProductionAssembly,
    };
  }

  const mapping = (payload.mapping || payload.package || {}) as Record<string, unknown>;
  const packageRecord = (payload.package || {}) as Record<string, unknown>;
  const consentTemplate = (packageRecord.consentTemplate || mapping || {}) as Record<string, unknown>;

  const resolvedProcedureId = String(
    mapping.procedureId ||
      mapping.templateId ||
      mapping.id ||
      args.procedureId ||
      args.procedureCode ||
      args.procedure ||
      "procedure"
  );

  const resolvedProcedureCode = String(
    mapping.procedureCode ||
      mapping.templateCode ||
      mapping.templateId ||
      args.procedureCode ||
      resolvedProcedureId
  );

  const procedureNameEn = String(
    mapping.procedure ||
      mapping.procedureNameEn ||
      mapping.titleEn ||
      args.procedure ||
      "Clinical Procedure"
  );

  const procedureNameAr = String(mapping.procedureNameAr || mapping.titleAr || "");

  const approvedPdfUrl = String(
    consentTemplate.pdfUrl ||
      consentTemplate.pdfTemplateUrl ||
      consentTemplate.sourcePdfUrl ||
      consentTemplate.approvedPdfUrl ||
      mapping.pdfUrl ||
      mapping.pdfTemplateUrl ||
      mapping.sourcePdfUrl ||
      mapping.approvedPdfUrl ||
      ""
  );

  if (payload.ok === true && (payload.mapping || payload.package || payload.source === "forms_fallback_mapping")) {
    const assembly = {
      assemblyId: String(payload.assemblyId || `assembly-${resolvedProcedureId}`),
      packageId: String(packageRecord.packageId || `package-${resolvedProcedureId}`),
      procedureId: resolvedProcedureId,
      procedureCode: resolvedProcedureCode,
      procedureNameEn,
      procedureNameAr,
      status: "ready",
      consentForm: {
        id: String(consentTemplate.id || mapping.templateId || resolvedProcedureId),
        code: String(consentTemplate.code || mapping.templateCode || resolvedProcedureCode),
        titleEn: String(consentTemplate.titleEn || mapping.titleEn || procedureNameEn),
        titleAr: String(consentTemplate.titleAr || mapping.titleAr || procedureNameAr),
        formType: String(consentTemplate.formType || mapping.category || mapping.consentType || args.categoryCode || "procedure"),
        riskLevel: String(consentTemplate.riskLevel || mapping.riskLevel || "medium"),
        version: String(consentTemplate.version || mapping.version || "1.0"),
        pdfTemplateUrl: approvedPdfUrl,
        pdfUrl: approvedPdfUrl,
        sourcePdfUrl: approvedPdfUrl,
        approvedPdfUrl: approvedPdfUrl,
        sourceAvailable: Boolean(approvedPdfUrl),
        requiresWitness: Boolean(consentTemplate.requiresWitness || false),
        requiresInterpreter: Boolean(consentTemplate.requiresInterpreter || false),
      },
      educationMaterials: [],
      riskDisclosures: [],
      illustrations: [],
      suggestions: [],
      blockers: [],
      requiredParticipants: [],
    } as unknown as ProductionAssembly;

    return {
      ok: true,
      found: true,
      ckeEnabled: true,
      clinicalKnowledgeAssembly: assembly,
    };
  }

  return { ok: true, found: false, error: String(payload.error || "No content mapping found for this procedure.") };
}
export async function sendSecureSigningLink(args: {
  tenantId: string;
  documentId: string;
  caseId: string;
  patientName: string;
  mobileNumber: string;
  recipientEmail: string;
  locale?: "ar" | "en";
}): Promise<SecureSigningResult> {
  const response = await fetch("/api/modules/informed-consents/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || !payload.ok) {
    throw new Error(String(payload.error || "Failed to send secure signing link."));
  }

  return payload.workflow as SecureSigningResult;
}

export async function dryRunSendSecureSigningLink(args: {
  tenantId: string;
  documentId: string;
  caseId: string;
  patientName: string;
  mobileNumber: string;
  recipientEmail: string;
  locale?: "ar" | "en";
}): Promise<{ ok: boolean; dryRun: boolean; message?: string }> {
  const response = await fetch("/api/modules/informed-consents/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...args, dryRun: true }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || !payload.ok) {
    throw new Error(String(payload.error || "Dry-run send validation failed."));
  }

  return {
    ok: true,
    dryRun: Boolean(payload.dryRun),
    message: String(payload.message || "Dry-run passed."),
  };
}

export async function fetchTimeline(args: {
  tenantId: string;
  caseId?: string;
  documentId?: string;
}): Promise<TimelineEvent[]> {
  const params = new URLSearchParams();
  params.set("tenantId", args.tenantId);
  if (args.caseId) params.set("caseId", args.caseId);
  if (args.documentId) params.set("documentId", args.documentId);

  const response = await fetch(`/api/modules/informed-consents/timeline?${params.toString()}`);
  const payload = (await response.json().catch(() => [])) as unknown;

  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error || "Failed to load timeline.");
  }

  return Array.isArray(payload) ? payload : [];
}

export async function createConsentDocument(args: {
  caseId: string;
  templateId?: string;
  approvedConsentFormId?: string;
  language?: "ar" | "en" | "bilingual";
  physicianName?: string;
  physicianLicense?: string;
  physicianSpecialty?: string;
  department?: string;
  diagnosis?: string;
  plannedProcedure?: string;
  dob?: string;
  gender?: string;
  initialStatus?: "DRAFT" | "READY_FOR_SIGNATURE";
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; consentReference: string; status: string; patientName?: string | null; mrn?: string | null }> {
  const response = await fetch("/api/modules/informed-consents/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || !payload.ok) {
    throw new Error(String(payload.error || "Failed to create consent document."));
  }
  const doc = payload.document as Record<string, unknown>;
  return {
    id: String(doc.id),
    consentReference: String(doc.consentReference),
    status: String(doc.status),
    patientName: doc.patientName ? String(doc.patientName) : null,
    mrn: doc.mrn ? String(doc.mrn) : null,
  };
}

export async function capturePhysicianSignatureForDocument(args: {
  documentId: string;
  signatureDataUrl: string;
}): Promise<{
  ok: true;
  alreadyCaptured: boolean;
  signatureId: string;
  status: string;
}> {
  const response = await fetch(
    `/api/modules/informed-consents/documents/${encodeURIComponent(args.documentId)}/physician-signature`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },

      body: JSON.stringify({
        signatureDataUrl:
          args.signatureDataUrl,
      }),
    },
  );

  const payload =
    (await response
      .json()
      .catch(() => ({}))) as Record<string, unknown>;

  if (
    !response.ok
    || payload.ok !== true
  ) {
    throw new Error(
      String(
        payload.error
        || "Failed to capture the treating physician signature.",
      ),
    );
  }

  return {
    ok: true,

    alreadyCaptured:
      Boolean(
        payload.alreadyCaptured,
      ),

    signatureId:
      String(
        payload.signatureId
        || "",
      ),

    status:
      String(
        payload.status
        || "",
      ),
  };
}

export async function sendSecureSigningLinkForDocument(args: {
  documentId: string;
  caseId: string;
  patientName: string;
  mobileNumber: string;
  recipientEmail: string;
  physicianName?: string;
  locale?: "ar" | "en";
}): Promise<SecureSigningResult> {
  const response = await fetch(`/api/modules/informed-consents/documents/${encodeURIComponent(args.documentId)}/secure-signing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || !payload.ok) {
    throw new Error(String(payload.error || "Failed to send secure signing link."));
  }
  return payload.workflow as SecureSigningResult;
}

export async function checkSendEligibility(args: {
  mobileNumber: string;
  recipientEmail: string;
}): Promise<{ pilotEnabled: boolean; allowlisted: boolean; reason: string }> {
  const response = await fetch("/api/modules/informed-consents/send-eligibility", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || !payload.ok) {
    throw new Error(String(payload.error || "Failed to check send eligibility."));
  }
  return {
    pilotEnabled: Boolean(payload.pilotEnabled),
    allowlisted: Boolean(payload.allowlisted),
    reason: String(payload.reason),
  };
}

export async function fetchProcedures(tenantId: string): Promise<
  ProductionProcedure[]
> {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenantId", tenantId);

  const response = await fetch(`/api/modules/informed-consents/imc-library?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok || payload.ok === false) {
    throw new Error(String(payload.error || "Failed to load procedures."));
  }

  const sourceItems =
    Array.isArray(payload.procedures)
      ? payload.procedures
      : Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload.templates)
          ? payload.templates
          : [];

  return sourceItems.map((item) => {
    const record = item as Record<string, unknown>;

    const id = String(record.id || record.templateId || record.templateCode || record.procedureCode || "");
    const procedure = String(record.procedure || record.procedureName || record.titleEn || "Clinical Procedure");
    const titleEn = String(record.titleEn || procedure);
    const titleAr = String(record.titleAr || "");
    const category = String(record.category || record.categoryCode || record.consentType || record.templateType || "procedure");
    const specialty = String(record.specialty || record.department || "");

    return {
      id,
      titleEn: procedure || titleEn,
      titleAr,
      procedureCode: String(record.procedureCode || id),
      categoryCode: category,
      consentType: category,
      templateType: category,
      specialty,
      department: String(record.department || specialty),
      riskLevel: String(record.riskLevel || "medium"),
      source: String(record.source || "imc_library"),
      anesthesiaRequired: Boolean(record.anesthesiaRequired || false),
    } as unknown as ProductionProcedure;
  }).filter((procedure) => Boolean(procedure.id));
}




export async function createDoctorCompletedDraftPdfPreview(
  args: {
    formId: string;
    approvedPdfUrl: string;
    doctorCompletionValues: Record<string, string>;
    physicianSignatureDataUrl: string;
  },
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(
    "/api/modules/informed-consents/forms/" + encodeURIComponent(args.formId) + "/draft-pdf",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/pdf" },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        approvedPdfUrl: args.approvedPdfUrl,
        doctorCompletionValues: args.doctorCompletionValues,
        physicianSignatureDataUrl:
          args.physicianSignatureDataUrl,
      }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(String(payload.error || "Failed to generate doctor-completed draft PDF."));
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export type AcroFormFilledDraftPreviewInput = {
  formId: string;
  approvedPdfUrl: string;
  manifestHash: string;
  doctorCompletionValues: Record<string, string>;
  patientDisplay: {
    name: string;
    mrn: string;
    dob?: string | null;
  };
  physicianContext: {
    name: string;
    designation?: string | null;
    designationEn?: string | null;
    designationAr?: string | null;
  };
  encounterReference?: {
    id?: string;
    encounterId?: string;
  };
  correlationId?: string;
  /**
   * Physician signature image captured in the workspace. Rendered in the filled
   * draft preview for visual review only; the authenticated legal evidence is
   * captured separately at send time.
   */
  physicianSignatureDataUrl?: string;
};

export type AcroFormFilledDraftPreviewResult = {
  url: string;
  fingerprint: string;
};

export async function createAcroFormFilledDraftPreview(
  args: AcroFormFilledDraftPreviewInput,
  signal?: AbortSignal,
): Promise<AcroFormFilledDraftPreviewResult> {
  const response = await fetch(
    "/api/modules/informed-consents/forms/" + encodeURIComponent(args.formId) + "/draft-pdf",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/pdf" },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        approvedPdfUrl: args.approvedPdfUrl,
        manifestHash: args.manifestHash,
        doctorCompletionValues: args.doctorCompletionValues,
        patientDisplay: args.patientDisplay,
        physicianContext: args.physicianContext,
        encounterReference: args.encounterReference,
        correlationId: args.correlationId,
        physicianSignatureDataUrl: args.physicianSignatureDataUrl,
      }),
    },
  );

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    throw new Error(String(payload.error || "Failed to generate filled draft preview."));
  }

  const fingerprint = response.headers.get("X-WathiqCare-Draft-Fingerprint") || "";
  const blob = await response.blob();
  return {
    url: URL.createObjectURL(blob),
    fingerprint,
  };
}
