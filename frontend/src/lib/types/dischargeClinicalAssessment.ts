export type DischargeClinicalStatus = "stable" | "stable_followup" | "unstable" | "critical";

export type DischargeVitalStatus = "stable" | "unstable" | "incomplete";

export type DischargeMentalStatus = "alert_oriented" | "partially_oriented" | "confused" | "no_decision_capacity";

export type DischargeMobilityStatus = "independent" | "assisted" | "wheelchair" | "bedbound";

export type DischargePainLevel = "none" | "mild" | "moderate" | "severe";

export type DischargeDecision =
    | "medically_fit"
    | "patient_requested"
    | "against_plan"
    | "with_risk_explained";

export type Comorbidity =
    | "diabetes"
    | "hypertension"
    | "heart_disease"
    | "lung_disease"
    | "kidney_disease"
    | "cancer"
    | "other";

export interface DischargeClinicalAssessment {
    dischargeClinicalStatus: DischargeClinicalStatus;
    dischargeVitalStatus: DischargeVitalStatus;
    dischargeMentalStatus: DischargeMentalStatus;
    dischargeMobilityStatus: DischargeMobilityStatus;
    dischargePainLevel: DischargePainLevel;
    currentDiagnosis: string;
    dischargeClinicalSummary: string;
    dischargeDecision: DischargeDecision;
    explainedRisks: string;
    comorbidities: Comorbidity[];
    comorbidityOther?: string;
}
