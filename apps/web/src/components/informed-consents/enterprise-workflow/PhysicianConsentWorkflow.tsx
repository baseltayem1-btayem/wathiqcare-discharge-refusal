"use client";



import ConsentSearchEngine from "./ConsentSearchEngine";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  LifeBuoy,
  LockKeyhole,
  MessageSquareText,
  Save,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  Syringe,
  User,
  UserRoundCheck,
} from "lucide-react";

import { ConsentCollaborationPanel } from "@/components/informed-consents/collaboration/ConsentCollaborationPanel";
import { EnterpriseSupportSettingsPanel } from "@/components/informed-consents/enterprise-workflow/EnterpriseSupportSettingsPanel";

type EnterpriseSection = "issueConsent" | "consentLibrary" | "collaboration" | "statusAudit" | "supportSettings";

type ProcedureCatalogItem = {
  id?: string;
  code?: string;
  name?: string;
  nameAr?: string;
  title?: string;
  titleEn?: string;
  titleAr?: string;
  procedureName?: string;
  category?: string;
  specialty?: string;
  department?: string;
};

type PatientSearchItem = {
  id: string;
  mrn: string;
  name: string;
  caseId?: string;
  caseNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  nationalId?: string | null;
  iqamaNumber?: string | null;
  mobileNumber?: string | null;
  emergencyContact?: string | null;
  emergencyContactPhone?: string | null;
  sourceTransactionId?: string | null;
  source?: "trakcare" | "case_fallback";
};

type EncounterItem = {
  id: string;
  encounterId: string;
  admissionDate?: string | null;
  department?: string | null;
  physician?: string | null;
  physicianLicense?: string | null;
  physicianId?: string | null;
  diagnosis?: string | null;
  procedure?: string | null;
  allergies?: string | null;
  currentMedications?: string | null;
  physicianSpecialty?: string | null;
  caseNumber?: string | null;
  sourceTransactionId?: string | null;
  syncStatus?: "SYNCED" | "CACHED" | "UAT_MOCK";
  isMock?: boolean;
  source?: "trakcare" | "cached_local" | "uat_mock";
  mockLabel?: string;
};
type RuntimeConsentTemplate = {
  id: string;
  templateVersionId: string;
  titleAr: string;
  titleEn: string;
  consentType: string;
  specialty: string;
  department: string | null;
  version: string;
  status: string;
  language: "bilingual";
  summaryAr: string | null;
  summaryEn: string | null;
  previewAr: string;
  previewEn: string;
};
type ImcConsentCatalogItem = {
  id: string;
  titleEn: string;
  fileName: string;
  publicPath: string;
  specialty: string;
  templateType: string;
  status: string;
  source: string;
  requiresAnesthesia: boolean;
  isPatientCopy: boolean;
  isEducation: boolean;
  isAnesthesia: boolean;
  lengthBytes: number;
};

type ImcConsentPackage = {
  procedureConsent?: ImcConsentCatalogItem;
  patientEducation?: ImcConsentCatalogItem;
  anesthesiaConsent?: ImcConsentCatalogItem;
  anesthesiaEducation?: ImcConsentCatalogItem;
  matches: ImcConsentCatalogItem[];
};
type WorkflowStepKey =
  | "patientEncounter"
  | "category"
  | "template"
  | "procedure"
  | "anesthesia"
  | "education"
  | "review"
  | "send";

type AnesthesiaDecision =
  | "NONE"
  | "LOCAL"
  | "SEDATION"
  | "REGIONAL"
  | "GENERAL";

type WorkflowState = {
  patientName: string;
  mrn: string;
  encounterNo: string;
  department: string;
  consentCategory: string;
  templateName: string;
  procedureName: string;
  procedureSite: string;
  physicianNotes: string;
  anesthesiaDecision: AnesthesiaDecision;
  anesthesiaReviewRequired: boolean;
  educationRequired: boolean;
  educationPackage: string;
  consentStatus: "DRAFT" | "IN_REVIEW" | "READY_TO_SEND" | "SENT" | "SIGNED";
  pdfStatus: "PENDING" | "DRAFT_READY" | "FINALIZED";
  auditStatus: "ACTIVE" | "INCOMPLETE";
};
type CompletionSummary = {
  patientReady: boolean;
  encounterReady: boolean;
  templateReady: boolean;
  procedureReady: boolean;
  anesthesiaReady: boolean;
  educationReady: boolean;
  pdfReady: boolean;
  auditReady: boolean;
  patientLinkReady: boolean;
  imcTemplateReady: boolean;
  runtimeTemplateMappingReady: boolean;
  sendBlocked: boolean;
  completedChecks: number;
  totalChecks: number;
  progressPercentage: number;
  riskFlags: Array<{
    key: string;
    text: string;
    textAr: string;
    tone: "amber" | "red" | "gray";
  }>;
};

type PhysicianConsentWorkflowProps = {
  auth?: {
    role?: string | null;
    platform_role?: string | null;
    userId?: string | null;
    email?: string | null;
    name?: string | null;
    tenantId?: string | null;
  };
};

type CollaborationTeamUser = {
  id: string;
  fullName?: string | null;
  email?: string | null;
  role?: string | null;
};

type CollaborationReviewTeam = {
  anesthesiologistUserId?: string;
  surgeonUserId?: string;
  legalReviewerUserId?: string;
  nursingUserId?: string;
};

const workflowSteps: Array<{
  key: WorkflowStepKey;
  label: string;
  labelAr: string;
}> = [
  { key: "patientEncounter", label: "Patient", labelAr: "المريض" },
  { key: "category", label: "Category", labelAr: "الفئة" },
  { key: "template", label: "Template", labelAr: "القالب" },
  { key: "procedure", label: "Procedure", labelAr: "الإجراء" },
  { key: "anesthesia", label: "Anesthesia", labelAr: "التخدير" },
  { key: "education", label: "Education", labelAr: "التثقيف" },
  { key: "review", label: "Review PDF", labelAr: "مراجعة المستند" },
  { key: "send", label: "Send", labelAr: "إرسال" },
];

const workflowStepMeta: Record<
  WorkflowStepKey,
  {
    eyebrow: string;
    eyebrowAr: string;
    description: string;
    descriptionAr: string;
  }
> = {
  patientEncounter: {
    eyebrow: "Clinical Intake",
    eyebrowAr: "الاستقبال السريري",
    description: "Search the patient record, verify PHI, and lock the active encounter before authoring starts.",
    descriptionAr: "ابحث عن سجل المريض وتحقق من بياناته ثم ثبت الزيارة النشطة قبل بدء التحرير.",
  },
  category: {
    eyebrow: "Governance",
    eyebrowAr: "الحوكمة",
    description: "Keep the consent category aligned to the approved hospital workflow lane.",
    descriptionAr: "حافظ على توافق فئة الموافقة مع مسار الحوكمة المعتمد في المستشفى.",
  },
  template: {
    eyebrow: "Template Control",
    eyebrowAr: "ضبط القالب",
    description: "Use only approved IMC content with an active runtime mapping before draft generation.",
    descriptionAr: "استخدم فقط المحتوى المعتمد من IMC مع ربط تشغيلي فعال قبل إنشاء المسودة.",
  },
  procedure: {
    eyebrow: "Clinical Disclosure",
    eyebrowAr: "الإفصاح السريري",
    description: "Capture procedure context, laterality, and physician disclosure notes for the legal draft.",
    descriptionAr: "سجل سياق الإجراء والجهة أو الموقع وملاحظات الإفصاح الطبي للمسودة القانونية.",
  },
  anesthesia: {
    eyebrow: "Anesthesia Pathway",
    eyebrowAr: "مسار التخدير",
    description: "Choose the anesthesia track and clearly expose whether anesthesiology review blocks release.",
    descriptionAr: "اختر مسار التخدير مع إظهار ما إذا كانت مراجعة طبيب التخدير تمنع الإصدار.",
  },
  education: {
    eyebrow: "Patient Education",
    eyebrowAr: "تثقيف المريض",
    description: "Confirm the material package the patient must receive before secure signing.",
    descriptionAr: "أكد حزمة التثقيف التي يجب أن يستلمها المريض قبل التوقيع الآمن.",
  },
  review: {
    eyebrow: "Draft Review",
    eyebrowAr: "مراجعة المسودة",
    description: "Generate the exact bilingual draft PDF and inspect evidence readiness before release.",
    descriptionAr: "أنشئ مسودة PDF الثنائية نفسها وراجع جاهزية الأدلة قبل الإصدار.",
  },
  send: {
    eyebrow: "Patient Release",
    eyebrowAr: "إصدار للمريض",
    description: "Create the patient signing link only after all readiness and governance blockers are cleared.",
    descriptionAr: "أنشئ رابط توقيع المريض فقط بعد إزالة جميع موانع الجاهزية والحوكمة.",
  },
};

const anesthesiaOptionCards: Array<{
  value: AnesthesiaDecision;
  icon: LucideIcon;
  tone: "neutral" | "info" | "warning" | "critical";
  description: string;
  descriptionAr: string;
  review: string;
  reviewAr: string;
}> = [
  {
    value: "NONE",
    icon: AlertTriangle,
    tone: "neutral",
    description: "No anesthesia planned. Standard consent pathway remains physician-led.",
    descriptionAr: "لا يوجد تخدير مخطط. يبقى مسار الموافقة تحت قيادة الطبيب المعالج.",
    review: "No anesthesia review",
    reviewAr: "لا توجد مراجعة تخدير",
  },
  {
    value: "LOCAL",
    icon: Syringe,
    tone: "info",
    description: "Local anesthesia documented. Additional review depends on policy and procedure class.",
    descriptionAr: "تم توثيق التخدير الموضعي. تعتمد المراجعة الإضافية على السياسة وتصنيف الإجراء.",
    review: "Policy-dependent review",
    reviewAr: "مراجعة حسب السياسة",
  },
  {
    value: "SEDATION",
    icon: Stethoscope,
    tone: "warning",
    description: "Sedation or MAC pathway. Anesthesiology review must be requested before release.",
    descriptionAr: "مسار التهدئة أو MAC. يجب طلب مراجعة التخدير قبل الإصدار.",
    review: "Review required",
    reviewAr: "المراجعة مطلوبة",
  },
  {
    value: "REGIONAL",
    icon: HeartPulse,
    tone: "warning",
    description: "Regional anesthesia selected. Coordination with anesthesia is required before sending.",
    descriptionAr: "تم اختيار التخدير النصفي أو الإقليمي. يلزم التنسيق مع التخدير قبل الإرسال.",
    review: "Review required",
    reviewAr: "المراجعة مطلوبة",
  },
  {
    value: "GENERAL",
    icon: HeartPulse,
    tone: "critical",
    description: "General anesthesia selected. This is a high-priority review and release blocker.",
    descriptionAr: "تم اختيار التخدير العام. هذه مراجعة عالية الأولوية وتمنع الإصدار.",
    review: "High-priority review",
    reviewAr: "مراجعة عالية الأولوية",
  },
];

const workspaceSections: Array<{
  key: EnterpriseSection;
  title: string;
  titleAr: string;
  icon: LucideIcon;
}> = [
  {
    key: "issueConsent",
    title: "Issue Consent",
    titleAr: "إصدار موافقة مستنيرة",
    icon: FileText,
  },
  {
    key: "consentLibrary",
    title: "Consent Library",
    titleAr: "مكتبة الموافقات المعتمدة",
    icon: Search,
  },
  {
    key: "collaboration",
    title: "Collaboration",
    titleAr: "التواصل الطبي / القانوني",
    icon: MessageSquareText,
  },
  {
    key: "statusAudit",
    title: "Status & Audit",
    titleAr: "التتبع والسجل",
    icon: ShieldCheck,
  },
  {
    key: "supportSettings",
    title: "Support & Settings",
    titleAr: "الدعم والإعدادات",
    icon: Settings,
  },
];

const initialState: WorkflowState = {
  patientName: "Demo Patient",
  mrn: "MRN-000001",
  encounterNo: "ENC-2026-0001",
  department: "Surgery",
  consentCategory: "Surgical Consent",
  templateName: "General Surgery Consent - Bilingual",
  procedureName: "Appendectomy",
  procedureSite: "Not applicable",
  physicianNotes: "",
  anesthesiaDecision: "NONE",
  anesthesiaReviewRequired: false,
  educationRequired: true,
  educationPackage: "Standard procedure education package",
  consentStatus: "DRAFT",
  pdfStatus: "PENDING",
  auditStatus: "ACTIVE",
};

function requiresAnesthesiaReview(decision: AnesthesiaDecision) {
  return decision === "SEDATION" || decision === "REGIONAL" || decision === "GENERAL";
}

function getAnesthesiaLabel(decision: AnesthesiaDecision) {
  switch (decision) {
    case "NONE":
      return "No Anesthesia";
    case "LOCAL":
      return "Local Anesthesia";
    case "SEDATION":
      return "Sedation";
    case "REGIONAL":
      return "Regional Anesthesia";
    case "GENERAL":
      return "General Anesthesia";
    default:
      return decision;
  }
}

function getAnesthesiaLabelAr(decision: AnesthesiaDecision) {
  switch (decision) {
    case "NONE":
      return "لا يوجد تخدير";
    case "LOCAL":
      return "تخدير موضعي";
    case "SEDATION":
      return "تهدئة";
    case "REGIONAL":
      return "تخدير نصفي / إقليمي";
    case "GENERAL":
      return "تخدير عام";
    default:
      return decision;
  }
}

function getCurrentActionGuidance(step: WorkflowStepKey, workflow: WorkflowState, completionSummary: CompletionSummary) {
  if (step === "patientEncounter") {
    return {
      title: "Select the patient and active encounter",
      titleAr: "اختيار المريض والزيارة النشطة",
      description: "Confirm the correct patient, MRN, encounter, and clinical department before creating the consent package.",
      descriptionAr: "تحقق من بيانات المريض ورقم الملف والزيارة والقسم السريري قبل إنشاء حزمة الموافقة.",
      tone: "info" as const,
    };
  }

  if (step === "category") {
    return {
      title: "Choose the approved consent category",
      titleAr: "اختيار تصنيف الموافقة المعتمد",
      description: "Select the consent category from the approved IMC consent library.",
      descriptionAr: "اختر تصنيف الموافقة من مكتبة الموافقات المعتمدة لدى المركز الطبي الدولي.",
      tone: "info" as const,
    };
  }

  if (step === "template") {
    return {
      title: "Select the approved bilingual template",
      titleAr: "اختيار نموذج الموافقة الثنائي المعتمد",
      description: "Only active, approved, and version-controlled templates should be used for patient release.",
      descriptionAr: "يجب استخدام النماذج النشطة والمعتمدة والخاضعة لإدارة الإصدارات فقط عند إصدار الحزمة للمريض.",
      tone: "info" as const,
    };
  }

  if (step === "procedure") {
    return {
      title: "Complete the clinical disclosure details",
      titleAr: "إكمال بيانات الإفصاح السريري",
      description: "Add procedure details, laterality/site, specific risks, alternatives, and physician disclosure notes.",
      descriptionAr: "أدخل تفاصيل الإجراء والموقع أو الجهة والمخاطر الخاصة والبدائل وملاحظات الإفصاح الطبي.",
      tone: "info" as const,
    };
  }

  if (step === "anesthesia") {
    if (workflow.anesthesiaReviewRequired) {
      return {
        title: "Anesthesiologist review is required",
        titleAr: "مراجعة طبيب التخدير مطلوبة",
        description: "Request anesthesia review before releasing the consent package to the patient.",
        descriptionAr: "اطلب مراجعة طبيب التخدير قبل إصدار حزمة الموافقة للمريض.",
        tone: "warning" as const,
      };
    }

    return {
      title: "Confirm the anesthesia pathway",
      titleAr: "تأكيد مسار التخدير",
      description: "The selected anesthesia pathway does not currently block patient release.",
      descriptionAr: "مسار التخدير المحدد لا يمنع حاليًا إصدار الحزمة للمريض.",
      tone: "success" as const,
    };
  }

  if (step === "education") {
    return {
      title: "Attach the patient education package",
      titleAr: "إرفاق حزمة تثقيف المريض",
      description: "The selected education content will be made available to the patient before signature.",
      descriptionAr: "سيتم إتاحة محتوى التثقيف المحدد للمريض قبل التوقيع.",
      tone: completionSummary.educationReady ? "success" as const : "warning" as const,
    };
  }

  if (step === "review") {
    return {
      title: completionSummary.pdfReady ? "Review the generated draft PDF" : "Generate the draft PDF before release",
      titleAr: completionSummary.pdfReady ? "مراجعة مسودة المستند المنشأة" : "إنشاء مسودة المستند قبل الإصدار",
      description: "The physician should review the same legal PDF that will be presented to the patient.",
      descriptionAr: "يجب على الطبيب مراجعة نفس المستند القانوني الذي سيعرض على المريض.",
      tone: completionSummary.pdfReady ? "success" as const : "warning" as const,
    };
  }

  return {
    title: completionSummary.sendBlocked ? "Send is blocked pending readiness checks" : "Consent package is ready for patient release",
    titleAr: completionSummary.sendBlocked ? "الإرسال محظور لحين اكتمال متطلبات الجاهزية" : "حزمة الموافقة جاهزة للإصدار للمريض",
    description: completionSummary.sendBlocked
      ? "Resolve all blocking items before creating the patient signing link."
      : "All required clinical, educational, document, and audit checks are complete.",
    descriptionAr: completionSummary.sendBlocked
      ? "عالج جميع البنود المانعة قبل إنشاء رابط توقيع المريض."
      : "اكتملت جميع المتطلبات السريرية والتثقيفية ومتطلبات المستند وسجل التدقيق.",
    tone: completionSummary.sendBlocked ? "warning" as const : "success" as const,
  };
}

function normalizeTemplateMatchText(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/patient copy/g, "")
    .replace(/patient's copy/g, "")
    .replace(/consent form/g, "")
    .replace(/consent/g, "")
    .replace(/procedure/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreRuntimeTemplateMatch(template: RuntimeConsentTemplate, imcItem: ImcConsentCatalogItem) {
  const runtimeTitle = normalizeTemplateMatchText(template.titleEn);
  const imcTitle = normalizeTemplateMatchText(imcItem.titleEn);

  let score = 0;

  if (runtimeTitle && imcTitle && runtimeTitle === imcTitle) score += 100;
  if (runtimeTitle && imcTitle && runtimeTitle.includes(imcTitle)) score += 70;
  if (runtimeTitle && imcTitle && imcTitle.includes(runtimeTitle)) score += 60;

  const runtimeWords = new Set(runtimeTitle.split(" ").filter(Boolean));
  for (const word of imcTitle.split(" ").filter(Boolean)) {
    if (runtimeWords.has(word)) score += 8;
  }

  if (template.specialty?.toUpperCase() === imcItem.specialty?.toUpperCase()) score += 20;

  const imcType = imcItem.templateType?.toUpperCase();
  const runtimeType = template.consentType?.toUpperCase();

  if (imcType === "PROCEDURE_CONSENT" && runtimeType.includes("CONSENT")) score += 10;
  if (imcType && runtimeType && runtimeType.includes(imcType)) score += 15;

  return score;
}

function findMatchingRuntimeTemplate(
  runtimeTemplates: RuntimeConsentTemplate[],
  imcItem: ImcConsentCatalogItem | undefined,
) {
  if (!imcItem) return null;

  const candidates = runtimeTemplates
    .filter((template) => template.status === "ACTIVE" || template.status === "APPROVED")
    .map((template) => ({
      template,
      score: scoreRuntimeTemplateMatch(template, imcItem),
    }))
    .filter((entry) => entry.score >= 30)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.template || null;
}
function findCollaborationUserId(users: CollaborationTeamUser[], keywords: string[]) {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase());

  const matchedUser = users.find((user) => {
    const searchable = [
      user.fullName,
      user.email,
      user.role,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return normalizedKeywords.some((keyword) => searchable.includes(keyword));
  });

  return matchedUser?.id;
}
export function PhysicianConsentWorkflow({ auth }: PhysicianConsentWorkflowProps) {
  const [activeSection, setActiveSection] = useState<EnterpriseSection>("issueConsent");
  const [activeStepIndex, setActiveStepIndex] = useState(4);
  const [workflow, setWorkflow] = useState<WorkflowState>(initialState);

  const apiContext = {
    tenantId: auth?.tenantId ?? "tenant-pending",
    actorUserId: auth?.userId ?? auth?.email ?? "actor-pending",
    actorName: auth?.name ?? auth?.email ?? "Physician",
    actorRole: auth?.role ?? auth?.platform_role ?? "PHYSICIAN",
  };
  const [reviewTeam, setReviewTeam] = useState<CollaborationReviewTeam>({});
  const [reviewTeamLoading, setReviewTeamLoading] = useState(false);
  const [reviewTeamError, setReviewTeamError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReviewTeam() {
      setReviewTeamLoading(true);
      setReviewTeamError("");

      try {
        const response = await fetch("/api/modules/informed-consents/collaboration/team/users");
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to load collaboration team users.");
        }

        const users = (payload.users || []) as CollaborationTeamUser[];

        if (cancelled) return;

        setReviewTeam({
          anesthesiologistUserId: findCollaborationUserId(users, ["anesthesia", "anesthesiologist", "anesthetist", "تخدير"]),
          surgeonUserId: findCollaborationUserId(users, ["surgeon", "surgery", "surgical", "جراح", "جراحة"]),
          legalReviewerUserId: findCollaborationUserId(users, ["legal", "law", "compliance", "قانون", "شؤون قانونية"]),
          nursingUserId: findCollaborationUserId(users, ["nurse", "nursing", "تمريض", "ممرض"]),
        });
      } catch (error) {
        if (!cancelled) {
          setReviewTeam({});
          setReviewTeamError(error instanceof Error ? error.message : "Failed to load collaboration team users.");
        }
      } finally {
        if (!cancelled) {
          setReviewTeamLoading(false);
        }
      }
    }

    loadReviewTeam();

    return () => {
      cancelled = true;
    };
  }, []);


  const [imcLibraryItems, setImcLibraryItems] = useState<ImcConsentCatalogItem[]>([]);
  const [selectedImcPackage, setSelectedImcPackage] = useState<ImcConsentPackage | null>(null);
  const [imcLibraryLoading, setImcLibraryLoading] = useState(false);
  const [imcLibraryError, setImcLibraryError] = useState("");
  const [imcResolveLoading, setImcResolveLoading] = useState(false);
  const [imcResolveError, setImcResolveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadImcLibrary() {
      setImcLibraryLoading(true);
      setImcLibraryError("");

      try {
        const response = await fetch("/api/modules/informed-consents/imc-library");
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message || payload?.error || "Failed to load IMC approved consent library.");
        }

        if (!cancelled) {
          setImcLibraryItems(Array.isArray(payload.items) ? payload.items : []);
        }
      } catch (error) {
        if (!cancelled) {
          setImcLibraryItems([]);
          setImcLibraryError(error instanceof Error ? error.message : "Failed to load IMC approved consent library.");
        }
      } finally {
        if (!cancelled) {
          setImcLibraryLoading(false);
        }
      }
    }

    loadImcLibrary();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const procedure = workflow.procedureName.trim();

    async function resolveImcPackage() {
      if (procedure.length < 2) {
        setSelectedImcPackage(null);
        setImcResolveError("");
        return;
      }

      setImcResolveLoading(true);
      setImcResolveError("");

      try {
        const response = await fetch(
          `/api/modules/informed-consents/imc-library/resolve?procedure=${encodeURIComponent(procedure)}`,
        );
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.message || payload?.error || "Failed to resolve IMC approved consent package.");
        }

        const resolvedPackage = (payload.package || null) as ImcConsentPackage | null;

        if (cancelled) return;

        setSelectedImcPackage(resolvedPackage);

        if (resolvedPackage?.procedureConsent) {
          setWorkflow((current) => ({
            ...current,
            templateName: resolvedPackage.procedureConsent?.titleEn || current.templateName,
            consentCategory: resolvedPackage.procedureConsent?.templateType || current.consentCategory,
            educationPackage: resolvedPackage.patientEducation?.titleEn || current.educationPackage,
            anesthesiaReviewRequired:
              current.anesthesiaReviewRequired || Boolean(resolvedPackage.procedureConsent?.requiresAnesthesia),
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedImcPackage(null);
          setImcResolveError(error instanceof Error ? error.message : "Failed to resolve IMC approved consent package.");
        }
      } finally {
        if (!cancelled) {
          setImcResolveLoading(false);
        }
      }
    }

    resolveImcPackage();

    return () => {
      cancelled = true;
    };
  }, [workflow.procedureName]);
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<PatientSearchItem[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchItem | null>(null);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [patientSearchError, setPatientSearchError] = useState("");

  const [encounters, setEncounters] = useState<EncounterItem[]>([]);
  const [selectedEncounter, setSelectedEncounter] = useState<EncounterItem | null>(null);
  const [encountersLoading, setEncountersLoading] = useState(false);
  const [encountersError, setEncountersError] = useState("");

  async function runPatientSearch() {
    const query = patientQuery.trim();
    setPatientSearchError("");

    if (query.length < 2) {
      setPatientResults([]);
      setPatientSearchError("Enter at least 2 characters or MRN digits.");
      return;
    }

    setPatientSearchLoading(true);

    try {
      const response = await fetch(`/api/modules/informed-consents/patients/search?q=${encodeURIComponent(query)}`);
      const payload = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(payload?.error || "Patient search failed.");
      }

      setPatientResults(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setPatientResults([]);
      setPatientSearchError(error instanceof Error ? error.message : "Patient search failed.");
    } finally {
      setPatientSearchLoading(false);
    }
  }

  async function loadEncountersForPatient(patient: PatientSearchItem) {
    setSelectedPatient(patient);
    setSelectedEncounter(null);
    setEncounters([]);
    setEncountersError("");
    setEncountersLoading(true);

    setWorkflow((current) => ({
      ...current,
      patientName: patient.name,
      mrn: patient.mrn,
      encounterNo: "",
    }));

    try {
      const response = await fetch(
        `/api/modules/informed-consents/patients/${encodeURIComponent(patient.mrn)}/encounters`,
      );
      const payload = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load patient encounters.");
      }

      setEncounters(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setEncounters([]);
      setEncountersError(error instanceof Error ? error.message : "Failed to load patient encounters.");
    } finally {
      setEncountersLoading(false);
    }
  }

  function selectEncounter(encounter: EncounterItem) {
    setSelectedEncounter(encounter);

    setWorkflow((current) => ({
      ...current,
      encounterNo: encounter.encounterId,
      department: encounter.department || current.department,
      procedureName: encounter.procedure || current.procedureName,
      physicianNotes: encounter.diagnosis
        ? `Diagnosis: ${encounter.diagnosis}`
        : current.physicianNotes,
    }));
  }
  const [runtimeTemplates, setRuntimeTemplates] = useState<RuntimeConsentTemplate[]>([]);
  const [runtimeTemplatesLoading, setRuntimeTemplatesLoading] = useState(false);
  const [runtimeTemplatesError, setRuntimeTemplatesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeTemplates() {
      setRuntimeTemplatesLoading(true);
      setRuntimeTemplatesError("");

      try {
        const response = await fetch("/api/modules/informed-consents/templates");
        const payload = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load runtime consent templates.");
        }

        if (!cancelled) {
          setRuntimeTemplates(Array.isArray(payload) ? payload : []);
        }
      } catch (error) {
        if (!cancelled) {
          setRuntimeTemplates([]);
          setRuntimeTemplatesError(error instanceof Error ? error.message : "Failed to load runtime consent templates.");
        }
      } finally {
        if (!cancelled) {
          setRuntimeTemplatesLoading(false);
        }
      }
    }

    loadRuntimeTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedRuntimeTemplate = useMemo(
    () => findMatchingRuntimeTemplate(runtimeTemplates, selectedImcPackage?.procedureConsent),
    [runtimeTemplates, selectedImcPackage],
  );

  const runtimeTemplateMappingReady = Boolean(selectedRuntimeTemplate?.id && selectedRuntimeTemplate?.templateVersionId);





  const activeStep = workflowSteps[activeStepIndex];

  const completionSummary = useMemo(() => {
    const patientReady = Boolean(workflow.patientName && workflow.mrn && workflow.encounterNo);
    const encounterReady = Boolean(workflow.encounterNo);
    const templateReady = Boolean(workflow.consentCategory && workflow.templateName);
    const procedureReady = Boolean(workflow.procedureName);
    const anesthesiaReady = Boolean(workflow.anesthesiaDecision);
    const educationReady = Boolean(!workflow.educationRequired || workflow.educationPackage);
    const pdfReady = workflow.pdfStatus !== "PENDING";
    const auditReady = workflow.auditStatus === "ACTIVE";
    const patientLinkReady = workflow.consentStatus === "SENT" || workflow.consentStatus === "SIGNED";
    const imcTemplateReady =
      Boolean(selectedImcPackage?.procedureConsent) &&
      selectedImcPackage?.procedureConsent?.status === "ACTIVE";

    const riskFlags = [
      !runtimeTemplateMappingReady
        ? {
            key: "runtime-template-mapping",
            text: "IMC approved PDF matched, but no runtime template mapping was found",
            textAr: "تم العثور على نموذج PDF معتمد من IMC، لكن لا يوجد ربط تشغيلي مطابق في قوالب النظام",
            tone: "red" as const,
          }
        : null,
      !imcTemplateReady
        ? {
            key: "imc-template",
            text: "No approved IMC consent template is selected",
            textAr: "لم يتم اختيار نموذج معتمد من مكتبة المركز الطبي الدولي",
            tone: "red" as const,
          }
        : null,
      workflow.anesthesiaReviewRequired
        ? {
            key: "anesthesia-review",
            text: "Anesthesia review required",
            textAr: "مراجعة طبيب التخدير مطلوبة",
            tone: "amber" as const,
          }
        : null,
      !pdfReady
        ? {
            key: "pdf-draft",
            text: "Draft PDF is required before patient release",
            textAr: "يجب إنشاء مسودة المستند قبل إصدار الحزمة للمريض",
            tone: "amber" as const,
          }
        : null,
      !educationReady
        ? {
            key: "education-package",
            text: "Education package is pending",
            textAr: "حزمة التثقيف غير مكتملة",
            tone: "amber" as const,
          }
        : null,
      !patientLinkReady
        ? {
            key: "patient-link",
            text: "Patient signing link has not been sent",
            textAr: "لم يتم إرسال رابط التوقيع للمريض",
            tone: "gray" as const,
          }
        : null,
    ].filter(Boolean) as Array<{
      key: string;
      text: string;
      textAr: string;
      tone: "amber" | "red" | "gray";
    }>;

    const readinessChecks = [
      patientReady,
      encounterReady,
      templateReady,
      procedureReady,
      anesthesiaReady,
      educationReady,
      pdfReady,
      auditReady,
    ];

    const completedChecks = readinessChecks.filter(Boolean).length;
    const progressPercentage = Math.round((completedChecks / readinessChecks.length) * 100);

    const sendBlocked =
      !runtimeTemplateMappingReady ||
      !imcTemplateReady ||
      workflow.anesthesiaReviewRequired ||
      !patientReady ||
      !templateReady ||
      !procedureReady ||
      !educationReady ||
      !pdfReady;

    return {
      patientReady,
      encounterReady,
      templateReady,
      procedureReady,
      anesthesiaReady,
      educationReady,
      pdfReady,
      auditReady,
      patientLinkReady,
      imcTemplateReady,
      runtimeTemplateMappingReady,
      sendBlocked,
      riskFlags,
      completedChecks,
      totalChecks: readinessChecks.length,
      progressPercentage,
    };
  }, [workflow, selectedImcPackage]);

  function updateWorkflow<K extends keyof WorkflowState>(key: K, value: WorkflowState[K]) {
    setWorkflow((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleAnesthesiaDecision(decision: AnesthesiaDecision) {
    setWorkflow((current) => ({
      ...current,
      anesthesiaDecision: decision,
      anesthesiaReviewRequired: requiresAnesthesiaReview(decision),
      consentStatus: requiresAnesthesiaReview(decision) ? "IN_REVIEW" : current.consentStatus,
    }));
  }
  const [consentDocumentId, setConsentDocumentId] = useState("");
  const [draftPdfUrl, setDraftPdfUrl] = useState("");
  const [draftGenerationLoading, setDraftGenerationLoading] = useState(false);
  const [draftGenerationError, setDraftGenerationError] = useState("");

  async function generateDraftPdf() {
    setDraftGenerationError("");

    const imcProcedureConsent = selectedImcPackage?.procedureConsent;

    if (!selectedPatient) {
      setDraftGenerationError("Select a patient before generating the draft PDF.");
      return;
    }

    if (!selectedEncounter) {
      setDraftGenerationError("Select an encounter before generating the draft PDF.");
      return;
    }

    if (!imcProcedureConsent || imcProcedureConsent.status !== "ACTIVE") {
      setDraftGenerationError("No ACTIVE IMC approved procedure consent is linked to this case.");
      return;
    }

    if (!selectedRuntimeTemplate?.id || !selectedRuntimeTemplate?.templateVersionId) {
      setDraftGenerationError("Runtime template mapping is required before generating the draft PDF.");
      return;
    }

    setDraftGenerationLoading(true);

    try {
      const response = await fetch("/api/modules/informed-consents/generate-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientId: selectedPatient.id || selectedPatient.mrn,
          patientMrn: selectedPatient.mrn,
          patientCaseId: selectedPatient.caseId,

          encounterId: selectedEncounter.id || selectedEncounter.encounterId,
          encounterNumber: selectedEncounter.encounterId,
          encounterCaseNumber: selectedEncounter.caseNumber,
          encounterAdmissionDate: selectedEncounter.admissionDate,
          encounterDepartment: selectedEncounter.department,
          encounterPhysician: selectedEncounter.physician,
          encounterPhysicianLicense: selectedEncounter.physicianLicense,
          encounterPhysicianSpecialty: selectedEncounter.physicianSpecialty,
          encounterDiagnosis: selectedEncounter.diagnosis,
          encounterProcedure: selectedEncounter.procedure || workflow.procedureName,
          encounterSyncStatus: selectedEncounter.syncStatus,
          encounterSource: selectedEncounter.source,

          templateId: selectedRuntimeTemplate.id,
          templateVersionId: selectedRuntimeTemplate.templateVersionId,
          language: "bilingual",

          anesthesiaDecision: workflow.anesthesiaDecision,
          anesthesiaReviewRequired: workflow.anesthesiaReviewRequired,
          anesthesiaTypeLabel: getAnesthesiaDecisionLabel(workflow.anesthesiaDecision),

          imcLibraryItemId: imcProcedureConsent.id,
          imcLibraryTitleEn: imcProcedureConsent.titleEn,
          imcLibraryPublicPath: imcProcedureConsent.publicPath,
          imcLibrarySource: imcProcedureConsent.source,
          imcLibraryStatus: imcProcedureConsent.status,
          imcLibraryTemplateType: imcProcedureConsent.templateType,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Failed to generate draft PDF.");
      }

      const documentId = payload?.id || "";
      const pdfUrl =
        payload?.draftPdfUrl ||
        (documentId
          ? `/api/modules/informed-consents/documents/${encodeURIComponent(documentId)}/pdf?lang=bilingual`
          : "");

      if (!documentId || !pdfUrl) {
        throw new Error("Draft generated but document ID or PDF URL was not returned.");
      }

      setConsentDocumentId(documentId);
      setDraftPdfUrl(pdfUrl);

      setWorkflow((current) => ({
        ...current,
        pdfStatus: "DRAFT_READY",
        consentStatus: "IN_REVIEW",
      }));

      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      setConsentDocumentId("");
      setDraftPdfUrl("");
      setWorkflow((current) => ({
        ...current,
        pdfStatus: "PENDING",
      }));
      setDraftGenerationError(error instanceof Error ? error.message : "Failed to generate draft PDF.");
    } finally {
      setDraftGenerationLoading(false);
    }
  }

  function goNext() {
    setActiveStepIndex((current) => Math.min(current + 1, workflowSteps.length - 1));
  }

  function goBack() {
    setActiveStepIndex((current) => Math.max(current - 1, 0));
  }

  return (
    <main 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <EnterpriseHeader workflow={workflow} />
      <section 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <aside 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <WorkspaceNavigation
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />

          <ConsentSummaryCard workflow={workflow} actorName={apiContext.actorName} />

          <button
            type="button"
            onClick={() => setActiveSection("statusAudit")}
            
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
          >
            <ShieldCheck 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
            View Full Audit Log / عرض سجل التدقيق الكامل
          </button>
        </aside>

        <section 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {activeSection === "consentLibrary" ? (
            <ConsentSearchEngine />
          ) : activeSection === "issueConsent" ? (
            <IssueConsentWorkspace
              activeStep={activeStep}
              activeStepIndex={activeStepIndex}
              setActiveStepIndex={setActiveStepIndex}
              workflow={workflow}
              selectedPatient={selectedPatient}
              selectedEncounter={selectedEncounter}
              selectedRuntimeTemplate={selectedRuntimeTemplate}
              patientQuery={patientQuery}
              setPatientQuery={setPatientQuery}
              runPatientSearch={runPatientSearch}
              patientResults={patientResults}
              patientSearchLoading={patientSearchLoading}
              patientSearchError={patientSearchError}
              loadEncountersForPatient={loadEncountersForPatient}
              encounters={encounters}
              encountersLoading={encountersLoading}
              encountersError={encountersError}
              selectEncounter={selectEncounter}
              imcLibraryLoading={imcLibraryLoading}
              imcResolveLoading={imcResolveLoading}
              imcLibraryError={imcLibraryError}
              imcResolveError={imcResolveError}
              imcLibraryItems={imcLibraryItems}
              selectedImcPackage={selectedImcPackage}
              runtimeTemplatesLoading={runtimeTemplatesLoading}
              runtimeTemplatesError={runtimeTemplatesError}
              updateWorkflow={updateWorkflow}
              handleAnesthesiaDecision={handleAnesthesiaDecision}
              generateDraftPdf={generateDraftPdf}
              draftGenerationLoading={draftGenerationLoading}
              draftGenerationError={draftGenerationError}
              draftPdfUrl={draftPdfUrl}
              consentDocumentId={consentDocumentId}
              goBack={goBack}
              goNext={goNext}
              completionSummary={completionSummary}
            />
          ) : activeSection === "collaboration" ? (
            <WorkspaceCard
              title="Collaboration"
              titleAr="التواصل الطبي / القانوني"
              description="Pre-send clinical, anesthesia, nursing, surgical, and legal collaboration before the unified patient notification."
              descriptionAr="التعاون الداخلي قبل الإرسال بين الطبيب، التخدير، التمريض، الجراح، والشؤون القانونية."
            >
              <CollaborationTeamStatus

                loading={reviewTeamLoading}

                error={reviewTeamError}

                reviewTeam={reviewTeam}

              />


              <ConsentCollaborationPanel

                lang="en"
                caseId={workflow.encounterNo}
                tenantId={apiContext.tenantId}
                actorUserId={apiContext.actorUserId}
                anesthesiologistUserId={reviewTeam.anesthesiologistUserId}
                surgeonUserId={reviewTeam.surgeonUserId}
                legalReviewerUserId={reviewTeam.legalReviewerUserId}
                nursingUserId={reviewTeam.nursingUserId}
              />
            </WorkspaceCard>
          ) : activeSection === "statusAudit" ? (
            <StatusAuditWorkspace workflow={workflow} completionSummary={completionSummary} />
          ) : (
            <WorkspaceCard
              title="Support & Settings"
              titleAr="الدعم والإعدادات"
              description="Legal support, technical tickets, workflow behavior, and consent communication settings."
              descriptionAr="الدعم القانوني، تذاكر الدعم الفني، إعدادات الرحلة، وسلوك الإشعارات."
            >
              <EnterpriseSupportSettingsPanel
                lang="en"
                caseId={workflow.encounterNo}
                tenantId={apiContext.tenantId}
                actorUserId={apiContext.actorUserId}
              />
            </WorkspaceCard>
          )}
        </section>

        <RightContextPanel
          workflow={workflow}
          completionSummary={completionSummary}
          setActiveSection={setActiveSection}
          generateDraftPdf={generateDraftPdf}
              draftGenerationLoading={draftGenerationLoading}
              draftGenerationError={draftGenerationError}
              draftPdfUrl={draftPdfUrl}
              consentDocumentId={consentDocumentId}
            />
      </section>
    </main>
  );
}

function EnterpriseHeader({ workflow }: { workflow: WorkflowState }) {
  return (
    <header 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <LogoImage
            alt="WathiqCare"
            fallback="WC"
            
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
            sources={[
              "/images/wathiqcare-logo.png",
              "/images/wathiqcare-logo-orig.png",
            ]}
          />
          <div>
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <h1 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >WathiqCare</h1>
              <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
              <LogoImage
                alt="International Medical Center"
                fallback="IMC"
                
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                sources={[
                  "/images/imc-logo-white.png",
                  "/images/imc-logo.png",
                  "/images/imc-logo-orig.jpg",
                ]}
              />
            </div>
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >IMC Informed Consent Workspace</p>
              <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Production Preview · API Context Bound
              </span>
            </div>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              Enterprise Digital Consent & Medical-Legal Communication
            </p>
          </div>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <HeaderDataBlock label="Patient / المريض" value={workflow.patientName} />
          <HeaderDataBlock label="MRN / رقم الملف" value={workflow.mrn} />
          <HeaderDataBlock label="Encounter / الزيارة" value={workflow.encounterNo} />
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <StatusPill label="Consent Status" value="Draft" valueAr="مسودة" tone="blue" />
          <StatusPill label="PDF Status" value={workflow.pdfStatus === "PENDING" ? "Pending" : "Draft Ready"} valueAr={workflow.pdfStatus === "PENDING" ? "قيد الإنشاء" : "جاهزة"} tone="amber" />
          <StatusPill label="Audit Status" value="Active" valueAr="نشط" tone="green" />
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <Bell 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
            <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >3</span>
          </div>
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Physician</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >طبيب</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderDataBlock({ label, value }: { label: string; value: string }) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</p>
      <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{value}</p>
    </div>
  );
}

function StatusPill({
  label,
  value,
  valueAr,
  tone,
}: {
  label: string;
  value: string;
  valueAr: string;
  tone: "blue" | "amber" | "green";
}) {
  const toneClass =
    tone === "blue"
      ? "text-blue-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-emerald-700";

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</p>
      <p className={`mt-0.5 font-extrabold ${toneClass}`}>
        {value} <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{valueAr}</span>
      </p>
    </div>
  );
}

function WorkspaceNavigation({
  activeSection,
  setActiveSection,
}: {
  activeSection: EnterpriseSection;
  setActiveSection: (section: EnterpriseSection) => void;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Enterprise Workspace</p>
        <h2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Physician Workflow Shell</h2>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Navigate clinical issuance, collaboration, audit, and support.</p>
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        {workspaceSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.key;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={[
                "flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-start transition",
                isActive
                  ? "bg-[linear-gradient(135deg,#002B5C_0%,#123E76_100%)] text-white shadow-[0_12px_24px_rgba(0,43,92,0.16)]"
                  : "text-[#002B5C] hover:bg-[#EEF5FF] disabled:cursor-not-allowed disabled:opacity-50",
              ].join(" ")}
            >
              <span
                className={[
                  "rounded-2xl border p-2.5",
                  isActive ? "border-white/25 bg-white/10" : "border-[#D8DCE3] bg-[#F8FAFC]",
                ].join(" ")}
              >
                <Icon 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
              </span>
              <span>
                <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{section.title}</span>
                <span className={["block text-sm", isActive ? "text-white/85" : "text-[#002B5C]"].join(" ")}>
                  {section.titleAr}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConsentSummaryCard({ workflow, actorName }: { workflow: WorkflowState; actorName: string }) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div>
          <h2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Consent Summary</h2>
          <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >ملخص الموافقة</span>
        </div>
        <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          Clinical Context
        </span>
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <SummaryRow icon={ClipboardCheck} label="Category" value={workflow.consentCategory} />
        <SummaryRow icon={FileText} label="Template" value={workflow.templateName} />
        <SummaryRow icon={HeartPulse} label="Procedure" value={workflow.procedureName || "Pending"} />
        <SummaryRow
          icon={Syringe}
          label="Anesthesia"
          value={workflow.anesthesiaReviewRequired ? "Review Required" : getAnesthesiaLabel(workflow.anesthesiaDecision)}
          warning={workflow.anesthesiaReviewRequired}
        />
        <SummaryRow icon={UserRoundCheck} label="Created By" value={actorName} />
        <SummaryRow icon={Gauge} label="Last Updated" value="20/05/2025 10:30 AM" />
      </div>
    </div>
  );
}

function IssueConsentWorkspace({
  activeStep,
  activeStepIndex,
  setActiveStepIndex,
  workflow,
  selectedPatient,
  selectedEncounter,
  selectedRuntimeTemplate,
  patientQuery,
  setPatientQuery,
  runPatientSearch,
  patientResults,
  patientSearchLoading,
  patientSearchError,
  loadEncountersForPatient,
  encounters,
  encountersLoading,
  encountersError,
  selectEncounter,
  imcLibraryLoading,
  imcResolveLoading,
  imcLibraryError,
  imcResolveError,
  imcLibraryItems,
  selectedImcPackage,
  runtimeTemplatesLoading,
  runtimeTemplatesError,
  updateWorkflow,
  handleAnesthesiaDecision,
  generateDraftPdf,
  draftGenerationLoading,
  draftGenerationError,
  draftPdfUrl,
  consentDocumentId,
  goBack,
  goNext,
  completionSummary,
}: {
  activeStep: (typeof workflowSteps)[number];
  activeStepIndex: number;
  setActiveStepIndex: (index: number) => void;
  workflow: WorkflowState;
  selectedPatient: PatientSearchItem | null;
  selectedEncounter: EncounterItem | null;
  selectedRuntimeTemplate: RuntimeConsentTemplate | null;
  patientQuery: string;
  setPatientQuery: (value: string) => void;
  runPatientSearch: () => void;
  patientResults: PatientSearchItem[];
  patientSearchLoading: boolean;
  patientSearchError: string;
  loadEncountersForPatient: (patient: PatientSearchItem) => void;
  encounters: EncounterItem[];
  encountersLoading: boolean;
  encountersError: string;
  selectEncounter: (encounter: EncounterItem) => void;
  imcLibraryLoading: boolean;
  imcResolveLoading: boolean;
  imcLibraryError: string;
  imcResolveError: string;
  imcLibraryItems: ImcConsentCatalogItem[];
  selectedImcPackage: ImcConsentPackage | null;
  runtimeTemplatesLoading: boolean;
  runtimeTemplatesError: string;
  updateWorkflow: <K extends keyof WorkflowState>(key: K, value: WorkflowState[K]) => void;
  handleAnesthesiaDecision: (decision: AnesthesiaDecision) => void;
  generateDraftPdf: () => void;
  draftGenerationLoading: boolean;
  draftGenerationError: string;
  draftPdfUrl: string;
  consentDocumentId: string;
  goBack: () => void;
  goNext: () => void;
  completionSummary: CompletionSummary;
}) {
  const actionGuidance = getCurrentActionGuidance(activeStep.key, workflow, completionSummary);
  const stepMeta = workflowStepMeta[activeStep.key];

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <CurrentActionCard guidance={actionGuidance} />

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{stepMeta.eyebrow}</p>
              <h2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{activeStep.label}</h2>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{activeStep.labelAr}</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{stepMeta.description}</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{stepMeta.descriptionAr}</p>
            </div>

            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <StatusMetric title="Completion" value={`${completionSummary.progressPercentage}%`} tone="green" />
              <StatusMetric title="PDF" value={completionSummary.pdfReady ? "Ready" : "Pending"} tone={completionSummary.pdfReady ? "green" : "amber"} />
              <StatusMetric title="Template" value={completionSummary.runtimeTemplateMappingReady ? "Mapped" : "Blocked"} tone={completionSummary.runtimeTemplateMappingReady ? "green" : "red"} />
              <StatusMetric title="Send" value={completionSummary.sendBlocked ? "Blocked" : "Ready"} tone={completionSummary.sendBlocked ? "amber" : "green"} />
            </div>
          </div>

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Patient Context</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{selectedPatient?.name || workflow.patientName}</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >MRN {selectedPatient?.mrn || workflow.mrn}</p>
            </div>
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Encounter Context</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{selectedEncounter?.encounterId || workflow.encounterNo || "Pending"}</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{selectedEncounter?.department || workflow.department}</p>
            </div>
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Template Governance</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{selectedRuntimeTemplate?.titleEn || workflow.templateName}</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{completionSummary.runtimeTemplateMappingReady ? "Runtime mapping active" : "Mapping pending"}</p>
            </div>
          </div>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Readiness Snapshot</p>
          <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Clinical release controls</h3>
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <ReadinessItem label="Patient and encounter locked" labelAr="تم تثبيت المريض والزيارة" ready={completionSummary.patientReady && completionSummary.encounterReady} />
            <ReadinessItem label="IMC and runtime template aligned" labelAr="تمت مواءمة IMC مع القالب التشغيلي" ready={completionSummary.imcTemplateReady && completionSummary.runtimeTemplateMappingReady} />
            <ReadinessItem label="Anesthesia path documented" labelAr="تم توثيق مسار التخدير" ready={completionSummary.anesthesiaReady} warning={workflow.anesthesiaReviewRequired} />
            <ReadinessItem label="Draft PDF reviewed" labelAr="تمت مراجعة مسودة المستند" ready={completionSummary.pdfReady} />
          </div>
        </div>
      </div>

      <WorkspaceCard
        title="Issue Informed Consent"
        titleAr="إصدار موافقة مستنيرة"
        description="Complete the steps below to create and send informed consent to the patient."
        descriptionAr="أكمل الخطوات أدناه لإنشاء وإرسال الموافقة المستنيرة للمريض."
        action={
          <button
            type="button"
            
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
          >
            <Save 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
            Save Draft / حفظ المسودة
          </button>
        }
      >
        <WorkflowStepper activeStepIndex={activeStepIndex} setActiveStepIndex={setActiveStepIndex} />

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {activeStep.key === "patientEncounter" && (
            <PatientEncounterApiStep
              patientQuery={patientQuery}
              setPatientQuery={setPatientQuery}
              runPatientSearch={runPatientSearch}
              patientResults={patientResults}
              patientSearchLoading={patientSearchLoading}
              patientSearchError={patientSearchError}
              selectedPatient={selectedPatient}
              loadEncountersForPatient={loadEncountersForPatient}
              encounters={encounters}
              encountersLoading={encountersLoading}
              encountersError={encountersError}
              selectedEncounter={selectedEncounter}
              selectEncounter={selectEncounter}
            />
          )}

          {activeStep.key === "category" && (
            <SelectField
              label="Consent Category"
              value={workflow.consentCategory}
              onChange={(value) => updateWorkflow("consentCategory", value)}
              options={["Surgical Consent", "Anesthesia Consent", "Blood Transfusion Consent", "Endoscopy Consent", "Research Consent"]}
            />
          )}

          {activeStep.key === "template" && (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <ImcApprovedLibraryCard
                loading={imcLibraryLoading}
                resolveLoading={imcResolveLoading}
                error={imcLibraryError}
                resolveError={imcResolveError}
                libraryItems={imcLibraryItems}
                consentPackage={selectedImcPackage}
                runtimeTemplate={selectedRuntimeTemplate}
                runtimeTemplatesLoading={runtimeTemplatesLoading}
                runtimeTemplatesError={runtimeTemplatesError}
              />

              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Template selection is governed by the IMC Approved Library. The dropdown/manual template selection has been disabled for production safety.
                <br />
                يتم تحديد النموذج من مكتبة المركز الطبي الدولي المعتمدة، وتم تعطيل الاختيار اليدوي في الإنتاج لضمان سلامة الحوكمة.
              </div>
            </div>
          )}

          {activeStep.key === "procedure" && (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <Field label="Procedure Name" value={workflow.procedureName} onChange={(value) => updateWorkflow("procedureName", value)} />
              <Field label="Procedure Site / Laterality" value={workflow.procedureSite} onChange={(value) => updateWorkflow("procedureSite", value)} />
              <TextAreaField label="Physician Disclosure Notes" value={workflow.physicianNotes} onChange={(value) => updateWorkflow("physicianNotes", value)} />
            </div>
          )}

          {activeStep.key === "anesthesia" && (
            <AnesthesiaDecisionStep
              workflow={workflow}
              handleAnesthesiaDecision={handleAnesthesiaDecision}
            />
          )}

          {activeStep.key === "education" && (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <label 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  Patient education package required before signing
                  <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >حزمة تثقيف المريض مطلوبة قبل التوقيع</span>
                </span>
                <input
                  type="checkbox"
                  checked={workflow.educationRequired}
                  onChange={(event) => updateWorkflow("educationRequired", event.target.checked)}
                  
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
                />
              </label>

              <SelectField
                label="Education Package"
                value={workflow.educationPackage}
                onChange={(value) => updateWorkflow("educationPackage", value)}
                options={[
                  "Standard procedure education package",
                  "Surgical risks and alternatives package",
                  "Anesthesia education package",
                  "Blood transfusion education package",
                ]}
              />
            </div>
          )}

          {activeStep.key === "review" && (
            <ReviewPdfStep
              workflow={workflow}
              completionSummary={completionSummary}
              generateDraftPdf={generateDraftPdf}
              draftGenerationLoading={draftGenerationLoading}
              draftGenerationError={draftGenerationError}
              draftPdfUrl={draftPdfUrl}
              consentDocumentId={consentDocumentId}
            />
          )}

          {activeStep.key === "send" && (
            <SendStep workflow={workflow} completionSummary={completionSummary} />
          )}

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <button
              type="button"
              onClick={goBack}
              disabled={activeStepIndex === 0}
              
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
            >
              <ArrowLeft 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
              Back / رجوع
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={activeStepIndex === workflowSteps.length - 1}
              
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
            >
              Continue / متابعة
              <ArrowRight 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
            </button>
          </div>
        </div>
      </WorkspaceCard>

      <WorkflowProgressCard workflow={workflow} completionSummary={completionSummary} />
    </div>
  );
}

function WorkflowProgressCard({
  workflow,
  completionSummary,
}: {
  workflow: WorkflowState;
  completionSummary: CompletionSummary;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div>
          <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            Workflow Progress / تقدم سير العمل
          </h3>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            Completion status across patient, encounter, IMC template, PDF, audit, and release checks.
          </p>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {completionSummary.progressPercentage}%
        </div>
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div
          
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
          style={{ width: `${completionSummary.progressPercentage}%` }}
        />
      </div>

      <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        {completionSummary.completedChecks} Checks Completed / تم إكمال {completionSummary.completedChecks} فحوصات
      </p>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Anesthesia Status</p>
          <p className={workflow.anesthesiaReviewRequired ? "mt-1 text-sm font-bold text-amber-700" : "mt-1 text-sm font-bold text-emerald-700"}>
            {workflow.anesthesiaReviewRequired ? "Review Required" : "Not Required"}
          </p>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >PDF Status</p>
          <p className={completionSummary.pdfReady ? "mt-1 text-sm font-bold text-emerald-700" : "mt-1 text-sm font-bold text-amber-700"}>
            {completionSummary.pdfReady ? "Draft Ready" : "Pending"}
          </p>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Audit Trail</p>
          <p className={completionSummary.auditReady ? "mt-1 text-sm font-bold text-emerald-700" : "mt-1 text-sm font-bold text-amber-700"}>
            {completionSummary.auditReady ? "Active" : "Incomplete"}
          </p>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Send Status</p>
          <p className={completionSummary.sendBlocked ? "mt-1 text-sm font-bold text-amber-700" : "mt-1 text-sm font-bold text-emerald-700"}>
            {completionSummary.sendBlocked ? "Ready Check" : "Ready"}
          </p>
        </div>
      </div>
    </div>
  );
}
function CollaborationTeamStatus({
  loading,
  error,
  reviewTeam,
}: {
  loading: boolean;
  error: string;
  reviewTeam: CollaborationReviewTeam;
}) {
  const assignedCount = [
    reviewTeam.anesthesiologistUserId,
    reviewTeam.surgeonUserId,
    reviewTeam.legalReviewerUserId,
    reviewTeam.nursingUserId,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Loading collaboration team...</p>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >جارٍ تحميل فريق التعاون الطبي والقانوني...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Unable to load collaboration team</p>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{error}</p>
      </div>
    );
  }

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Collaboration team binding</p>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            تم ربط {assignedCount} من 4 أدوار مراجعة من مستخدمي المستأجر الحالي.
          </p>
        </div>
        <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {assignedCount}/4 Assigned
        </span>
      </div>
    </div>
  );
}
function CurrentActionCard({
  guidance,
}: {
  guidance: {
    title: string;
    titleAr: string;
    description: string;
    descriptionAr: string;
    tone: "info" | "warning" | "success";
  };
}) {
  const toneClasses =
    guidance.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : guidance.tone === "warning"
        ? "border-[#E6C766] bg-[#FFF8E6] text-[#8A5A00]"
        : "border-blue-200 bg-blue-50 text-blue-900";

  const Icon =
    guidance.tone === "success"
      ? CheckCircle2
      : guidance.tone === "warning"
        ? AlertTriangle
        : LayoutDashboard;

  return (
    <div className={["rounded-[28px] border px-5 py-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]", toneClasses].join(" ")}>
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <Icon 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
        <div>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Current Guidance</p>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{guidance.title}</p>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{guidance.titleAr}</p>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{guidance.description}</p>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{guidance.descriptionAr}</p>
        </div>
      </div>
    </div>
  );
}

function WorkflowStepper({
  activeStepIndex,
  setActiveStepIndex,
}: {
  activeStepIndex: number;
  setActiveStepIndex: (index: number) => void;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        {workflowSteps.map((step, index) => {
          const isCompleted = index < activeStepIndex;
          const isActive = index === activeStepIndex;
          const meta = workflowStepMeta[step.key];

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => setActiveStepIndex(index)}
              
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
            >
              <span
                className={[
                  "flex min-h-[112px] flex-1 items-start gap-3 rounded-2xl border px-4 py-4 transition",
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : isActive
                      ? "border-[#002B5C] bg-[linear-gradient(135deg,#002B5C_0%,#123E76_100%)] text-white shadow-[0_14px_30px_rgba(0,43,92,0.16)]"
                      : "border-[#D8DCE3] bg-white text-[#475569] hover:border-[#4B9CD3] hover:bg-[#F8FBFF]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold",
                    isCompleted
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : isActive
                        ? "border-white/30 bg-white/10 text-white"
                        : "border-[#CBD5E1] bg-[#F8FAFC] text-[#64748B]",
                  ].join(" ")}
                >
                  {isCompleted ? <CheckCircle2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     /> : index + 1}
                </span>
                <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  <span className={["block text-xs font-extrabold uppercase tracking-[0.12em]", isActive ? "text-[#C9A13B]" : "text-[#94A3B8]"] .join(" ")}>{meta.eyebrow}</span>
                  <span className={["mt-1 block text-sm font-extrabold", isActive ? "text-white" : "text-[#002B5C]"].join(" ")}>
                    {step.label}
                  </span>
                  <span className={["block text-xs", isActive ? "text-white/80" : "text-[#64748B]"].join(" ")}>{step.labelAr}</span>
                  <span className={["mt-2 block text-xs leading-5", isActive ? "text-white/72" : "text-[#64748B]"].join(" ")}>
                    {meta.description}
                  </span>
                </span>
              </span>
              {index < workflowSteps.length - 1 ? <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >→</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PatientEncounterApiStep({
  patientQuery,
  setPatientQuery,
  runPatientSearch,
  patientResults,
  patientSearchLoading,
  patientSearchError,
  selectedPatient,
  loadEncountersForPatient,
  encounters,
  encountersLoading,
  encountersError,
  selectedEncounter,
  selectEncounter,
}: {
  patientQuery: string;
  setPatientQuery: (value: string) => void;
  runPatientSearch: () => void;
  patientResults: PatientSearchItem[];
  patientSearchLoading: boolean;
  patientSearchError: string;
  selectedPatient: PatientSearchItem | null;
  loadEncountersForPatient: (patient: PatientSearchItem) => void;
  encounters: EncounterItem[];
  encountersLoading: boolean;
  encountersError: string;
  selectedEncounter: EncounterItem | null;
  selectEncounter: (encounter: EncounterItem) => void;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              Patient Search
            </p>
            <label 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              Search by MRN, patient name, or case number
            </label>
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <Search 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
              <input
                value={patientQuery}
                onChange={(event) => setPatientQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    runPatientSearch();
                  }
                }}
                placeholder="Example: MRN, patient name, case number"
                
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
              />
            </div>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              البحث عن المريض برقم الملف الطبي أو الاسم أو رقم الحالة.
            </p>
          </div>

          <button
            type="button"
            onClick={runPatientSearch}
            disabled={patientSearchLoading}
            
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
          >
            {patientSearchLoading ? "Searching..." : "Search Patient"}
          </button>
        </div>

        {patientSearchError ? (
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            {patientSearchError}
          </div>
        ) : null}

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <ShieldCheck 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
            <div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >PHI Protection</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Handle patient identifiers only for the active encounter and verify the correct record before continuing.</p>
            </div>
          </div>
        </div>
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Search Results
              </p>
              <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Patients
              </h3>
            </div>
            <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              {patientResults.length} result(s)
            </span>
          </div>

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            {patientResults.length === 0 ? (
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                No patient selected yet. Search using MRN or patient name.
                <br />
                لم يتم اختيار مريض بعد.
              </div>
            ) : (
              patientResults.map((patient) => {
                const isSelected = selectedPatient?.mrn === patient.mrn;

                return (
                  <button
                    key={`${patient.mrn}-${patient.caseId || patient.id}`}
                    type="button"
                    onClick={() => loadEncountersForPatient(patient)}
                    className={[
                      "w-full rounded-xl border p-4 text-start transition",
                      isSelected
                        ? "border-[#002B5C] bg-[#EEF5FF]"
                        : "border-[#D8DCE3] bg-white hover:border-[#C9A13B] hover:bg-[#FFF8E6]",
                    ].join(" ")}
                  >
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <div>
                        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                          <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                            <User 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                          </span>
                          <div>
                            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{patient.name}</p>
                            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                              MRN: {patient.mrn}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                        {isSelected ? <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Selected</span> : null}
                        <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                          {patient.source || "patient"}
                        </span>
                      </div>
                    </div>

                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <p>DOB: {patient.dateOfBirth || "N/A"}</p>
                      <p>Mobile: {patient.mobileNumber || "N/A"}</p>
                      <p>Case: {patient.caseNumber || patient.caseId || "N/A"}</p>
                      <p>ID/Iqama: {patient.nationalId || patient.iqamaNumber || "N/A"}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Encounter Selection
              </p>
              <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Active / Recent Encounters
              </h3>
            </div>
            <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              {encountersLoading ? "Loading" : `${encounters.length} found`}
            </span>
          </div>

          {encountersError ? (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              {encountersError}
            </div>
          ) : null}

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            {!selectedPatient ? (
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Select a patient first to load encounters.
                <br />
                اختر المريض أولًا لعرض الزيارات.
              </div>
            ) : encountersLoading ? (
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                Loading encounters from TrakCare / cached source...
              </div>
            ) : encounters.length === 0 ? (
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                No encounters found for this patient. Manual governance review may be required.
                <br />
                لم يتم العثور على زيارات لهذا المريض.
              </div>
            ) : (
              encounters.map((encounter) => {
                const isSelected = selectedEncounter?.encounterId === encounter.encounterId;

                return (
                  <button
                    key={`${encounter.id}-${encounter.encounterId}`}
                    type="button"
                    onClick={() => selectEncounter(encounter)}
                    className={[
                      "w-full rounded-xl border p-4 text-start transition",
                      isSelected
                        ? "border-emerald-300 bg-emerald-50"
                        : "border-[#D8DCE3] bg-white hover:border-[#C9A13B] hover:bg-[#FFF8E6]",
                    ].join(" ")}
                  >
                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <div>
                        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                          {encounter.encounterId}
                        </p>
                        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                          {encounter.department || "Department N/A"} · {encounter.source || "source N/A"}
                        </p>
                      </div>
                      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                        {isSelected ? <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Selected</span> : null}
                        <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                          {encounter.syncStatus || "LOCAL"}
                        </span>
                      </div>
                    </div>

                    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                      <p>Admission: {encounter.admissionDate || "N/A"}</p>
                      <p>Physician: {encounter.physician || "N/A"}</p>
                      <p>Procedure: {encounter.procedure || "N/A"}</p>
                      <p>Diagnosis: {encounter.diagnosis || "N/A"}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedPatient && selectedEncounter ? (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Selected patient and encounter are ready.</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                {selectedPatient.name} · MRN {selectedPatient.mrn} · Encounter {selectedEncounter.encounterId}
              </p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                تم اختيار المريض والزيارة، وسيتم استخدام الإجراء المرتبط بالزيارة لحل نموذج IMC المعتمد.
              </p>
            </div>
            <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              Ready for template resolution
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
function ImcApprovedLibraryCard({
  loading,
  resolveLoading,
  error,
  resolveError,
  libraryItems,
  consentPackage,
  runtimeTemplate,
  runtimeTemplatesLoading,
  runtimeTemplatesError,
}: {
  loading: boolean;
  resolveLoading: boolean;
  error: string;
  resolveError: string;
  libraryItems: ImcConsentCatalogItem[];
  consentPackage: ImcConsentPackage | null;
  runtimeTemplate: RuntimeConsentTemplate | null;
  runtimeTemplatesLoading: boolean;
  runtimeTemplatesError: string;
}) {
  const procedureConsent = consentPackage?.procedureConsent;
  const patientEducation = consentPackage?.patientEducation;
  const anesthesiaConsent = consentPackage?.anesthesiaConsent;
  const runtimeMappingReady = Boolean(runtimeTemplate?.id && runtimeTemplate?.templateVersionId);

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            IMC Approved Library
          </p>
          <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            مكتبة نماذج المركز الطبي الدولي المعتمدة
          </h3>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            Production source of truth for consent template selection. Patient release is blocked unless an ACTIVE IMC-approved template is resolved.
          </p>
        </div>

        <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {loading ? "Loading..." : `${libraryItems.length} Active Items`}
        </span>
      </div>

      <div className={[
        "mt-5 rounded-2xl border px-4 py-4 text-sm shadow-sm",
        runtimeMappingReady
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-800",
      ].join(" ")}>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Runtime DB Template Mapping</p>
        {runtimeTemplatesLoading ? (
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Loading runtime templates...</p>
        ) : runtimeTemplatesError ? (
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{runtimeTemplatesError}</p>
        ) : runtimeTemplate ? (
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            {runtimeTemplate.titleEn} · {runtimeTemplate.version} · templateId: {runtimeTemplate.id}
          </p>
        ) : (
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            IMC approved PDF matched, but no runtime template mapping was found. Governance mapping is required before draft generation.
            <br />
            تم العثور على نموذج PDF معتمد من IMC، لكن لا يوجد ربط تشغيلي مطابق في قوالب النظام.
          </p>
        )}
      </div>
      {error || resolveError ? (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {error || resolveError}
        </div>
      ) : null}

      {resolveLoading ? (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          Resolving approved IMC consent package...
        </div>
      ) : procedureConsent ? (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Procedure Consent</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{procedureConsent.titleEn}</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{procedureConsent.fileName}</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >ACTIVE · {procedureConsent.specialty}</p>
          </div>

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Patient Education</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{patientEducation?.titleEn || "Not matched"}</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{patientEducation?.fileName || "Pending governance mapping"}</p>
          </div>

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Anesthesia Package</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{anesthesiaConsent?.titleEn || "Not required / not matched"}</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{anesthesiaConsent?.fileName || "Based on anesthesia decision"}</p>
          </div>
        </div>
      ) : (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          No approved IMC procedure consent has been resolved for the selected procedure. Legal/Governance review is required before patient release.
          <br />
          لم يتم العثور على نموذج إجراء معتمد مطابق ضمن مكتبة المركز الطبي الدولي. يلزم الرجوع إلى الحوكمة / الشؤون القانونية قبل إصدار الحزمة للمريض.
        </div>
      )}
    </div>
  );
}
function AnesthesiaDecisionStep({
  workflow,
  handleAnesthesiaDecision,
}: {
  workflow: WorkflowState;
  handleAnesthesiaDecision: (decision: AnesthesiaDecision) => void;
}) {
  return (
    <div>
      <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        Anesthesia Decision / قرار التخدير
      </h3>
      <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        Select the anesthesia pathway applicable to this procedure.
      </p>
      <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        اختر مسار التخدير المناسب لهذا الإجراء.
      </p>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        {anesthesiaOptionCards.map((option) => {
          const Icon = option.icon;
          const isSelected = workflow.anesthesiaDecision === option.value;
          const toneClass =
            option.tone === "critical"
              ? "border-red-200 bg-red-50"
              : option.tone === "warning"
                ? "border-[#E6C766] bg-[#FFF8E6]"
                : option.tone === "info"
                  ? "border-blue-200 bg-blue-50"
                  : "border-[#D8DCE3] bg-[#F8FAFC]";

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleAnesthesiaDecision(option.value)}
              className={[
                "rounded-[24px] border p-5 text-start transition shadow-sm",
                isSelected
                  ? "border-[#002B5C] bg-[#EEF5FF] shadow-[0_14px_28px_rgba(0,43,92,0.12)]"
                  : `${toneClass} hover:border-[#4B9CD3]`,
              ].join(" ")}
            >
              <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                  <Icon 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
                </span>
                <span className={[
                  "rounded-full px-3 py-1 text-[11px] font-extrabold",
                  option.tone === "critical"
                    ? "bg-red-100 text-red-800"
                    : option.tone === "warning"
                      ? "bg-[#FFF1CC] text-[#8A5A00]"
                      : option.tone === "info"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700",
                ].join(" ")}>
                  {option.review}
                </span>
              </div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                {getAnesthesiaLabel(option.value)}
              </p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                {getAnesthesiaLabelAr(option.value)}
              </p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{option.description}</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{option.descriptionAr}</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{option.reviewAr}</p>
            </button>
          );
        })}
      </div>

      <AnesthesiaReviewMessage workflow={workflow} />

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        You can continue the workflow. The system will block final send until review is completed.
        <br />
        يمكنك متابعة سير العمل. سيمنع النظام الإرسال النهائي حتى اكتمال المراجعة.
      </div>
    </div>
  );
}

function AnesthesiaReviewMessage({ workflow }: { workflow: WorkflowState }) {
  if (workflow.anesthesiaDecision === "NONE") {
    return (
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <CheckCircle2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
          <div>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              No anesthesiologist review is required based on the current selection.
            </p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              لا تتطلب هذه الموافقة مراجعة طبيب التخدير بناءً على الاختيار الحالي.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (workflow.anesthesiaDecision === "LOCAL") {
    return (
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <Syringe 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
          <div>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              Local anesthesia selected. Review requirement may depend on hospital policy and procedure classification.
            </p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              تم اختيار التخدير الموضعي. قد تعتمد الحاجة إلى مراجعة إضافية على سياسة المستشفى وتصنيف الإجراء.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <AlertTriangle 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
          <div>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              Anesthesiologist review is required before patient release.
            </p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              يجب إكمال مراجعة طبيب التخدير قبل إصدار حزمة الموافقة للمريض.
            </p>
          </div>
        </div>

        <button
          type="button"
          
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
        >
          <UserRoundCheck 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
          Request Anesthesia Review / طلب مراجعة طبيب التخدير
        </button>
      </div>
    </div>
  );
}

function ReviewPdfStep({
  workflow,
  completionSummary,
  generateDraftPdf,
  draftGenerationLoading,
  draftGenerationError,
  draftPdfUrl,
  consentDocumentId,
}: {
  workflow: WorkflowState;
  completionSummary: CompletionSummary;
  generateDraftPdf: () => void | Promise<void>;
  draftGenerationLoading: boolean;
  draftGenerationError: string;
  draftPdfUrl: string;
  consentDocumentId: string;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          Draft PDF Review / مراجعة مسودة المستند
        </h3>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          This area must render the same legal PDF that the patient will review and sign.
        </p>

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Patient-facing draft preview</p>
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <p><strong>Patient:</strong> {workflow.patientName}</p>
              <p><strong>MRN:</strong> {workflow.mrn}</p>
              <p><strong>Encounter:</strong> {workflow.encounterNo}</p>
              <p><strong>Template:</strong> {workflow.templateName}</p>
              <p><strong>Procedure:</strong> {workflow.procedureName || "Not completed"}</p>
              <p><strong>Anesthesia:</strong> {getAnesthesiaLabel(workflow.anesthesiaDecision)} / {getAnesthesiaLabelAr(workflow.anesthesiaDecision)}</p>
              <p><strong>PDF Status:</strong> {workflow.pdfStatus}</p>
            </div>
          </div>

          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Evidence readiness</p>
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              <ReadinessItem label="Patient context bound" labelAr="تم ربط بيانات المريض" ready={completionSummary.patientReady} />
              <ReadinessItem label="Template governance passed" labelAr="تم اجتياز حوكمة القالب" ready={completionSummary.imcTemplateReady && completionSummary.runtimeTemplateMappingReady} />
              <ReadinessItem label="Procedure and anesthesia captured" labelAr="تم تسجيل الإجراء والتخدير" ready={completionSummary.procedureReady && completionSummary.anesthesiaReady} warning={workflow.anesthesiaReviewRequired} />
              <ReadinessItem label="Draft artifact created" labelAr="تم إنشاء المسودة" ready={completionSummary.pdfReady} />
            </div>
          </div>
        </div>

        {
          draftGenerationError ? (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              {draftGenerationError}
            </div>
          ) : null
        }

        {consentDocumentId ? (
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <strong>IMC Template-First Draft Ready.</strong>
            <br />
            Document ID: {consentDocumentId}
          </div>
        ) : null}

        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <button
            type="button"
            onClick={generateDraftPdf}
            disabled={draftGenerationLoading}
            
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
          >
            {draftGenerationLoading ? "Generating IMC PDF..." : "Generate Draft PDF / إنشاء مسودة المستند"}
          </button>
          <button
            type="button"
            disabled={!draftPdfUrl}
            onClick={() => draftPdfUrl && window.open(draftPdfUrl, "_blank", "noopener,noreferrer")}
            
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
          >
            Open Full Preview / فتح المعاينة الكاملة
          </button>
        </div>
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          Readiness Checklist / قائمة الجاهزية
        </h3>
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <ReadinessItem label="Patient selected" labelAr="تم اختيار المريض" ready={completionSummary.patientReady} />
          <ReadinessItem label="Encounter selected" labelAr="تم اختيار الزيارة" ready={completionSummary.encounterReady} />
          <ReadinessItem label="Template selected" labelAr="تم اختيار القالب" ready={completionSummary.templateReady} />
          <ReadinessItem label="IMC approved template" labelAr="نموذج معتمد من المركز الطبي الدولي" ready={completionSummary.imcTemplateReady} />
          <ReadinessItem label="Procedure details completed" labelAr="تم إكمال بيانات الإجراء" ready={completionSummary.procedureReady} />
          <ReadinessItem label="Education package selected" labelAr="حزمة التثقيف مكتملة" ready={completionSummary.educationReady} />
          <ReadinessItem label="Draft PDF generated" labelAr="تم إنشاء مسودة المستند" ready={completionSummary.pdfReady} />
        </div>
      </div>
    </div>
  );
}

function SendStep({
  workflow,
  completionSummary,
}: {
  workflow: WorkflowState;
  completionSummary: CompletionSummary;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        Send to Patient / إرسال للمريض
      </h3>

      {completionSummary.sendBlocked ? (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <strong>Send Readiness: Blocked</strong>
          <br />
          Resolve the blocking readiness items before creating the patient signing link.
          <br />
          حالة الإرسال: محظور — يجب معالجة البنود المانعة قبل إنشاء رابط توقيع المريض.
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            {completionSummary.riskFlags.map((flag) => (
              <div key={flag.key} 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                {flag.text}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Send Readiness: Ready</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                All required clinical, educational, document, and audit checks are complete.
              </p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
                اكتملت جميع المتطلبات السريرية والتثقيفية ومتطلبات المستند وسجل التدقيق.
              </p>
            </div>

            <button
              type="button"
              
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
            >
              <Send 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
              Create Patient Signing Link / إنشاء رابط توقيع المريض
            </button>
          </div>
        </div>
      )}

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <p><strong>Patient:</strong> {workflow.patientName}</p>
        <p><strong>MRN:</strong> {workflow.mrn}</p>
        <p><strong>Encounter:</strong> {workflow.encounterNo}</p>
      </div>
    </div>
  );
}

function RightContextPanel({
  workflow,
  completionSummary,
  setActiveSection,
  generateDraftPdf,
  draftGenerationLoading,
  draftGenerationError,
  draftPdfUrl,
  consentDocumentId,
}: {
  workflow: WorkflowState;
  completionSummary: CompletionSummary;
  setActiveSection: (section: EnterpriseSection) => void;
  generateDraftPdf: () => void | Promise<void>;
  draftGenerationLoading: boolean;
  draftGenerationError: string;
  draftPdfUrl: string;
  consentDocumentId: string;
}) {
  return (
    <aside 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <PanelCard title="Case Readiness" titleAr="جاهزية الحالة">
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <div>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >Overall completion</p>
              <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{completionSummary.progressPercentage}%</p>
            </div>
            <span className={[
              "rounded-full px-3 py-1 text-xs font-extrabold",
              completionSummary.sendBlocked ? "bg-[#FFF1CC] text-[#8A5A00]" : "bg-emerald-100 text-emerald-800",
            ].join(" ")}>
              {completionSummary.sendBlocked ? "Blocked" : "Ready"}
            </span>
          </div>
        </div>
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <ReadinessItem label="Patient selected" labelAr="تم اختيار المريض" ready={completionSummary.patientReady} />
          <ReadinessItem label="Encounter selected" labelAr="تم اختيار الزيارة" ready={completionSummary.encounterReady} />
          <ReadinessItem label="Template selected" labelAr="تم اختيار القالب" ready={completionSummary.templateReady} />
          <ReadinessItem label="IMC approved template" labelAr="نموذج معتمد من المركز الطبي الدولي" ready={completionSummary.imcTemplateReady} />
          <ReadinessItem label="Procedure details completed" labelAr="تم إكمال بيانات الإجراء" ready={completionSummary.procedureReady} />
          <ReadinessItem label="Anesthesia decision" labelAr="قرار التخدير" ready={completionSummary.anesthesiaReady} warning={workflow.anesthesiaReviewRequired} />
          <ReadinessItem label="Education package" labelAr="حزمة التثقيف" ready={completionSummary.educationReady} />
          <ReadinessItem label="Draft PDF generated" labelAr="مسودة المستند" ready={completionSummary.pdfReady} />
          <ReadinessItem label="Patient link sent" labelAr="رابط المريض" ready={completionSummary.patientLinkReady} />
        </div>
      </PanelCard>

      <PanelCard title="Risk Flags" titleAr="تنبيهات المخاطر">
        {completionSummary.riskFlags.length > 0 ? (
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            {completionSummary.riskFlags.map((flag) => (
              <RiskFlag
                key={flag.key}
                text={flag.text}
                textAr={flag.textAr}
                active={flag.tone !== "gray"}
                tone={flag.tone}
              />
            ))}
          </div>
        ) : (
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >No active risk flags</p>
            <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >لا توجد تنبيهات مخاطر نشطة حاليًا</p>
          </div>
        )}
      </PanelCard>

      <PanelCard title="Quick Actions" titleAr="إجراءات سريعة">
        <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          <QuickActionButton icon={UserRoundCheck} label="Request Anesthesia Review" labelAr="طلب مراجعة طبيب التخدير" onClick={() => setActiveSection("collaboration")} />
          <QuickActionButton icon={FileText} label={draftGenerationLoading ? "Generating IMC PDF..." : "Generate Draft PDF"} labelAr="إنشاء مسودة المستند" onClick={generateDraftPdf} disabled={draftGenerationLoading} />
          <QuickActionButton icon={FileText} label="Open Full Preview" labelAr="فتح المعاينة الكاملة" onClick={() => draftPdfUrl && window.open(draftPdfUrl, "_blank", "noopener,noreferrer")} disabled={!draftPdfUrl} />
          <QuickActionButton icon={MessageSquareText} label="Open Collaboration" labelAr="فتح التواصل الطبي القانوني" onClick={() => setActiveSection("collaboration")} />
          <QuickActionButton icon={Settings} label="Go to Support & Settings" labelAr="الانتقال للدعم والإعدادات" onClick={() => setActiveSection("supportSettings")} />

          {/* Right panel draftGenerationError */}
          {draftGenerationError ? (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              {draftGenerationError}
            </div>
          ) : null}

          {consentDocumentId ? (
            <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
              IMC Template-First Draft Ready
              <br />
              {consentDocumentId}
            </div>
          ) : null}
        </div>
      </PanelCard>
    </aside>
  );
}

function StatusAuditWorkspace({
  workflow,
  completionSummary,
}: {
  workflow: WorkflowState;
  completionSummary: CompletionSummary;
}) {
  return (
    <WorkspaceCard
      title="Status & Audit"
      titleAr="التتبع والسجل"
      description="Operational status, evidence readiness, audit trail checkpoints, and final send blockers."
      descriptionAr="حالة التشغيل، جاهزية الأدلة، نقاط سجل التدقيق، وموانع الإرسال النهائي."
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <StatusMetric title="Readiness" value={`${completionSummary.progressPercentage}%`} tone={completionSummary.sendBlocked ? "amber" : "green"} />
        <StatusMetric title="PDF Evidence" value={completionSummary.pdfReady ? "Available" : "Pending"} tone={completionSummary.pdfReady ? "green" : "amber"} />
        <StatusMetric title="Audit Trail" value={completionSummary.auditReady ? "Active" : "Attention"} tone={completionSummary.auditReady ? "green" : "amber"} />
        <StatusMetric title="Risk Flags" value={String(completionSummary.riskFlags.length)} tone={completionSummary.riskFlags.some((flag) => flag.tone === "red") ? "red" : completionSummary.riskFlags.length > 0 ? "amber" : "green"} />
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <PanelCard title="Evidence Readiness" titleAr="جاهزية الأدلة">
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <ReadinessItem label="Patient and encounter" labelAr="المريض والزيارة" ready={completionSummary.patientReady && completionSummary.encounterReady} />
            <ReadinessItem label="Template governance" labelAr="حوكمة القالب" ready={completionSummary.templateReady} />
            <ReadinessItem label="Procedure disclosure" labelAr="إفصاح الإجراء" ready={completionSummary.procedureReady} />
            <ReadinessItem label="Anesthesia workflow" labelAr="مسار التخدير" ready={!workflow.anesthesiaReviewRequired} warning={workflow.anesthesiaReviewRequired} />
            <ReadinessItem label="PDF evidence" labelAr="دليل المستند" ready={completionSummary.pdfReady} />
          </div>
        </PanelCard>

        <PanelCard title="Audit Timeline" titleAr="سجل التدقيق">
          <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            <AuditRow title="Draft created" subtitle="Physician initiated informed consent workflow." />
            <AuditRow title="Template selected" subtitle={workflow.templateName} />
            <AuditRow title="Anesthesia decision captured" subtitle={`${getAnesthesiaLabel(workflow.anesthesiaDecision)} / ${getAnesthesiaLabelAr(workflow.anesthesiaDecision)}`} />
            <AuditRow title="PDF status" subtitle={workflow.pdfStatus} />
          </div>
        </PanelCard>
      </div>
    </WorkspaceCard>
  );
}

function WorkspaceCard({
  title,
  titleAr,
  description,
  descriptionAr,
  action,
  children,
}: {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <div>
          <h2 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
            {title} / {titleAr}
          </h2>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{description}</p>
          <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{descriptionAr}</p>
        </div>
        {action}
      </div>

      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{children}</div>
    </div>
  );
}

function PanelCard({
  title,
  titleAr,
  children,
}: {
  title: string;
  titleAr: string;
  children: React.ReactNode;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
        <h3 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
          {title} / {titleAr}
        </h3>
      </div>
      <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ReadinessItem({
  label,
  labelAr,
  ready,
  warning = false,
}: {
  label: string;
  labelAr: string;
  ready: boolean;
  warning?: boolean;
}) {
  const Icon = ready ? CheckCircle2 : warning ? AlertTriangle : LockKeyhole;
  const colorClass = ready
    ? "text-emerald-700"
    : warning
      ? "text-amber-700"
      : "text-[#64748B]";

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${colorClass}`} />
      <div>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</p>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{labelAr}</p>
      </div>
    </div>
  );
}

function RiskFlag({
  text,
  textAr,
  active,
  tone = "amber",
}: {
  text: string;
  textAr: string;
  active: boolean;
  tone?: "amber" | "red" | "gray";
}) {
  const dotClass =
    tone === "red"
      ? "bg-[#B42318]"
      : tone === "amber"
        ? "bg-[#C9A13B]"
        : "bg-[#94A3B8]";

  const textClass =
    tone === "red"
      ? "text-[#B42318]"
      : tone === "amber"
        ? "text-[#8A5A00]"
        : "text-[#475569]";

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <span className={["mt-1 h-3 w-3 rounded-full", active ? dotClass : "bg-emerald-500"].join(" ")} />
      <div>
        <p className={["font-semibold", textClass].join(" ")}>{text}</p>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{textAr}</p>
      </div>
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  labelAr,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  labelAr: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    
    >
      <Icon 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
      <span>
        <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</span>
        <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{labelAr}</span>
      </span>
    </button>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <Icon 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
      <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{label}</span>
      <span className={["truncate font-semibold", warning ? "text-amber-700" : "text-[#002B5C]"].join(" ")}>
        {value}
      </span>
    </div>
  );
}

function StatusMetric({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "green" | "amber" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : "text-red-700";

  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{title}</p>
      <p className={`mt-2 text-sm font-extrabold ${toneClass}`}>{value}</p>
    </div>
  );
}

function AuditRow({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >
      <span 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
     />
      <div>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{title}</p>
        <p 
      param($m)
      $classes=$m.Groups[1].Value

      if($classes -match '\bgrid\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bflex\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\btruncate\b' -and $classes -notmatch '\bmax-w-full\b'){
        $classes="$classes max-w-full"
      }

      if($classes -match '\boverflow-hidden\b' -and $classes -notmatch '\bmin-w-0\b'){
        $classes="$classes min-w-0"
      }

      if($classes -match '\bwhitespace-nowrap\b' -and $classes -notmatch '\btruncate\b'){
        $classes="$classes truncate"
      }

      "className=""$classes"""
    >{subtitle}</p>
      </div>
    </div>
  );
}

function LogoImage({
  sources,
  alt,
  fallback,
  className,
}: {
  sources: string[];
  alt: string;
  fallback: string;
  className: string;
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = sources[index];

  if (failed || !src) {
    return (
      <div className={`${className} flex items-center justify-center rounded-xl border border-white/25 bg-white/15 text-sm font-extrabold text-white`}>
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} rounded-xl object-contain`}
      onError={() => {
        if (index < sources.length - 1) {
          setIndex(index + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}








































































