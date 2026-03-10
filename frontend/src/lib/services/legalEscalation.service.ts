import { apiFetch } from "@/utils/api";
import type { LegalEscalationCase, LegalEscalationNote } from "@/types/legal-escalation";

/**
 * Service for managing legal escalation cases
 * Connects to backend legal escalation endpoints
 */
class LegalEscalationService {
  /**
   * Get all legal escalation cases
   */
  async listEscalations(): Promise<LegalEscalationCase[]> {
    try {
      const cases = await apiFetch<any[]>("/api/cases?limit=200");
      
      // Filter and transform cases that have been escalated
      return cases
        .filter((c: any) => {
          const status = (c.status || "").toLowerCase();
          const metadata = c.metadata || {};
          return status === "escalated" || metadata.escalated_at || metadata.escalation_required;
        })
        .map(this.transformCase);
    } catch (error) {
      console.error("Failed to fetch escalation cases:", error);
      return [];
    }
  }

  /**
   * Get a single escalation case by ID
   */
  async getEscalation(caseId: string): Promise<LegalEscalationCase | null> {
    try {
      const caseData = await apiFetch<any>(`/api/cases/${encodeURIComponent(caseId)}`);
      return this.transformCase(caseData);
    } catch (error) {
      console.error("Failed to fetch escalation case:", error);
      return null;
    }
  }

  /**
   * Add a note to an escalation case
   */
  async addNote(
    caseId: string,
    note: string,
    author: string
  ): Promise<LegalEscalationNote> {
    // For now, create a mock note since backend endpoint may not exist yet
    // TODO: Implement actual API call when backend is ready
    const newNote: LegalEscalationNote = {
      id: `note-${Date.now()}`,
      caseId,
      note,
      author,
      authorRole: "Legal Counsel",
      createdAt: new Date().toISOString(),
    };

    return newNote;
  }

  /**
   * Resolve an escalation case
   */
  async resolveCase(
    caseId: string,
    resolutionNotes: string
  ): Promise<void> {
    // TODO: Implement actual API call when backend endpoint is ready
    // await apiFetch(`/api/legal-escalation/${caseId}/resolve`, {
    //   method: "POST",
    //   body: JSON.stringify({ resolutionNotes }),
    // });
    console.log(`Resolving case ${caseId} with notes:`, resolutionNotes);
  }

  /**
   * Update case priority
   */
  async updatePriority(
    caseId: string,
    priority: string
  ): Promise<void> {
    // TODO: Implement actual API call when backend endpoint is ready
    console.log(`Updating case ${caseId} priority to:`, priority);
  }

  /**
   * Transform backend case data to legal escalation case
   */
  private transformCase(caseData: any): LegalEscalationCase {
    const metadata = caseData.metadata || {};
    const status = this.determineStatus(caseData.status, metadata);
    const priority = this.determinePriority(metadata);

    return {
      id: caseData.id,
      caseId: caseData.id,
      caseNumber: caseData.caseNumber || caseData.id,
      patientName: caseData.patientName || "Unknown Patient",
      status,
      priority,
      escalatedAt: metadata.escalated_at || metadata.escalation_due_at || new Date().toISOString(),
      assignedCounsel: metadata.assigned_counsel || null,
      reason: metadata.refusal_reason || metadata.escalation_reason || "Patient discharge refusal",
      riskLevel: metadata.risk_level || null,
      followUpDate: metadata.follow_up_date || null,
      resolvedAt: metadata.resolved_at || null,
      resolutionNotes: metadata.resolution_notes || null,
      notes: [],
      auditTrail: [],
    };
  }

  private determineStatus(status: string, metadata: any): LegalEscalationCase["status"] {
    const statusLower = (status || "").toLowerCase();
    
    if (metadata.resolved_at) return "resolved";
    if (metadata.high_risk || metadata.legal_sensitive_case) return "high-risk";
    if (metadata.under_legal_review) return "under-review";
    if (statusLower === "escalated") return "active";
    
    return "active";
  }

  private determinePriority(metadata: any): LegalEscalationCase["priority"] {
    if (metadata.high_risk || metadata.legal_sensitive_case) return "critical";
    if (metadata.priority === "high") return "high";
    if (metadata.priority === "medium") return "medium";
    return "low";
  }
}

export const legalEscalationService = new LegalEscalationService();
