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
      const cases = await apiFetch<LegalEscalationCase[]>("/api/discharge/cases/legal-escalation");
      return Array.isArray(cases) ? cases : [];
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
      return await apiFetch<LegalEscalationCase>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation`);
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
    return apiFetch<LegalEscalationNote>(
      `/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation/notes`,
      {
        method: "POST",
        body: JSON.stringify({ note, note_type: "legal", author }),
      }
    );
  }

  /**
   * Resolve an escalation case
   */
  async resolveCase(
    caseId: string,
    resolutionNotes: string
  ): Promise<void> {
    await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution_notes: resolutionNotes, close_case: false }),
    });
  }

  /**
   * Update case priority
   */
  async updatePriority(
    caseId: string,
    priority: string
  ): Promise<void> {
    await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-escalation/priority`, {
      method: "POST",
      body: JSON.stringify({ priority }),
    });
  }
}

export const legalEscalationService = new LegalEscalationService();
