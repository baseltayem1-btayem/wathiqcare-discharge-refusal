import type { WorkflowProgressStep } from "@/components/ui/WorkflowProgress";

type WorkflowStageKey =
  | "medical_discharge_decision"
  | "initial_communication"
  | "support_and_intervention"
  | "refusal_form"
  | "official_notification"
  | "escalation"
  | "closed";

const WORKFLOW_STAGES: WorkflowStageKey[] = [
  "medical_discharge_decision",
  "initial_communication",
  "support_and_intervention",
  "refusal_form",
  "official_notification",
  "escalation",
  "closed",
];

const STAGE_LABELS_AR: Record<WorkflowStageKey, string> = {
  medical_discharge_decision: "قرار الخروج الطبي",
  initial_communication: "التواصل الأولي",
  support_and_intervention: "الدعم والتدخل",
  refusal_form: "نموذج الرفض",
  official_notification: "الإشعار الرسمي",
  escalation: "التصعيد",
  closed: "مغلقة",
};

const STAGE_LABELS_EN: Record<WorkflowStageKey, string> = {
  medical_discharge_decision: "Medical Discharge Decision",
  initial_communication: "Initial Communication",
  support_and_intervention: "Support and Intervention",
  refusal_form: "Refusal Form",
  official_notification: "Official Notification",
  escalation: "Escalation Review",
  closed: "Archive",
};

type MetadataWorkflowInput = {
  caseId?: string | null;
  status?: string | null;
  patientName?: string | null;
  patient_name?: string | null;
  signer_name?: string | null;
  signer_role?: string | null;
  signed_at?: string | null;
  pdf_file?: string | null;
  refusal_reason?: string | null;
  workflow_stages?: unknown;
  metadata?: Record<string, unknown> | null;
  workflow?: {
    discharge_decision_at?: string | null;
    initial_communication_at?: string | null;
    refusal_started_at?: string | null;
    support_and_intervention_at?: string | null;
    social_services_referred_at?: string | null;
    refusal_form_generated_at?: string | null;
    financial_notice_generated_at?: string | null;
    escalated_at?: string | null;
    escalation_due_at?: string | null;
    current_stage?: string | null;
    status?: string | null;
  } | null;
  clickable?: boolean;
};

type WorkflowProgressOutput = {
  steps: WorkflowProgressStep[];
  currentStepId: string;
};

function readMeta(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!metadata) return null;
  for (const key of keys) {
    const v = metadata[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function buildMetadataWorkflowProgress(
  input: MetadataWorkflowInput,
): WorkflowProgressOutput {
  const meta = input.metadata ?? null;
  const wf = input.workflow ?? null;
  const statusLower = (input.status ?? "").toLowerCase();

  const timestamps: Record<WorkflowStageKey, string | null> = {
    medical_discharge_decision:
      wf?.discharge_decision_at ??
      readMeta(meta, "discharge_decision_at", "discharge_decision"),
    initial_communication:
      wf?.initial_communication_at ??
      wf?.refusal_started_at ??
      readMeta(meta, "initial_communication_at", "refusal_started_at"),
    support_and_intervention:
      wf?.support_and_intervention_at ??
      wf?.social_services_referred_at ??
      readMeta(meta, "support_and_intervention_at", "social_services_referred_at"),
    refusal_form:
      wf?.refusal_form_generated_at ??
      readMeta(meta, "refusal_form_generated_at"),
    official_notification:
      wf?.financial_notice_generated_at ??
      readMeta(meta, "financial_notice_generated_at"),
    escalation:
      wf?.escalated_at ??
      wf?.escalation_due_at ??
      readMeta(meta, "escalated_at", "escalation_due_at"),
    closed:
      statusLower === "closed" || statusLower === "archived"
        ? (wf?.escalated_at ?? input.signed_at ?? readMeta(meta, "closed_at") ?? new Date().toISOString())
        : readMeta(meta, "closed_at"),
  };

  // Determine current stage from explicit workflow state first
  let currentStageIndex = 0;
  if (wf?.current_stage) {
    const idx = WORKFLOW_STAGES.indexOf(wf.current_stage as WorkflowStageKey);
    if (idx >= 0) {
      currentStageIndex = idx;
    }
  } else {
    // Derive from timestamps: find first stage that doesn't have a timestamp
    currentStageIndex = WORKFLOW_STAGES.length - 1;
    for (let i = 0; i < WORKFLOW_STAGES.length; i++) {
      if (!timestamps[WORKFLOW_STAGES[i]]) {
        currentStageIndex = i;
        break;
      }
    }
  }

  const currentStepId = WORKFLOW_STAGES[currentStageIndex];

  const steps: WorkflowProgressStep[] = WORKFLOW_STAGES.map((stage, index) => {
    const isCompleted = Boolean(timestamps[stage]) && index <= currentStageIndex
      ? index < currentStageIndex
      : Boolean(timestamps[stage]);

    let state: WorkflowProgressStep["state"];
    if (isCompleted || (index < currentStageIndex)) {
      state = "completed";
    } else if (index === currentStageIndex) {
      state = "current";
    } else {
      state = "upcoming";
    }

    return {
      id: stage,
      titleAr: STAGE_LABELS_AR[stage],
      titleEn: STAGE_LABELS_EN[stage],
      state,
      clickable: input.clickable ?? false,
    };
  });

  return { steps, currentStepId };
}
