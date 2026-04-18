export type PatientDecisionValue = "accepted" | "refused" | null;

export type LegalReadinessDecisionIndicator = {
  label: "Accepted" | "Refused" | "Not Recorded";
  badgeVariant: "success" | "destructive" | "warning";
  followUpText: string;
  followUpTone: "success" | "destructive" | "warning";
};

export function getLegalReadinessDecisionIndicator(
  decision: PatientDecisionValue,
): LegalReadinessDecisionIndicator {
  if (decision === "refused") {
    return {
      label: "Refused",
      badgeVariant: "destructive",
      followUpText: "Legal follow-up required.",
      followUpTone: "destructive",
    };
  }

  if (decision === "accepted") {
    return {
      label: "Accepted",
      badgeVariant: "success",
      followUpText: "Discharge completion path.",
      followUpTone: "success",
    };
  }

  return {
    label: "Not Recorded",
    badgeVariant: "warning",
    followUpText: "Record patient decision to continue legal readiness.",
    followUpTone: "warning",
  };
}
