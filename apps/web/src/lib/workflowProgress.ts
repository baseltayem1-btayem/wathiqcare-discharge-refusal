import type { WorkflowProgressStep } from "@/components/ui/WorkflowProgress";
import { getTranslation } from "@/lib/i18n";

export const METADATA_STAGE_ROUTES: Partial<Record<string, (caseId: string) => string>> = {
    discharge_plan_preparation: (caseId) => `/cases/${caseId}`,
    forms_and_consent_presentation: (caseId) => `/cases/${caseId}/informed-consent`,
    approval_or_refusal_path: (caseId) => `/cases/${caseId}/refusal-form`,
    legal_escalation_if_needed: (caseId) => `/workflow/medical-discharge-refusal/case/${caseId}/escalation-review`,
};

export const WORKFLOW_TO_METADATA_STAGE: Partial<Record<string, string>> = {
    medical_discharge_decision: "medical_assessment",
    initial_communication: "discharge_plan_preparation",
    support_and_intervention: "forms_and_consent_presentation",
    refusal_form: "approval_or_refusal_path",
    official_notification: "approval_or_refusal_path",
    escalation: "legal_escalation_if_needed",
    closed: "execute_discharge_or_hold",
};

type WorkflowSignals = {
    current_stage?: string | null;
    discharge_decision_at?: string | null;
    initial_communication_at?: string | null;
    refusal_started_at?: string | null;
    support_and_intervention_at?: string | null;
    social_services_referred_at?: string | null;
    refusal_form_generated_at?: string | null;
    financial_notice_generated_at?: string | null;
    escalation_required?: boolean | null;
    escalated_at?: string | null;
    patient_name?: string | null;
    refusal_reason?: string | null;
};

type MetadataWorkflowSource = {
    caseId?: string;
    status?: string | null;
    patientName?: string | null;
    patient_name?: string | null;
    signer_name?: string | null;
    signer_role?: string | null;
    signed_at?: string | null;
    pdf_file?: string | null;
    refusal_reason?: string | null;
    workflow_stages?: string[] | null;
    metadata?: Record<string, unknown> | null;
    workflow?: WorkflowSignals | null;
    clickable?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function readString(metadata: Record<string, unknown> | null, ...keys: string[]): string {
    if (!metadata) {
        return "";
    }

    for (const key of keys) {
        const value = metadata[key];
        if (typeof value === "string" && value.trim().length > 0) {
            return value;
        }
    }

    return "";
}

function readBool(metadata: Record<string, unknown> | null, key: string): boolean {
    if (!metadata) {
        return false;
    }

    return metadata[key] === true;
}

export function readWorkflowStages(metadata: Record<string, unknown> | null | undefined): string[] {
    const normalizedMetadata = asRecord(metadata);
    const stages = normalizedMetadata?.workflow_stages;

    if (!Array.isArray(stages)) {
        return [];
    }

    return stages.filter((stage): stage is string => typeof stage === "string" && stage.trim().length > 0);
}

export function buildMetadataWorkflowProgress({
    caseId,
    status,
    patientName,
    patient_name,
    signer_name,
    signer_role,
    signed_at,
    pdf_file,
    refusal_reason,
    workflow_stages,
    metadata,
    workflow,
    clickable = false,
}: MetadataWorkflowSource): { steps: WorkflowProgressStep[]; currentStepId?: string } {
    const normalizedMetadata = asRecord(metadata);
    const stageKeys = workflow_stages?.length ? workflow_stages : readWorkflowStages(normalizedMetadata);

    if (stageKeys.length === 0) {
        return { steps: [] };
    }

    const dischargePlanMetadata = asRecord(normalizedMetadata?.discharge_plan);
    const hasDecision = Boolean(workflow?.discharge_decision_at || readString(normalizedMetadata, "discharge_decision_at"));
    const hasInitialCommunication = Boolean(
        workflow?.initial_communication_at ||
        workflow?.refusal_started_at ||
        readString(normalizedMetadata, "initial_communication_at", "refusal_started_at")
    );
    const hasSupportIntervention = Boolean(
        workflow?.support_and_intervention_at ||
        workflow?.social_services_referred_at ||
        readString(normalizedMetadata, "support_and_intervention_at", "social_services_referred_at")
    );
    const hasRefusalForm = Boolean(workflow?.refusal_form_generated_at || readString(normalizedMetadata, "refusal_form_generated_at"));
    const hasOfficialNotice = Boolean(
        workflow?.financial_notice_generated_at || readString(normalizedMetadata, "financial_notice_generated_at")
    );
    const hasSigned = Boolean(signed_at || readString(normalizedMetadata, "signed_at"));
    const hasFinalPdf = Boolean(pdf_file || readString(normalizedMetadata, "pdf_file"));
    const hasSignerIdentity = Boolean(signer_name || signer_role || hasSigned);
    const hasRefusalReason = Boolean(refusal_reason || workflow?.refusal_reason || readString(normalizedMetadata, "refusal_reason"));
    const hasDischargePlanDraft = Boolean(dischargePlanMetadata) || Boolean(workflow?.patient_name) || Boolean(patientName || patient_name);
    const escalationRequired = Boolean(workflow?.escalation_required) || readBool(normalizedMetadata, "escalation_required") || status === "ESCALATED";
    const escalationCompleted = Boolean(workflow?.escalated_at || readString(normalizedMetadata, "escalated_at")) || status === "ESCALATED";

    const stageCompletionMap: Partial<Record<string, boolean>> = {
        medical_assessment: hasDecision,
        legal_capacity_check: hasInitialCommunication,
        authorized_signatory_identification: hasSignerIdentity,
        discharge_plan_preparation: hasSupportIntervention || hasDischargePlanDraft,
        forms_and_consent_presentation: hasRefusalForm || hasOfficialNotice || hasSigned,
        approval_or_refusal_path: hasRefusalReason || hasRefusalForm || hasOfficialNotice,
        legal_escalation_if_needed: !escalationRequired || escalationCompleted,
        final_verification: hasSigned || hasOfficialNotice,
        execute_discharge_or_hold: hasFinalPdf,
    };

    const firstIncompleteIndex = stageKeys.findIndex((key) => !stageCompletionMap[key]);
    const activeIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : stageKeys.length - 1;

    const steps = stageKeys.map((stageKey, index) => {
        const isEscalationStage = stageKey === "legal_escalation_if_needed";
        const completed = Boolean(stageCompletionMap[stageKey]);
        const stageTranslationKey = `workflow.stage.${stageKey}`;

        let state: WorkflowProgressStep["state"] = "upcoming";
        if (completed) {
            state = "completed";
        } else if (index === activeIndex) {
            state = "current";
        }

        if (isEscalationStage && escalationRequired && !completed) {
            state = "warning";
        }

        const hrefFactory = caseId ? METADATA_STAGE_ROUTES[stageKey] : undefined;

        return {
            id: stageKey,
            titleAr: getTranslation("ar", stageTranslationKey),
            titleEn: getTranslation("en", stageTranslationKey),
            subtitleAr:
                state === "completed"
                    ? getTranslation("ar", "workflow.progressState.completed")
                    : state === "warning"
                        ? getTranslation("ar", "workflow.progressState.escalationRequired")
                        : state === "current"
                            ? getTranslation("ar", "workflow.progressState.current")
                            : getTranslation("ar", "workflow.progressState.upcoming"),
            subtitleEn:
                state === "completed"
                    ? getTranslation("en", "workflow.progressState.completed")
                    : state === "warning"
                        ? getTranslation("en", "workflow.progressState.escalationRequired")
                        : state === "current"
                            ? getTranslation("en", "workflow.progressState.current")
                            : getTranslation("en", "workflow.progressState.upcoming"),
            state,
            clickable: Boolean(clickable && hrefFactory),
            href: hrefFactory?.(caseId || ""),
        };
    });

    return {
        steps,
        currentStepId: steps.find((step) => step.state === "current" || step.state === "warning")?.id,
    };
}
