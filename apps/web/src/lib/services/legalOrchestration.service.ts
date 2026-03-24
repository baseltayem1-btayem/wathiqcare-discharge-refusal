import { apiFetch } from "@/utils/api";

export type LegalCaseSummary = {
    event: {
        id: string;
        legal_state: string;
        notification_state: string;
        patient_response_state: string;
        signature_state: string;
        escalation_state: string;
        final_package_state: string;
        state_history: Array<{
            from?: string | null;
            to: string;
            at: string;
            by?: string | null;
            reason?: string | null;
        }>;
    } | null;
    counts: {
        documents?: number;
        notice_presentations?: number;
        responses?: number;
        financial_acknowledgments?: number;
        promissory_notes?: number;
        evidence_packages?: number;
        escalations?: number;
    };
};

export type LegalControlDashboard = {
    total_discharge_decisions: number;
    total_accepted: number;
    total_refused: number;
    refused_to_sign_count: number;
    unable_to_sign_count: number;
    home_care_agreements_generated: number;
    equipment_lease_agreements_generated: number;
    financial_acknowledgments_generated: number;
    promissory_notes_generated: number;
    high_risk_unresolved_cases: number;
    avg_time_decision_to_response_seconds: number;
    avg_time_refusal_to_escalation_seconds: number;
    total_estimated_financial_exposure: number;
};

class LegalOrchestrationService {
    async getCaseSummary(caseId: string): Promise<LegalCaseSummary> {
        return apiFetch<LegalCaseSummary>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/summary`);
    }

    async getControlDashboard(): Promise<LegalControlDashboard> {
        return apiFetch<LegalControlDashboard>("/api/discharge/reports/legal-control-dashboard");
    }

    async upsertDecisionEvent(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/decision-event`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async transitionState(caseId: string, targetState: string, reason?: string): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/state-transition`, {
            method: "POST",
            body: JSON.stringify({ target_state: targetState, reason }),
        });
    }

    async generateMasterDocument(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/master-document`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async buildEvidencePackage(caseId: string): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/evidence-package`, {
            method: "POST",
        });
    }

    async generateFinancialAcknowledgment(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/financial-acknowledgment`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async generatePromissoryNote(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/promissory-note`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async createEscalationEvent(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/escalation-event`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async recordNoticePresentation(caseId: string, payload: Record<string, unknown>): Promise<{ presentation_id: string; status: string; mode: string }> {
        return apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/notice-presentation`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async recordPatientResponse(caseId: string, payload: Record<string, unknown>): Promise<{ response_id: string; response_type: string; status: string }> {
        return apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/patient-response`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async generateHomeHealthcareAgreement(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/home-healthcare-agreement`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async generateEquipmentLease(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/equipment-lease`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async generateLegalUndertaking(caseId: string, payload: Record<string, unknown>): Promise<void> {
        await apiFetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal/undertaking`, {
            method: "POST",
            body: JSON.stringify({ payload }),
        });
    }

    async quickPrepareLegalEvent(caseId: string, context: { mrn?: string | null; physicianName?: string | null; diagnosisSummary?: string | null }): Promise<void> {
        await this.upsertDecisionEvent(caseId, {
            mrn: context.mrn || undefined,
            physician_name: context.physicianName || undefined,
            diagnosis_summary: context.diagnosisSummary || undefined,
            source_system: "manual",
            sync_mode: "manual",
            decision_timestamp: new Date().toISOString(),
        });

        try {
            await this.transitionState(caseId, "DECISION_ISSUED", "Prepared from legal case file dashboard");
        } catch {
            // ignore invalid transition for already-issued events
        }

        try {
            await this.generateMasterDocument(caseId, {
                language: "ar",
                notification: { notice_method: "in_person" },
                medical: {
                    final_diagnosis: context.diagnosisSummary || "Discharge decision recorded",
                },
            });
        } catch {
            // ignore when state is already ahead or document already generated
        }
    }
}

export const legalOrchestrationService = new LegalOrchestrationService();
