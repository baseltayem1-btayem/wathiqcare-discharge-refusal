/**
 * CANONICAL WORKFLOW STEPS — Single source of truth.
 *
 * Step IDs are intentionally identical to the backend WORKFLOW_STAGES constant
 * (apps/api/backend/core/discharge_workflow_service.py) so that backend state
 * and frontend tree stay in sync.
 *
 * Field labels reference i18n keys under "workflowTree.field.*" — call
 * buildWorkflowSteps(t) to get a translated array at render time.
 */
import type { WorkflowStep } from "@/components/cases/workflowTreeTypes";

type TFn = (key: string) => string;

/** Bilingual option builder — (en, ar) pair, resolved at render time. */
function opt(labelKey: string, value: string, t: TFn): { label: string; value: string } {
  return { label: t(labelKey), value };
}

function yesNo(t: TFn) {
  return [opt("workflowTree.option.yes", "yes", t), opt("workflowTree.option.no", "no", t)];
}

/**
 * Returns the workflow steps array with translated labels.
 * Step IDs match backend WORKFLOW_STAGES exactly.
 */
export function buildWorkflowSteps(t: TFn): WorkflowStep[] {
  return [
    {
      id: "medical_discharge_decision",
      title: t("workflow.stage.medical_discharge_decision"),
      fields: [
        {
          id: "decision_status",
          label: t("workflowTree.field.decisionStatus"),
          options: [
            opt("workflowTree.option.decisionIssued", "decision_issued", t),
            opt("workflowTree.option.pendingPhysician", "pending_physician", t),
          ],
        },
        {
          id: "medical_stability",
          label: t("workflowTree.field.medicalStability"),
          options: [
            opt("workflowTree.option.stableForDischarge", "stable_for_discharge", t),
            opt("workflowTree.option.pendingReview", "pending_review", t),
            opt("workflowTree.option.notYetStable", "not_yet_stable", t),
          ],
        },
      ],
    },
    {
      id: "initial_communication",
      title: t("workflow.stage.initial_communication"),
      fields: [
        {
          id: "patient_notified",
          label: t("workflowTree.field.patientNotified"),
          options: yesNo(t),
        },
        {
          id: "barrier_type",
          label: t("workflowTree.field.barrierType"),
          options: [
            opt("workflowTree.option.patientRefuses", "patient_refuses_discharge", t),
            opt("workflowTree.option.familyRefuses", "family_refuses_plan", t),
            opt("workflowTree.option.noAcceptingFacility", "no_accepting_facility", t),
            opt("workflowTree.option.noPayer", "no_payer", t),
            opt("workflowTree.option.noCapacity", "no_capacity_or_no_surrogate", t),
            opt("workflowTree.option.behavioralConcern", "behavioral_or_safety_concern", t),
          ],
        },
        {
          id: "refusal_type",
          label: t("workflowTree.field.refusalType"),
          options: [
            opt("workflowTree.option.verbalRefusal", "verbal_refusal", t),
            opt("workflowTree.option.writtenRefusal", "written_refusal", t),
            opt("workflowTree.option.familyRefusal", "family_refusal", t),
            opt("workflowTree.option.surrogateRefusal", "surrogate_refusal", t),
          ],
        },
      ],
    },
    {
      id: "support_and_intervention",
      title: t("workflow.stage.support_and_intervention"),
      fields: [
        {
          id: "social_work_status",
          label: t("workflowTree.field.socialWorkStatus"),
          options: [
            opt("workflowTree.option.pending", "pending", t),
            opt("workflowTree.option.inProgress", "in_progress", t),
            opt("workflowTree.option.completed", "completed", t),
            opt("workflowTree.option.notRequired", "not_required", t),
          ],
        },
        {
          id: "discharge_destination",
          label: t("workflowTree.field.dischargeDestination"),
          options: [
            opt("workflowTree.option.home", "home", t),
            opt("workflowTree.option.homeWithServices", "home_with_services", t),
            opt("workflowTree.option.skilledNursing", "skilled_nursing_facility", t),
            opt("workflowTree.option.rehabilitation", "rehabilitation_facility", t),
            opt("workflowTree.option.other", "other", t),
          ],
        },
      ],
    },
    {
      id: "refusal_form",
      title: t("workflow.stage.refusal_form"),
      fields: [
        {
          id: "form_status",
          label: t("workflowTree.field.formStatus"),
          options: [
            opt("workflowTree.option.notIssued", "not_issued", t),
            opt("workflowTree.option.drafted", "drafted", t),
            opt("workflowTree.option.pendingSignature", "pending_signature", t),
            opt("workflowTree.option.signed", "signed", t),
            opt("workflowTree.option.witnessedRefusal", "witnessed_refusal", t),
          ],
        },
        {
          id: "family_present",
          label: t("workflowTree.field.familyPresent"),
          options: yesNo(t),
        },
      ],
    },
    {
      id: "official_notification",
      title: t("workflow.stage.official_notification"),
      fields: [
        {
          id: "financial_notice_status",
          label: t("workflowTree.field.financialNoticeStatus"),
          options: [
            opt("workflowTree.option.notIssued", "not_issued", t),
            opt("workflowTree.option.drafted", "drafted", t),
            opt("workflowTree.option.issued", "issued", t),
            opt("workflowTree.option.acknowledged", "acknowledged", t),
          ],
        },
        {
          id: "administration_notified",
          label: t("workflowTree.field.administrationNotified"),
          options: yesNo(t),
        },
      ],
    },
    {
      id: "escalation",
      title: t("workflow.stage.escalation"),
      fields: [
        {
          id: "escalation_level",
          label: t("workflowTree.field.escalationLevel"),
          options: [
            opt("workflowTree.option.level1", "level_1", t),
            opt("workflowTree.option.level2", "level_2", t),
            opt("workflowTree.option.level3", "level_3", t),
          ],
        },
        {
          id: "legal_status",
          label: t("workflowTree.field.legalStatus"),
          options: [
            opt("workflowTree.option.notStarted", "not_started", t),
            opt("workflowTree.option.underReview", "under_review", t),
            opt("workflowTree.option.legalNoticePrepared", "legal_notice_prepared", t),
            opt("workflowTree.option.closedByLegal", "closed_by_legal", t),
          ],
        },
      ],
    },
    {
      id: "closed",
      title: t("workflow.stage.closed"),
      fields: [
        {
          id: "closure_outcome",
          label: t("workflowTree.field.closureOutcome"),
          options: [
            opt("workflowTree.option.discharged", "discharged", t),
            opt("workflowTree.option.leftAgainstAdvice", "left_against_advice", t),
            opt("workflowTree.option.administrativeDischarge", "administrative_discharge", t),
            opt("workflowTree.option.transferred", "transferred", t),
            opt("workflowTree.option.caseCancelled", "case_cancelled", t),
          ],
        },
      ],
    },
  ];
}

/** Static fallback used where translation context is not available (e.g. tests). */
export const CASE_WORKFLOW_STEPS: WorkflowStep[] = buildWorkflowSteps((key: string) => key);
