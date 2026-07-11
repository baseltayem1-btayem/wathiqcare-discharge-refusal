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
};

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
  };
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
    } as ProductionAssembly;

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
  physicianSpecialty?: string;
  department?: string;
  diagnosis?: string;
  plannedProcedure?: string;
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
    } as ProductionProcedure;
  }).filter((procedure) => Boolean(procedure.id));
}




export async function createDoctorCompletedDraftPdfPreview(
  args: {
    formId: string;
    approvedPdfUrl: string;
    doctorCompletionValues: Record<string, string>;
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
