import type { WorkflowStep } from "@/components/cases/workflowTreeTypes";

const YES_NO = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

export const CASE_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "case_created",
    title: "Case Created",
    fields: [
      {
        id: "intake_status",
        label: "Case Intake Status",
        options: [
          { label: "Created", value: "created" },
          { label: "Pending", value: "pending" },
        ],
      },
    ],
  },
  {
    id: "risk_identified",
    title: "Risk Identified",
    fields: [
      {
        id: "risk_level",
        label: "Risk Level",
        options: [
          { label: "Low", value: "low" },
          { label: "Moderate", value: "moderate" },
          { label: "High", value: "high" },
          { label: "Critical", value: "critical" },
        ],
      },
      {
        id: "barrier_type",
        label: "Barrier Type",
        options: [
          { label: "Patient Refuses Discharge", value: "patient_refuses_discharge" },
          { label: "Family Refuses Plan", value: "family_refuses_plan" },
          { label: "No Accepting Facility", value: "no_accepting_facility" },
          { label: "No Payer", value: "no_payer" },
          { label: "No Capacity / No Surrogate", value: "no_capacity_or_no_surrogate" },
          { label: "Behavioral / Safety Concern", value: "behavioral_or_safety_concern" },
        ],
      },
    ],
  },
  {
    id: "discharge_planned",
    title: "Discharge Planned",
    fields: [
      {
        id: "discharge_destination",
        label: "Discharge Destination",
        options: [
          { label: "Home", value: "home" },
          { label: "Home with Services", value: "home_with_services" },
          { label: "Skilled Nursing Facility", value: "skilled_nursing_facility" },
          { label: "Long-Term Acute Care", value: "long_term_acute_care" },
          { label: "Rehabilitation Facility", value: "rehabilitation_facility" },
          { label: "Social Placement", value: "social_placement" },
          { label: "Other", value: "other" },
        ],
      },
      {
        id: "medical_stability",
        label: "Medical Stability",
        options: [
          { label: "Stable for Discharge", value: "stable_for_discharge" },
          { label: "Pending Review", value: "pending_review" },
          { label: "Not Yet Stable", value: "not_yet_stable" },
        ],
      },
      {
        id: "patient_notified_discharge_decision",
        label: "Patient/Guardian Notified of Medical Discharge Decision",
        options: YES_NO,
      },
      {
        id: "patient_ack_homecare_provision",
        label: "Patient/Guardian Acknowledged Home Health Care Provision",
        options: YES_NO,
      },
    ],
  },
  {
    id: "patient_refusal_recorded",
    title: "Patient Refusal Recorded",
    fields: [
      {
        id: "refusal_type",
        label: "Refusal Type",
        options: [
          { label: "Verbal Refusal", value: "verbal_refusal" },
          { label: "Written Refusal", value: "written_refusal" },
          { label: "Family Refusal", value: "family_refusal" },
          { label: "Surrogate Refusal", value: "surrogate_refusal" },
        ],
      },
      {
        id: "family_present",
        label: "Family Present",
        options: YES_NO,
      },
    ],
  },
  {
    id: "social_review",
    title: "Social Review",
    fields: [
      {
        id: "social_work_status",
        label: "Social Work Status",
        options: [
          { label: "Pending", value: "pending" },
          { label: "In Progress", value: "in_progress" },
          { label: "Completed", value: "completed" },
          { label: "Not Required", value: "not_required" },
        ],
      },
    ],
  },
  {
    id: "administrative_escalation",
    title: "Administrative Escalation",
    fields: [
      {
        id: "escalation_level",
        label: "Escalation Level",
        options: [
          { label: "Level 1", value: "level_1" },
          { label: "Level 2", value: "level_2" },
          { label: "Level 3", value: "level_3" },
        ],
      },
      {
        id: "administration_notified",
        label: "Administration Notified",
        options: YES_NO,
      },
    ],
  },
  {
    id: "financial_notice",
    title: "Financial Notice",
    fields: [
      {
        id: "financial_notice_status",
        label: "Financial Notice Status",
        options: [
          { label: "Not Issued", value: "not_issued" },
          { label: "Drafted", value: "drafted" },
          { label: "Issued", value: "issued" },
          { label: "Acknowledged", value: "acknowledged" },
        ],
      },
    ],
  },
  {
    id: "legal_review",
    title: "Legal Review",
    fields: [
      {
        id: "legal_status",
        label: "Legal Status",
        options: [
          { label: "Not Started", value: "not_started" },
          { label: "Under Review", value: "under_review" },
          { label: "Legal Notice Prepared", value: "legal_notice_prepared" },
          { label: "External Action Considered", value: "external_action_considered" },
          { label: "Closed by Legal", value: "closed_by_legal" },
        ],
      },
    ],
  },
  {
    id: "case_closed",
    title: "Case Closed",
    fields: [
      {
        id: "closure_outcome",
        label: "Closure Outcome",
        options: [
          { label: "Discharged", value: "discharged" },
          { label: "Left Against Advice", value: "left_against_advice" },
          { label: "Administrative Discharge", value: "administrative_discharge" },
          { label: "Transferred", value: "transferred" },
          { label: "Case Cancelled", value: "case_cancelled" },
        ],
      },
    ],
  },
];
