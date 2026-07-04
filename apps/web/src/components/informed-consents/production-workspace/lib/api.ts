import type {
  ProductionPatient,
  ProductionEncounter,
  ProductionAssembly,
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

export async function resolveContentMapping(args: {
  procedure: string;
  tenantId: string;
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
  if (args.reviewMode) {
    params.set("reviewMode", "true");
  }

  const response = await fetch(`/api/modules/informed-consents/content-mapping/resolve?${params.toString()}`);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    return { ok: false, found: false, error: String(payload.error || "Content mapping request failed.") };
  }

  if (!payload.found) {
    return { ok: true, found: false, error: String(payload.error || "No content mapping found for this procedure.") };
  }

  return {
    ok: true,
    found: true,
    ckeEnabled: Boolean(payload.ckeEnabled),
    clinicalKnowledgeAssembly: payload.clinicalKnowledgeAssembly as ProductionAssembly | undefined,
  };
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
  Array<{
    id: string;
    titleEn: string;
    titleAr: string;
    specialty: string;
    department: string;
    anesthesiaRequired: boolean;
  }>
> {
  const response = await fetch(`/api/modules/clinical-content/procedures?tenantId=${encodeURIComponent(tenantId)}`);
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || !payload.ok) {
    throw new Error(String(payload.error || "Failed to load procedures."));
  }
  return Array.isArray(payload.procedures) ? (payload.procedures as Array<{
    id: string;
    titleEn: string;
    titleAr: string;
    specialty: string;
    department: string;
    anesthesiaRequired: boolean;
  }>) : [];
}
