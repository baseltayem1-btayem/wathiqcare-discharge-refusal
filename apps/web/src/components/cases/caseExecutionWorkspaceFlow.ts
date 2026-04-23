import { normalizeWorkspaceRole } from "@/components/cases/workspaceGuidance";

export type CaseWorkspaceStepKey =
  | "case_creation"
  | "medical_decision"
  | "patient_decision"
  | "legal_readiness"
  | "legal_documents_bundle"
  | "closure";

export type CaseWorkspaceStepStatus = "completed" | "current" | "upcoming";

export type CaseWorkspaceStep = {
  key: CaseWorkspaceStepKey;
  label: string;
  shortLabel: string;
  description: string;
  ownerLabel: string;
  nextAction: string;
  missingItems: string[];
  includedSections: string[];
  recommendedVisibleRoles: string[];
  status: CaseWorkspaceStepStatus;
};

export type BuildCaseWorkspaceFlowInput = {
  role: string | null;
  mrn: string;
  patientName: string;
  physician: string;
  diagnosis: string;
  caseStatus: string;
  presentationRecorded: boolean;
  patientDecision: "accepted" | "refused" | null;
  patientAcknowledged: boolean;
  witnessRecorded: boolean;
  consentRecorded: boolean;
  readinessReadyForLegal: boolean;
  readinessReason?: string;
  readinessBlockers: string[];
  refusalScenario: boolean;
  financialNoticeAvailable: boolean;
  pdfLatestStatus?: "draft" | "final" | "failed" | null;
  pdfCanFinalize: boolean;
  pdfVersionCount: number;
  legalPackageGenerated: boolean;
  documentCount: number;
};

const STEP_META: Array<
  Omit<CaseWorkspaceStep, "status" | "missingItems" | "nextAction">
> = [
  {
    key: "case_creation",
    label: "Case Creation",
    shortLabel: "Create",
    description: "Confirm the case record is complete before clinical and legal actions start.",
    ownerLabel: "Case coordinator / Operations",
    includedSections: ["Case Summary", "Assignments & SLA"],
    recommendedVisibleRoles: ["Doctor", "Nursing", "Operations", "Tenant Admin", "Legal"],
  },
  {
    key: "medical_decision",
    label: "Medical Decision",
    shortLabel: "Medical",
    description: "Record the physician-led explanation and medical rationale for the discharge path.",
    ownerLabel: "Doctor",
    includedSections: ["Presentation / Proof of Notice", "Physician and diagnosis context"],
    recommendedVisibleRoles: ["Doctor", "Nursing", "Tenant Admin", "Read-only reviewers"],
  },
  {
    key: "patient_decision",
    label: "Patient Decision",
    shortLabel: "Decision",
    description: "Capture the patient response, acknowledgment, witness evidence, and consent trail.",
    ownerLabel: "Doctor with witness / operations support",
    includedSections: ["Patient Decision", "Witness", "Consent & Signatures"],
    recommendedVisibleRoles: ["Doctor", "Operations", "Witness-capable staff", "Tenant Admin", "Legal"],
  },
  {
    key: "legal_readiness",
    label: "Legal Readiness",
    shortLabel: "Readiness",
    description: "Evaluate blockers, compliance requirements, and escalation readiness before document issuance.",
    ownerLabel: "Legal Admin / Legal Officer",
    includedSections: ["Legal Readiness", "Legal Readiness Checklist", "Decision follow-up"],
    recommendedVisibleRoles: ["Legal", "Tenant Admin", "Doctor", "Read-only reviewers"],
  },
  {
    key: "legal_documents_bundle",
    label: "Legal Documents & Bundle",
    shortLabel: "Documents",
    description: "Generate the legal package, PDFs, and supporting evidence bundle.",
    ownerLabel: "Legal",
    includedSections: ["Legal Package", "Legal Case PDF Reports", "Documents"],
    recommendedVisibleRoles: ["Legal", "Authorized Signatory", "Tenant Admin", "Read-only reviewers"],
  },
  {
    key: "closure",
    label: "Closure",
    shortLabel: "Closure",
    description: "Verify final artifacts and confirm the case is ready for authorized closure.",
    ownerLabel: "Authorized Signatory",
    includedSections: ["Final closure checklist", "Latest final PDF", "Download package"],
    recommendedVisibleRoles: ["Authorized Signatory", "Legal", "Tenant Admin", "Auditor"],
  },
];

function getStepMeta(isArabic: boolean): Array<
  Omit<CaseWorkspaceStep, "status" | "missingItems" | "nextAction">
> {
  if (!isArabic) {
    return STEP_META;
  }

  return [
    {
      key: "case_creation",
      label: "إنشاء الحالة",
      shortLabel: "إنشاء",
      description: "تأكيد اكتمال سجل الحالة قبل بدء الإجراءات السريرية والقانونية.",
      ownerLabel: "منسق الحالة / العمليات",
      includedSections: ["ملخص الحالة", "التكليفات واتفاقية مستوى الخدمة"],
      recommendedVisibleRoles: ["الطبيب", "التمريض", "العمليات", "مدير الجهة", "القانوني"],
    },
    {
      key: "medical_decision",
      label: "القرار الطبي",
      shortLabel: "طبي",
      description: "تسجيل الشرح الطبي بقيادة الطبيب والمبرر الطبي لمسار الخروج.",
      ownerLabel: "الطبيب",
      includedSections: ["العرض / إثبات الإبلاغ", "سياق الطبيب والتشخيص"],
      recommendedVisibleRoles: ["الطبيب", "التمريض", "مدير الجهة", "مراجعون للقراءة فقط"],
    },
    {
      key: "patient_decision",
      label: "قرار المريض",
      shortLabel: "القرار",
      description: "توثيق استجابة المريض والإقرار وشاهد الإثبات وسجل الموافقة.",
      ownerLabel: "الطبيب مع دعم الشاهد / العمليات",
      includedSections: ["قرار المريض", "الشاهد", "الموافقات والتواقيع"],
      recommendedVisibleRoles: ["الطبيب", "العمليات", "طاقم قادر على الشهادة", "مدير الجهة", "القانوني"],
    },
    {
      key: "legal_readiness",
      label: "الجاهزية القانونية",
      shortLabel: "الجاهزية",
      description: "تقييم العوائق ومتطلبات الامتثال وجاهزية التصعيد قبل إصدار المستندات.",
      ownerLabel: "المشرف القانوني / الموظف القانوني",
      includedSections: ["الجاهزية القانونية", "قائمة تحقق الجاهزية القانونية", "متابعة القرار"],
      recommendedVisibleRoles: ["القانوني", "مدير الجهة", "الطبيب", "مراجعون للقراءة فقط"],
    },
    {
      key: "legal_documents_bundle",
      label: "المستندات والحزمة القانونية",
      shortLabel: "المستندات",
      description: "إنشاء الحزمة القانونية وملفات PDF وحزمة الأدلة الداعمة.",
      ownerLabel: "القانوني",
      includedSections: ["الحزمة القانونية", "تقارير PDF القانونية للحالة", "المستندات"],
      recommendedVisibleRoles: ["القانوني", "المفوّض المعتمد", "مدير الجهة", "مراجعون للقراءة فقط"],
    },
    {
      key: "closure",
      label: "الإغلاق",
      shortLabel: "إغلاق",
      description: "التحقق من المخرجات النهائية والتأكد من جاهزية الحالة للإغلاق المعتمد.",
      ownerLabel: "المفوّض المعتمد",
      includedSections: ["قائمة تحقق الإغلاق النهائي", "أحدث PDF نهائي", "تنزيل الحزمة"],
      recommendedVisibleRoles: ["المفوّض المعتمد", "القانوني", "مدير الجهة", "المدقق"],
    },
  ];
}

function buildMissingItems(input: BuildCaseWorkspaceFlowInput, isArabic: boolean): Record<CaseWorkspaceStepKey, string[]> {
  const tr = (en: string, ar: string): string => (isArabic ? ar : en);
  const caseCreationMissing: string[] = [];
  if (!input.mrn || input.mrn === "N/A") {
    caseCreationMissing.push(tr("Medical record number is missing.", "رقم السجل الطبي مفقود."));
  }
  if (!input.patientName || input.patientName === "Unknown Patient") {
    caseCreationMissing.push(tr("Patient identity is incomplete.", "هوية المريض غير مكتملة."));
  }
  if (!input.physician || input.physician === "Not assigned") {
    caseCreationMissing.push(tr("Attending physician is not assigned.", "لم يتم تعيين الطبيب المعالج."));
  }
  if (!input.diagnosis || input.diagnosis === "Discharge refusal workflow") {
    caseCreationMissing.push(tr("Clinical diagnosis / summary still needs to be recorded.", "لا يزال التشخيص/الملخص السريري بحاجة إلى التوثيق."));
  }

  const medicalDecisionMissing: string[] = [];
  if (!input.presentationRecorded) {
    medicalDecisionMissing.push(tr("Medical explanation / proof of notice is not recorded.", "لم يتم تسجيل الشرح الطبي / إثبات الإبلاغ."));
  }
  if (!input.physician || input.physician === "Not assigned") {
    medicalDecisionMissing.push(tr("Physician ownership is still unassigned.", "لا تزال مسؤولية الطبيب غير معينة."));
  }

  const patientDecisionMissing: string[] = [];
  if (!input.patientDecision) {
    patientDecisionMissing.push(tr("Patient decision has not been recorded.", "لم يتم تسجيل قرار المريض."));
  }
  if (!input.patientAcknowledged) {
    patientDecisionMissing.push(tr("Patient acknowledgment / signer evidence is missing.", "إقرار المريض / دليل الموقّع مفقود."));
  }
  if (!input.witnessRecorded) {
    patientDecisionMissing.push(
      tr(
        "At least two legally compliant witnesses must be recorded.",
        "يجب تسجيل شاهدين متوافقين نظاميًا على الأقل.",
      ),
    );
  }
  if (!input.consentRecorded) {
    patientDecisionMissing.push(tr("Consent evidence has not been saved.", "لم يتم حفظ أدلة الموافقة."));
  }

  const legalReadinessMissing: string[] = [];
  if (!input.readinessReadyForLegal) {
    legalReadinessMissing.push(input.readinessReason || tr("Legal readiness requirements are still incomplete.", "متطلبات الجاهزية القانونية لا تزال غير مكتملة."));
  }
  for (const blocker of input.readinessBlockers) {
    if (blocker && !legalReadinessMissing.includes(blocker)) {
      legalReadinessMissing.push(blocker);
    }
  }
  if (input.refusalScenario && !input.financialNoticeAvailable) {
    legalReadinessMissing.push(tr("Financial notice is required for the refusal path.", "الإشعار المالي مطلوب لمسار الرفض."));
  }

  const documentMissing: string[] = [];
  if (!input.pdfLatestStatus || input.pdfLatestStatus === "failed") {
    documentMissing.push(tr("A valid legal PDF is not available yet.", "ملف PDF قانوني صالح غير متوفر بعد."));
  }
  if (!input.legalPackageGenerated) {
    documentMissing.push(tr("Legal documentation package is not generated.", "لم يتم إنشاء حزمة المستندات القانونية."));
  }
  if (input.documentCount === 0) {
    documentMissing.push(tr("No supporting documents are attached to the case yet.", "لا توجد مستندات داعمة مرفقة بالحالة حتى الآن."));
  }

  const closureMissing: string[] = [];
  if (input.pdfLatestStatus !== "final") {
    closureMissing.push(tr("Authorized final PDF is required before closure.", "يلزم توفر PDF نهائي معتمد قبل الإغلاق."));
  }
  if (!input.pdfCanFinalize) {
    closureMissing.push(tr("PDF finalization checklist still has unresolved requirements.", "لا تزال قائمة تحقق إنهاء PDF تحتوي على متطلبات غير مستوفاة."));
  }
  if (!input.legalPackageGenerated) {
    closureMissing.push(tr("Evidence bundle / legal package must be generated before closure.", "يجب إنشاء حزمة الأدلة / الحزمة القانونية قبل الإغلاق."));
  }
  if (String(input.caseStatus || "").toUpperCase() !== "CLOSED") {
    closureMissing.push(tr("Case status is still open.", "حالة الملف لا تزال مفتوحة."));
  }

  return {
    case_creation: caseCreationMissing,
    medical_decision: medicalDecisionMissing,
    patient_decision: patientDecisionMissing,
    legal_readiness: legalReadinessMissing,
    legal_documents_bundle: documentMissing,
    closure: closureMissing,
  };
}

function buildNextActions(
  input: BuildCaseWorkspaceFlowInput,
  missingItems: Record<CaseWorkspaceStepKey, string[]>,
  isArabic: boolean,
): Record<CaseWorkspaceStepKey, string> {
  const tr = (en: string, ar: string): string => (isArabic ? ar : en);
  return {
    case_creation:
      missingItems.case_creation.length === 0
        ? tr("Move the case into Medical Decision.", "انقل الحالة إلى القرار الطبي.")
        : tr("Complete the case record basics so the clinical workflow can start.", "أكمل أساسيات سجل الحالة لبدء سير العمل السريري."),
    medical_decision:
      missingItems.medical_decision.length === 0
        ? tr("Move to Patient Decision and capture the response.", "انتقل إلى قرار المريض وسجل الاستجابة.")
        : tr("Doctor should record the discharge explanation and medical rationale.", "يجب على الطبيب تسجيل شرح الخروج والمبرر الطبي."),
    patient_decision:
      missingItems.patient_decision.length === 0
        ? input.patientDecision === "refused"
          ? tr("Send the refusal path to Legal Readiness.", "أرسل مسار الرفض إلى الجاهزية القانونية.")
          : tr("Advance to Legal Readiness for review and document preparation.", "انتقل إلى الجاهزية القانونية للمراجعة وإعداد المستندات.")
        : tr("Capture patient response, acknowledgment, witness, and consent evidence.", "سجل استجابة المريض والإقرار والشاهد وأدلة الموافقة."),
    legal_readiness:
      missingItems.legal_readiness.length === 0
        ? tr("Generate legal documents and the evidence bundle.", "أنشئ المستندات القانونية وحزمة الأدلة.")
        : tr("Resolve legal blockers before document issuance.", "عالج العوائق القانونية قبل إصدار المستندات."),
    legal_documents_bundle:
      missingItems.legal_documents_bundle.length === 0
        ? tr("Issue the authorized final PDF and prepare the case for closure.", "أصدر PDF النهائي المعتمد وجهز الحالة للإغلاق.")
        : tr("Generate or recover the legal PDF set and the legal package.", "أنشئ أو استرجع مجموعة PDF القانونية والحزمة القانونية."),
    closure:
      missingItems.closure.length === 0
        ? tr("Closure prerequisites are satisfied.", "متطلبات الإغلاق مستوفاة.")
        : tr("Resolve final sign-off and closure blockers in order.", "عالج عوائق الاعتماد النهائي والإغلاق بالترتيب."),
  };
}

export function buildCaseExecutionWorkspaceFlow(
  input: BuildCaseWorkspaceFlowInput,
  locale: "en" | "ar" = "en",
): {
  steps: CaseWorkspaceStep[];
  currentStep: CaseWorkspaceStep;
  recommendedStepKey: CaseWorkspaceStepKey;
  roleSummaryLabel: string;
} {
  const isArabic = locale === "ar";
  const stepMeta = getStepMeta(isArabic);
  const missingItems = buildMissingItems(input, isArabic);
  const nextActions = buildNextActions(input, missingItems, isArabic);
  const firstIncompleteStep = stepMeta.find((step) => missingItems[step.key].length > 0)?.key;
  const recommendedStepKey = firstIncompleteStep || "closure";

  let currentReached = false;
  const steps = stepMeta.map((step) => {
    let status: CaseWorkspaceStepStatus = "upcoming";

    if (missingItems[step.key].length === 0) {
      status = "completed";
    } else if (!currentReached) {
      status = "current";
      currentReached = true;
    }

    return {
      ...step,
      status,
      missingItems: missingItems[step.key],
      nextAction: nextActions[step.key],
    } satisfies CaseWorkspaceStep;
  });

  const currentStep =
    steps.find((step) => step.key === recommendedStepKey) || steps[steps.length - 1];

  const normalizedRole = normalizeWorkspaceRole(input.role);
  const roleSummaryLabel =
    normalizedRole === "doctor"
      ? (isArabic ? "مساحة عمل الطبيب" : "Doctor workspace")
      : normalizedRole === "legal"
        ? (isArabic ? "مساحة العمل القانونية" : "Legal workspace")
        : normalizedRole === "signatory"
          ? (isArabic ? "مساحة عمل المفوّض المعتمد" : "Authorized signatory workspace")
          : normalizedRole === "tenant_admin"
            ? (isArabic ? "مساحة عمل مدير الجهة" : "Tenant admin workspace")
            : (isArabic ? "مساحة عمل الحالة" : "Case workspace");

  return {
    steps,
    currentStep,
    recommendedStepKey,
    roleSummaryLabel,
  };
}
