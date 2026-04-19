export type WorkspaceRole = "doctor" | "legal" | "signatory" | "tenant_admin" | "other";

export type WorkspaceSectionId =
  | "overview"
  | "medical_decision"
  | "legal_escalation"
  | "documents_pdf"
  | "evidence_bundle"
  | "final_closure";

export type WorkspaceSectionGuidance = {
  id: WorkspaceSectionId;
  title: string;
  ownerRole: string;
  status: "completed" | "in_progress" | "blocked";
  missingItems: string[];
  nextAction: string;
  blockedReason: string | null;
};

export type WorkspaceGuidanceInput = {
  role: string | null;
  canMedicalActions: boolean;
  canLegalApprove: boolean;
  canGeneratePdf: boolean;
  canGenerateBundle: boolean;
  readinessReadyForLegal: boolean;
  readinessReason?: string;
  presentationRecorded: boolean;
  patientDecision: "accepted" | "refused" | null;
  patientAcknowledged: boolean;
  refusalScenario: boolean;
  financialNoticeAvailable: boolean;
  latestPdfStatus?: "draft" | "final" | "failed" | null;
  legalPackageGenerated: boolean;
};

function tr(locale: "en" | "ar", en: string, ar: string): string {
  return locale === "ar" ? ar : en;
}

export function normalizeWorkspaceRole(role: string | null): WorkspaceRole {
  const normalized = (role || "").trim().toLowerCase();

  if (!normalized) {
    return "other";
  }

  if (normalized === "doctor" || normalized === "er_doctor" || normalized === "emergency_doctor" || normalized === "physician") {
    return "doctor";
  }

  if (normalized === "legal_admin" || normalized === "legal" || normalized === "legal_officer" || normalized === "lawyer") {
    return "legal";
  }

  if (normalized === "signatory" || normalized === "authorized_signatory") {
    return "signatory";
  }

  if (normalized === "tenant_admin" || normalized === "tenant_owner") {
    return "tenant_admin";
  }

  return "other";
}

export function buildWorkspaceGuidance(
  input: WorkspaceGuidanceInput,
  locale: "en" | "ar" = "en",
): WorkspaceSectionGuidance[] {
  const actorRole = normalizeWorkspaceRole(input.role);
  const decisionIsAccepted = input.patientDecision === "accepted";
  const decisionIsRefused = input.patientDecision === "refused";

  const overviewMissing = [] as string[];
  if (!input.presentationRecorded) {
    overviewMissing.push(tr(locale, "Medical explanation is not recorded yet.", "لم يتم تسجيل الشرح الطبي بعد."));
  }
  if (!input.patientDecision) {
    overviewMissing.push(tr(locale, "Patient decision (accepted/refused) is not recorded yet.", "لم يتم تسجيل قرار المريض (قبول/رفض) بعد."));
  }
  if (!input.patientAcknowledged) {
    overviewMissing.push(tr(locale, "Patient acknowledgment (accept/refuse) is not captured.", "لم يتم توثيق إقرار المريض (قبول/رفض)."));
  }

  const medicalMissing = [] as string[];
  if (!input.presentationRecorded) {
    medicalMissing.push(tr(locale, "Doctor has not recorded the discharge explanation.", "لم يقم الطبيب بتسجيل شرح الخروج."));
  }
  if (!input.patientDecision) {
    medicalMissing.push(tr(locale, "Doctor must record patient decision (accepted/refused).", "يجب على الطبيب تسجيل قرار المريض (قبول/رفض)."));
  }
  if (!input.patientAcknowledged) {
    medicalMissing.push(tr(locale, "Patient acknowledgment is required after medical decision.", "إقرار المريض مطلوب بعد القرار الطبي."));
  }

  const legalMissing = [] as string[];
  if (!input.patientDecision) {
    legalMissing.push(tr(locale, "Patient decision is not recorded yet.", "قرار المريض غير مسجل بعد."));
  }
  if (!input.readinessReadyForLegal) {
    legalMissing.push(input.readinessReason || tr(locale, "Case is not legally ready yet.", "الحالة غير جاهزة قانونيًا بعد."));
  }
  if ((decisionIsRefused || input.refusalScenario) && !input.financialNoticeAvailable) {
    legalMissing.push(tr(locale, "Finance notification is required for refusal scenarios.", "الإشعار المالي مطلوب في حالات الرفض."));
  }

  const docsMissing = [] as string[];
  if (!input.canGeneratePdf) {
    docsMissing.push(tr(locale, "Your role cannot generate legal PDF documents.", "دورك لا يتيح إنشاء مستندات PDF قانونية."));
  }
  if (!input.latestPdfStatus || input.latestPdfStatus === "failed") {
    docsMissing.push(tr(locale, "A valid discharge PDF is not available.", "ملف PDF صالح للخروج غير متوفر."));
  }

  const bundleMissing = [] as string[];
  if (!input.legalPackageGenerated) {
    bundleMissing.push(tr(locale, "Legal documentation package is not generated.", "لم يتم إنشاء حزمة المستندات القانونية."));
  }
  if (!input.canGenerateBundle) {
    bundleMissing.push(tr(locale, "Evidence bundle generation is available to Legal only.", "إنشاء حزمة الأدلة متاح للقانوني فقط."));
  }

  const closureMissing = [] as string[];
  if (!input.patientAcknowledged) {
    closureMissing.push(tr(locale, "Patient acknowledgment is pending.", "إقرار المريض قيد الانتظار."));
  }
  if (input.latestPdfStatus !== "final") {
    closureMissing.push(tr(locale, "Final signed PDF must be available before closure.", "يجب توفر PDF نهائي موقّع قبل الإغلاق."));
  }
  if (!input.canLegalApprove) {
    closureMissing.push(tr(locale, "Case closure is restricted to authorized signatory.", "إغلاق الحالة محصور بالمفوّض المعتمد."));
  }

  return [
    {
      id: "overview",
      title: tr(locale, "Case Overview", "نظرة عامة على الحالة"),
      ownerRole: tr(locale, "Care Team", "فريق الرعاية"),
      status: overviewMissing.length === 0 ? "completed" : "in_progress",
      missingItems: overviewMissing,
      nextAction: overviewMissing.length === 0 ? tr(locale, "Proceed to Medical Decision.", "انتقل إلى القرار الطبي.") : tr(locale, "Complete missing overview checkpoints.", "أكمل نقاط النظرة العامة الناقصة."),
      blockedReason: null,
    },
    {
      id: "medical_decision",
      title: tr(locale, "Medical Decision", "القرار الطبي"),
      ownerRole: tr(locale, "Doctor", "الطبيب"),
      status: medicalMissing.length === 0 ? "completed" : input.canMedicalActions ? "in_progress" : "blocked",
      missingItems: medicalMissing,
      nextAction:
        medicalMissing.length === 0
          ? decisionIsAccepted
            ? tr(locale, "Proceed to legal documentation and closure readiness checks.", "انتقل إلى التوثيق القانوني وفحوصات جاهزية الإغلاق.")
            : tr(locale, "Escalate refusal path to Legal workflow.", "صعّد مسار الرفض إلى سير العمل القانوني.")
          : tr(locale, "Doctor must complete decision and acknowledgment evidence.", "يجب على الطبيب استكمال القرار وأدلة الإقرار."),
      blockedReason: input.canMedicalActions ? null : tr(locale, "Awaiting Doctor action.", "بانتظار إجراء الطبيب."),
    },
    {
      id: "legal_escalation",
      title: tr(locale, "Legal Escalation", "التصعيد القانوني"),
      ownerRole: tr(locale, "Legal Admin / Legal Officer", "المشرف القانوني / الموظف القانوني"),
      status: legalMissing.length === 0 ? "completed" : input.canLegalApprove ? "in_progress" : "blocked",
      missingItems: legalMissing,
      nextAction:
        legalMissing.length === 0
          ? decisionIsAccepted
            ? tr(locale, "Proceed with final legal documentation and authorized closure preparation.", "تابع التوثيق القانوني النهائي والتحضير للإغلاق المعتمد.")
            : tr(locale, "Proceed with refusal risk handling, legal documentation, and PDF issuance.", "تابع معالجة مخاطر الرفض والتوثيق القانوني وإصدار PDF.")
          : decisionIsRefused
            ? tr(locale, "Legal team should review refusal blockers and coordinate with medical and finance teams.", "يجب على الفريق القانوني مراجعة عوائق الرفض والتنسيق مع الفريق الطبي والمالي.")
            : tr(locale, "Legal team should review blockers and coordinate with medical team.", "يجب على الفريق القانوني مراجعة العوائق والتنسيق مع الفريق الطبي."),
      blockedReason: input.canLegalApprove ? null : tr(locale, "Legal owns escalation and documentation.", "التصعيد والتوثيق من اختصاص الفريق القانوني."),
    },
    {
      id: "documents_pdf",
      title: tr(locale, "Documents / PDF", "المستندات / PDF"),
      ownerRole: tr(locale, "Legal", "القانوني"),
      status: docsMissing.length === 0 ? "completed" : input.canGeneratePdf ? "in_progress" : "blocked",
      missingItems: docsMissing,
      nextAction:
        docsMissing.length === 0
          ? tr(locale, "Validate final PDF for closure eligibility.", "تحقق من أهلية PDF النهائي للإغلاق.")
          : tr(locale, "Generate or recover legal PDF artifacts.", "أنشئ أو استرجع ملفات PDF القانونية."),
      blockedReason: input.canGeneratePdf ? null : tr(locale, "Legal documentation is available to Legal roles.", "التوثيق القانوني متاح للأدوار القانونية فقط."),
    },
    {
      id: "evidence_bundle",
      title: tr(locale, "Evidence Bundle", "حزمة الأدلة"),
      ownerRole: tr(locale, "Legal", "القانوني"),
      status: bundleMissing.length === 0 ? "completed" : input.canGenerateBundle ? "in_progress" : "blocked",
      missingItems: bundleMissing,
      nextAction:
        bundleMissing.length === 0
          ? tr(locale, "Bundle is ready for compliance and legal handoff.", "الحزمة جاهزة للامتثال والتسليم القانوني.")
          : tr(locale, "Generate evidence bundle from legal documents.", "أنشئ حزمة الأدلة من المستندات القانونية."),
      blockedReason: input.canGenerateBundle ? null : tr(locale, "Bundle generation is available to Legal only.", "إنشاء الحزمة متاح للقانوني فقط."),
    },
    {
      id: "final_closure",
      title: tr(locale, "Final Closure", "الإغلاق النهائي"),
      ownerRole: tr(locale, "Authorized Signatory", "المفوّض المعتمد"),
      status: closureMissing.length === 0 ? "completed" : input.canLegalApprove ? "in_progress" : "blocked",
      missingItems: closureMissing,
      nextAction:
        closureMissing.length === 0
          ? tr(locale, "Authorized signatory may close the case.", "يمكن للمفوّض المعتمد إغلاق الحالة.")
          : tr(locale, "Resolve closure blockers in sequence.", "عالج عوائق الإغلاق بالتسلسل."),
      blockedReason:
        closureMissing.length === 0
          ? null
          : actorRole === "signatory" || actorRole === "tenant_admin" || input.canLegalApprove
            ? null
            : tr(locale, "Case closure is restricted to authorized signatory.", "إغلاق الحالة محصور بالمفوّض المعتمد."),
    },
  ];
}
