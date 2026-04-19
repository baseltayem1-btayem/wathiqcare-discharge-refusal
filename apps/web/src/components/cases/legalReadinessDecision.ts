export type PatientDecisionValue = "accepted" | "refused" | null;

export type LegalReadinessDecisionIndicator = {
  label: string;
  badgeVariant: "success" | "destructive" | "warning";
  followUpText: string;
  followUpTone: "success" | "destructive" | "warning";
};

export function getLegalReadinessDecisionIndicator(
  decision: PatientDecisionValue,
  locale: "en" | "ar" = "en",
): LegalReadinessDecisionIndicator {
  const isArabic = locale === "ar";
  const tr = (en: string, ar: string): string => (isArabic ? ar : en);

  if (decision === "refused") {
    return {
      label: tr("Refused", "رفض"),
      badgeVariant: "destructive",
      followUpText: tr("Legal follow-up required.", "يلزم متابعة قانونية."),
      followUpTone: "destructive",
    };
  }

  if (decision === "accepted") {
    return {
      label: tr("Accepted", "قبول"),
      badgeVariant: "success",
      followUpText: tr("Discharge completion path.", "مسار استكمال الخروج."),
      followUpTone: "success",
    };
  }

  return {
    label: tr("Not Recorded", "غير مسجل"),
    badgeVariant: "warning",
    followUpText: tr("Record patient decision to continue legal readiness.", "سجّل قرار المريض للمتابعة في الجاهزية القانونية."),
    followUpTone: "warning",
  };
}
