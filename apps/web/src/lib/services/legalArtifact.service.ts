import { apiFetch } from "@/utils/api";

export type LegalArtifactScreen =
    | "create_case"
    | "clinical_decision"
    | "risk_disclosure"
    | "patient_interaction"
    | "refusal_confirmation"
    | "final_review";

export type LegalArtifactStatus = {
    case_id: string;
    status: string;
    stage: string;
    artifact_version: number;
    immutable_lock: boolean;
    finalized_at: string | null;
    escalation_state: string;
    compliance_frameworks: string[];
    missing_requirements: string[];
    screens: Record<string, Record<string, unknown>>;
    signatures: Record<string, Record<string, unknown>>;
    tenant_header: Record<string, string>;
    legal_footer_text: string;
};

export async function createLegalArtifactCase(payload: Record<string, unknown>): Promise<LegalArtifactStatus> {
    return apiFetch<LegalArtifactStatus>("/api/discharge/cases/legal-artifact/create", {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function getLegalArtifactStatus(caseId: string): Promise<LegalArtifactStatus> {
    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact`);
}

export async function saveLegalArtifactScreen(
    caseId: string,
    screen: LegalArtifactScreen,
    payload: Record<string, unknown>,
): Promise<LegalArtifactStatus> {
    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact`, {
        method: "PUT",
        body: JSON.stringify({ screen, payload }),
    });
}

export async function signLegalArtifact(
    caseId: string,
    payload: {
        role: "patient" | "physician" | "witness" | "guardian";
        signature_value: string;
        signer_name: string;
        signer_role?: string;
    },
): Promise<LegalArtifactStatus> {
    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact/sign`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}

export async function finalizeLegalArtifact(caseId: string): Promise<LegalArtifactStatus> {
    return apiFetch<LegalArtifactStatus>(`/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact/finalize`, {
        method: "POST",
        body: JSON.stringify({ confirm_all_sections_complete: true }),
    });
}

export async function generateLegalArtifactPdf(caseId: string): Promise<{ file_name: string; file_path: string }> {
    return apiFetch<{ file_name: string; file_path: string }>(
        `/api/discharge/cases/${encodeURIComponent(caseId)}/legal-artifact/pdf`,
        { method: "POST" },
    );
}
