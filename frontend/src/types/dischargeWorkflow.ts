export type WorkflowStageKey =
  | "medical_discharge_decision"
  | "initial_communication"
  | "support_and_intervention"
  | "refusal_form"
  | "official_notification"
  | "escalation"
  | "closed";

export type WorkflowTimelineItem = {
  key: WorkflowStageKey;
  label: string;
  timestamp: string | null;
  status: "completed" | "current" | "upcoming";
};

export type WorkflowDocumentItem = {
  id: string;
  template_key: "discharge_refusal_form" | "financial_responsibility_notice" | string;
  document_code: string | null;
  title: string;
  file_name: string;
  generated_at: string;
  view_url: string;
  download_url: string;
};

export type WorkflowPolicyRequirement = {
  key: string;
  label: string;
  value_present: boolean;
  required_for_current_action: boolean;
};

export type WorkflowPolicyValidation = {
  required_fields: string[];
  missing_fields: string[];
  can_generate: boolean;
  requirements: WorkflowPolicyRequirement[];
  validated_at: string | null;
};

export type DischargeWorkflow = {
  id: string;
  case_id: string;
  workflow_type: string;
  status: string;
  current_stage: WorkflowStageKey;
  current_stage_label: string;
  escalation_required: boolean;
  discharge_decision_at: string | null;
  refusal_started_at: string | null;
  initial_communication_at: string | null;
  support_and_intervention_at: string | null;
  social_services_referred_at: string | null;
  refusal_form_generated_at: string | null;
  financial_notice_generated_at: string | null;
  escalation_due_at: string | null;
  escalated_at: string | null;
  patient_name: string | null;
  patient_id_number: string | null;
  medical_record_number: string | null;
  room_number: string | null;
  attending_physician: string | null;
  refusal_reason: string | null;
  discussion_summary: string | null;
  social_administrative_interventions: string | null;
  forms_issued: string | null;
  insurance_coverage_status: string | null;
  responsible_department: string | null;
  responsible_person: string | null;
  next_action: string | null;
  policy_validation: WorkflowPolicyValidation;
  timeline: WorkflowTimelineItem[];
  documents: WorkflowDocumentItem[];
};

export type WorkflowActionKey =
  | "record_discharge_decision"
  | "start_refusal_workflow"
  | "mark_patient_counseled"
  | "refer_social_services"
  | "escalate_legal_compliance";

export type WorkflowPreviewResponse = {
  template_key: "discharge_refusal_form" | "financial_responsibility_notice";
  title: string;
  document_code: string | null;
  missing_fields: string[];
  can_generate: boolean;
  policy_validation: WorkflowPolicyValidation;
  html_content: string;
  context: Record<string, string>;
};

export type WorkflowValidationResponse = {
  template_key: "discharge_refusal_form" | "financial_responsibility_notice" | null;
  missing_fields: string[];
  can_generate: boolean;
  policy_validation: WorkflowPolicyValidation;
};

export type WorkflowGenerateResponse = {
  workflow: DischargeWorkflow;
  generated_document: WorkflowDocumentItem;
};

export type WorkflowActionResponse = {
  workflow: DischargeWorkflow;
  generated_document: WorkflowDocumentItem | null;
};
