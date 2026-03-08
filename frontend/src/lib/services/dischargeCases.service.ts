import { apiFetch } from "@/utils/api";
import { viewProtectedDocument } from "@/utils/protectedDocuments";

export type DischargeCaseDetail = {
  id: string;
  patient_mrn: string;
  patient_name: string;
  status: string;
  refusal_reason?: string;
  signer_name?: string;
  signer_role?: string;
  signature_text?: string;
  signed_at?: string;
  created_at?: string;
  pdf_file?: string;
};

type CaseApiResponse = {
  id: string;
  status?: string | null;
  patientName?: string | null;
  medicalRecordNo?: string | null;
  createdAt?: string | null;
  metadata?: Record<string, unknown> | null;
};

function metadataString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | undefined {
  if (!metadata) {
    return undefined;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function mapCaseApiResponseToDetail(input: CaseApiResponse): DischargeCaseDetail {
  const metadata = input.metadata && typeof input.metadata === "object" ? input.metadata : null;

  return {
    id: input.id,
    patient_mrn:
      input.medicalRecordNo ||
      metadataString(metadata, "medical_record_number", "patient_mrn") ||
      "-",
    patient_name: input.patientName || metadataString(metadata, "patient_name") || "-",
    status: input.status || "OPEN",
    refusal_reason: metadataString(metadata, "refusal_reason"),
    signer_name: metadataString(metadata, "signer_name"),
    signer_role: metadataString(metadata, "signer_role"),
    signature_text: metadataString(metadata, "signature_text"),
    signed_at: metadataString(metadata, "signed_at"),
    created_at: input.createdAt || undefined,
    pdf_file: metadataString(metadata, "pdf_file"),
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
