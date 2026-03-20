import { apiFetch } from "@/utils/api";
import { viewProtectedDocument } from "@/utils/protectedDocuments";

export type DischargeCaseDetail = {
  id: string;
  patient_mrn: string;
  patient_name: string;
  patient_id_number?: string;
  date_of_birth?: string;
  gender?: string;
  mobile_number?: string;
  guardian_name?: string;
  attending_physician?: string;
  department?: string;
  room_number?: string;
  status: string;
  refusal_reason?: string;
  signer_name?: string;
  signer_role?: string;
  signature_text?: string;
  signed_at?: string;
  created_at?: string;
  pdf_file?: string;
  discharge_route?: string;
  workflow_stages?: string[];
  metadata?: Record<string, unknown>;
};

type CaseApiDocument = {
  id: string;
  templateKey?: string | null;
  fileName?: string | null;
  signedAt?: string | null;
  generatedAt?: string | null;
  payloadJson?: Record<string, unknown> | null;
};

type CaseApiResponse = {
  id: string;
  status?: string | null;
  patientName?: string | null;
  patientIdNumber?: string | null;
  medicalRecordNo?: string | null;
  roomNumber?: string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
  documents?: CaseApiDocument[] | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readPathString(
  source: Record<string, unknown> | null | undefined,
  path: string[]
): string | undefined {
  if (!source) {
    return undefined;
  }

  let current: unknown = source;
  for (const segment of path) {
    const record = asRecord(current);
    if (!record) {
      return undefined;
    }

    current = record[segment];
  }

  return typeof current === "string" && current.trim() ? current : undefined;
}

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: Array<string | string[]>
): string | undefined {
  if (!metadata) {
    return undefined;
  }

  for (const key of keys) {
    const path = Array.isArray(key) ? key : [key];
    const value = readPathString(metadata, path);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function latestSignedDocument(documents: CaseApiDocument[] | null | undefined): CaseApiDocument | undefined {
  if (!documents || documents.length === 0) {
    return undefined;
  }

  return [...documents]
    .filter((document) => typeof document.signedAt === "string" && document.signedAt.trim().length > 0)
    .sort((left, right) => {
      const leftTime = new Date(left.signedAt || left.generatedAt || 0).getTime();
      const rightTime = new Date(right.signedAt || right.generatedAt || 0).getTime();
      return rightTime - leftTime;
    })[0];
}

function documentPayloadString(
  document: CaseApiDocument | undefined,
  ...keys: Array<string | string[]>
): string | undefined {
  const payload = asRecord(document?.payloadJson);
  if (!payload) {
    return undefined;
  }

  return metadataString(payload, ...keys);
}

function mapCaseApiResponseToDetail(input: CaseApiResponse): DischargeCaseDetail {
  const metadata = asRecord(input.metadata);
  const workflowStagesRaw = metadata?.workflow_stages;
  const workflowStages = Array.isArray(workflowStagesRaw)
    ? workflowStagesRaw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;
  const signedDocument = latestSignedDocument(input.documents);

  return {
    id: input.id,
    patient_mrn:
      input.medicalRecordNo ||
      metadataString(metadata, ["workflow", "medical_record_number"], "medical_record_number", "patient_mrn") ||
      "-",
    patient_name:
      input.patientName ||
      metadataString(metadata, ["workflow", "patient_name"], "patient_name") ||
      "-",
    patient_id_number:
      input.patientIdNumber ||
      metadataString(metadata, ["workflow", "patient_id_number"], "patient_id_number", "id_number", "national_id"),
    date_of_birth: metadataString(metadata, ["discharge_plan", "date_of_birth"], "date_of_birth", "dob"),
    gender: metadataString(metadata, ["discharge_plan", "gender"], "gender", "sex"),
    mobile_number: metadataString(
      metadata,
      ["discharge_plan", "primary_mobile"],
      "primary_mobile",
      "mobile_number",
      "phone",
      "phone_number"
    ),
    guardian_name: metadataString(
      metadata,
      ["discharge_plan", "legal_guardian"],
      "guardian_name",
      "guardian",
      "next_of_kin",
      "legal_guardian"
    ),
    attending_physician: metadataString(
      metadata,
      ["workflow", "attending_physician"],
      "attending_physician",
      "doctor_name"
    ),
    department: metadataString(
      metadata,
      "admission_department",
      "department",
      "ward",
      ["workflow", "responsible_department"]
    ),
    room_number:
      input.roomNumber ||
      metadataString(metadata, ["workflow", "room_number"], "room_number", "room"),
    status: input.status || "OPEN",
    refusal_reason: metadataString(metadata, ["workflow", "refusal_reason"], "refusal_reason"),
    signer_name:
      metadataString(metadata, "signer_name") ||
      documentPayloadString(
        signedDocument,
        "signer_name",
        "signerName",
        "patient_name_or_guardian",
        "patient_name",
        "patientName",
        "legal_guardian",
        "guardian_name"
      ),
    signer_role:
      metadataString(metadata, "signer_role") ||
      documentPayloadString(
        signedDocument,
        "signer_role",
        "signerRole",
        "signer_relation",
        "signerRelation",
        "relationship",
        "representative_relation"
      ),
    signature_text: metadataString(metadata, "signature_text"),
    signed_at: metadataString(metadata, "signed_at") || signedDocument?.signedAt || undefined,
    created_at: input.createdAt || undefined,
    pdf_file: metadataString(metadata, "pdf_file"),
    discharge_route: metadataString(metadata, ["discharge_plan", "discharge_route"], "discharge_route"),
    workflow_stages: workflowStages,
    metadata: metadata || undefined,
  };
}

export type EvidenceBundleResponse = {
  bundle_file: string;
};

export interface DischargeCasesService {
  getCaseDetail(caseId: string): Promise<DischargeCaseDetail>;
  generateEvidenceBundle(caseId: string): Promise<EvidenceBundleResponse>;
  openRefusalPdf(fileName: string): Promise<void>;
}

class ApiDischargeCasesService implements DischargeCasesService {
  async getCaseDetail(caseId: string): Promise<DischargeCaseDetail> {
    const response = await apiFetch<CaseApiResponse>(`/api/cases/${encodeURIComponent(caseId)}`);
    return mapCaseApiResponseToDetail(response);
  }

  async generateEvidenceBundle(caseId: string): Promise<EvidenceBundleResponse> {
    return apiFetch<EvidenceBundleResponse>(`/api/discharge/evidence-bundle/${encodeURIComponent(caseId)}`, {
      method: "POST",
    });
  }

  async openRefusalPdf(fileName: string): Promise<void> {
    await viewProtectedDocument(`/api/discharge/pdf/${encodeURIComponent(fileName)}`);
  }
}

export const dischargeCasesService: DischargeCasesService = new ApiDischargeCasesService();
