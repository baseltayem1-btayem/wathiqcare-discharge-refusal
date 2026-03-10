import { apiFetch } from "@/utils/api";
import type { RefusalForm, SignatureData, RefusalFormStatus } from "@/types/refusal-forms";

class RefusalFormsService {
  /**
   * Get all refusal forms
   */
  async listForms(): Promise<RefusalForm[]> {
    try {
      const cases = await apiFetch<any[]>("/api/cases?limit=200");

      const forms: RefusalForm[] = [];

      for (const caseData of cases) {
        // Get workflow documents for each case
        try {
          const workflow = await apiFetch<any>(
            `/api/discharge/cases/${encodeURIComponent(caseData.id)}/workflow`
          );

          if (workflow && workflow.documents) {
            for (const doc of workflow.documents) {
              if (doc.documentType === "discharge_refusal_form" ||
                doc.documentType === "financial_responsibility_notice") {
                forms.push(this.transformToForm(doc, caseData, workflow));
              }
            }
          }
        } catch (error) {
          // Case might not have workflow yet, skip
          continue;
        }
      }

      return forms;
    } catch (error) {
      console.error("Failed to fetch refusal forms:", error);
      return [];
    }
  }

  /**
   * Get a single form by ID
   */
  async getForm(formId: string): Promise<RefusalForm | null> {
    try {
      // TODO: Implement when backend endpoint is available
      return null;
    } catch (error) {
      console.error("Failed to fetch form:", error);
      return null;
    }
  }

  /**
   * Sign a refusal form
   */
  async signForm(
    formId: string,
    signatureData: SignatureData
  ): Promise<void> {
    await apiFetch(`/api/documents/${encodeURIComponent(formId)}/sign`, {
      method: "POST",
      body: JSON.stringify({
        payload: {
          signerName: signatureData.signerName,
          signerRelation: signatureData.signerRelation,
          witnessName: signatureData.witnessName,
          witnessTitle: signatureData.witnessTitle,
          acknowledgedRisks: signatureData.acknowledgedRisks,
          acknowledgedFinancial: signatureData.acknowledgedFinancial,
          signatureData: "captured_from_ui",
        },
      }),
    });
  }

  /**
   * Download a form
   */
  getDownloadUrl(documentId: string): string {
    return `/api/documents/${documentId}/download`;
  }

  /**
   * Transform backend document to refusal form
   */
  private transformToForm(doc: any, caseData: any, workflow: any): RefusalForm {
    const status = this.determineStatus(doc, workflow);

    return {
      id: doc.id,
      caseId: caseData.id,
      caseNumber: caseData.caseNumber || caseData.id,
      patientName: workflow.patientName || caseData.patientName || "Unknown",
      patientIdNumber: workflow.patientIdNumber || "",
      medicalRecordNumber: workflow.medicalRecordNumber || "",
      formType: doc.documentType === "financial_responsibility_notice"
        ? "financial_responsibility"
        : "discharge_refusal",
      status,
      generatedAt: doc.generatedAt || doc.createdAt || new Date().toISOString(),
      signedAt: workflow.patientSignedAt || null,
      signerName: workflow.patientName || null,
      witnessName: workflow.witness1Name || null,
      attendingPhysician: workflow.attendingPhysicianName || null,
      refusalReason: workflow.refusalReason || null,
      documentUrl: doc.id ? `/api/documents/${doc.id}/download` : null,
    };
  }

  private determineStatus(doc: any, workflow: any): RefusalFormStatus {
    if (workflow.escalatedAt || workflow.status === "escalated") {
      return "escalated";
    }
    if (workflow.patientSignedAt) {
      return "signed";
    }
    if (workflow.status === "closed") {
      return "completed";
    }
    return "pending";
  }
}

export const refusalFormsService = new RefusalFormsService();
