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
    return apiFetch<DischargeCaseDetail>(`/api/discharge/cases/${encodeURIComponent(caseId)}`);
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
