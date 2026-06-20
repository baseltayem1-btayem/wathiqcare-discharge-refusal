"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Package,
  RefreshCw,
  Scale,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/card";
import { Input, Select } from "@/components/design-system/input";
import { Progress } from "@/components/design-system/progress";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupLabel,
} from "@/components/design-system/radio-group";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/design-system/tabs";
import {
  buildCaseExecutionWorkspaceFlow,
  type CaseWorkspaceStep,
  type CaseWorkspaceStepKey,
} from "@/components/cases/caseExecutionWorkspaceFlow";
import LegalPackagePanel from "@/components/cases/legal-package/LegalPackagePanel";
import SecureSigningStatusBadges from "@/components/signing/SecureSigningStatusBadges";
import { getLegalReadinessDecisionIndicator } from "@/components/cases/legalReadinessDecision";
import { useI18n } from "@/i18n/I18nProvider";
import type { SecureSigningWorkflow } from "@/lib/server/module-secure-signing-service";
import {
  setDropOffStep,
  trackPrimaryAction,
  trackStepCompleted,
  trackStepViewed,
} from "@/lib/tracking";

type CaseData = {
  id: string;
  mrn: string;
  patient: string;
  physician: string;
  diagnosis: string;
  status: string;
};

type PresentationPayload = {
  language: string;
  interpreter_used: boolean;
  presented_to: string;
  presented_by: string;
};

type SignatureOutcome = "signed" | "refused_to_sign" | "unable_to_sign";
type PatientDecision = "accepted" | "refused";

type SignaturePayload = {
  patient_decision: PatientDecision | "";
  outcome: SignatureOutcome;
  signer_name: string;
  reason: string;
};

type WitnessPayload = {
  witness_id?: string;
  full_name: string;
  role: string;
  role_category: "clinical" | "non_clinical";
  id_type: string;
  id_number: string;
  mobile_number: string;
  attestation_confirmed: boolean;
  attestation_language: "en" | "ar";
  attestation_version: string;
  signature_type: "DIGITAL_SIGNATURE" | "OTP" | "MANUAL_CONFIRMATION";
  signature_hash: string;
  otp_reference: string;
  verification_status: "VERIFIED" | "PENDING" | "FAILED";
  manual_fallback_used: boolean;
};

type WitnessRecord = WitnessPayload & {
  witness_id: string;
};

type ConsentFormPayload = {
  processingPurpose: string;
  lawfulBasis: string;
  consentType: string;
  consentMethod: string;
  documentVersion: string;
  witnessName: string;
  otpReference: string;
};

type ReadinessState = {
  ready_for_legal: boolean;
  reason?: string;
};

type LegalPackageMeta = {
  version: number;
  download_url: string;
};

type ConsentRecordSummary = {
  id: string;
  processingPurpose?: string;
  lawfulBasis?: string;
  consentMethod?: string;
  documentHash?: string | null;
  consentedAt?: string;
};

type LegalReadinessReport = {
  status: string;
  readyForLegal: boolean;
  blockers: string[];
  checklist: Array<{
    key: string;
    label: string;
    required: boolean;
    satisfied: boolean;
    reason: string;
  }>;
  evidence?: {
    consentCount?: number;
    documentCount?: number;
    auditChainVerified?: boolean;
  };
};

type AuditChainResponse = {
  events: Array<{
    id: string;
    eventType: string;
    actorRole?: string | null;
    payloadSummary: string;
    currentHash: string;
    previousHash?: string | null;
    createdAt: string;
  }>;
  verification?: {
    verified: boolean;
    totalEvents: number;
  };
};

type DocumentSummary = {
  id: string;
  template_key?: string;
  title?: string;
  generationStatus?: string;
  generated_at?: string;
};

type CasePdfValidationResult = {
  canFinalize: boolean;
  missingRequired: string[];
  checklist: Array<{
    key: string;
    label: string;
    required: boolean;
    satisfied: boolean;
    reason: string;
  }>;
};

type CasePdfVersionSummary = {
  id: string;
  version: number;
  fileName: string;
  generatedAt: string;
  status: "draft" | "final" | "failed";
  isFinal: boolean;
  templateVersion: string;
  language: string;
  fileSize: number;
  sha256Hash: string | null;
};

type LayoutProps = {
  caseId: string;
  caseData: CaseData;
  error: string;
  loading: boolean;
  pdfBusy: boolean;
  role: string | null;
  presentation: PresentationPayload;
  setPresentation: React.Dispatch<React.SetStateAction<PresentationPayload>>;
  signature: SignaturePayload;
  setSignature: React.Dispatch<React.SetStateAction<SignaturePayload>>;
  witness: WitnessPayload;
  setWitness: React.Dispatch<React.SetStateAction<WitnessPayload>>;
  witnessRecords: WitnessRecord[];
  witnessMinimumMet: boolean;
  witnessGateMessage: string;
  consentForm: ConsentFormPayload;
  setConsentForm: React.Dispatch<React.SetStateAction<ConsentFormPayload>>;
  readiness: ReadinessState | null;
  legalReadinessReport: LegalReadinessReport | null;
  consentRecords: ConsentRecordSummary[];
  auditChain: AuditChainResponse | null;
  documents: DocumentSummary[];
  legalPackage: LegalPackageMeta | null;
  pdfLatest: CasePdfVersionSummary | null;
  pdfValidation: CasePdfValidationResult | null;
  pdfVersions: CasePdfVersionSummary[];
  pdfLanguage: "en" | "ar";
  setPdfLanguage: React.Dispatch<React.SetStateAction<"en" | "ar">>;
  canMedicalActions: boolean;
  canWitnessAction: boolean;
  canLegalApprove: boolean;
  canGenerateBundle: boolean;
  canGeneratePdf: boolean;
  canDownloadFinalDocs: boolean;
  canReadAudit: boolean;
  canReadSmsEvidence: boolean;
  deniedMessage: string;
  successMessage?: string;
  onRecordPresentation: () => Promise<void>;
  onRecordSignature: () => Promise<void>;
  onRecordWitness: () => Promise<void>;
  onRecordConsent: () => Promise<void>;
  onGenerateLegalPackage: () => Promise<void>;
  onGenerateCasePdf: (mode: "draft" | "final", regenerate?: boolean) => Promise<void>;
};

type DetailTab = "supporting" | "documents" | "audit";

type LegalReadinessItem = {
  key: string;
  label: string;
  satisfied: boolean;
  missingReason: string;
};

type GuidedLegalAction = {
  label: string;
  stepKey: CaseWorkspaceStepKey;
};

const LEGAL_DETAIL_ROLES = ["legal", "legal_admin", "legal_officer", "tenant_admin", "platform_admin", "admin"];

function hasLegalDetailRole(role: string): boolean {
  const normalizedRole = String(role || "").trim().toLowerCase();
  return LEGAL_DETAIL_ROLES.includes(normalizedRole);
}

type LegalRiskCategory = "documentation" | "consent" | "witness" | "compliance";

type LegalRuleEvaluation = {
  id: string;
  category: LegalRiskCategory;
  title: string;
  passed: boolean;
  reason: string;
  stepKey: CaseWorkspaceStepKey;
};

function stepBadgeVariant(step: CaseWorkspaceStep): "success" | "warning" | "outline" {
  if (step.status === "completed") {
    return "success";
  }
  return step.missingItems.length > 0 ? "warning" : "outline";
}

function stepStatusLabel(step: CaseWorkspaceStep, isArabic: boolean): string {
  if (step.status === "completed") {
    return isArabic ? "مكتمل" : "Completed";
  }
  if (step.status === "current") {
    return isArabic ? "الحالي" : "Current";
  }
  return isArabic ? "القادم" : "Upcoming";
}

function stepIcon(key: CaseWorkspaceStepKey) {
  switch (key) {
    case "case_creation":
      return ClipboardList;
    case "medical_decision":
      return Stethoscope;
    case "patient_decision":
      return UserCheck;
    case "legal_readiness":
      return Scale;
    case "legal_documents_bundle":
      return Package;
    case "closure":
      return ShieldCheck;
  }
}

function renderMissingState(message: string) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
      {message}
    </div>
  );
}

function translateCaseStatus(status: string, isArabic: boolean): string {
  if (!isArabic) {
    return status;
  }

  switch (String(status || "").trim().toUpperCase()) {
    case "OPEN":
      return "مفتوحة";
    case "CLOSED":
      return "مغلقة";
    case "PENDING":
      return "قيد الانتظار";
    case "IN_PROGRESS":
      return "قيد التنفيذ";
    case "FINAL":
      return "نهائي";
    case "DRAFT":
      return "مسودة";
    case "FAILED":
      return "فشل";
    case "GENERATED":
      return "تم الإنشاء";
    default:
      return status;
  }
}

function translatePdfLanguage(language: string, isArabic: boolean): string {
  if (!isArabic) {
    return language.toUpperCase();
  }

  switch (String(language || "").trim().toLowerCase()) {
    case "en":
      return "الإنجليزية";
    case "ar":
      return "العربية";
    default:
      return language;
  }
}

function translateConsentMethod(method: string | undefined, isArabic: boolean): string {
  if (!method || !isArabic) {
    return method || "";
  }

  switch (method) {
    case "ELECTRONIC_SIGNATURE":
      return "توقيع إلكتروني";
    case "OTP":
      return "رمز تحقق لمرة واحدة";
    case "WITNESS_ACKNOWLEDGMENT":
      return "إقرار الشاهد";
    case "WRITTEN":
      return "كتابي";
    default:
      return method;
  }
}

function translateActorRole(role: string | null | undefined, isArabic: boolean): string {
  if (!isArabic) {
    return role || "system";
  }

  switch (String(role || "").trim().toLowerCase()) {
    case "system":
      return "النظام";
    case "doctor":
    case "physician":
    case "er_doctor":
      return "طبيب";
    case "legal":
    case "legal_admin":
    case "legal_officer":
      return "قانوني";
    case "signatory":
    case "authorized_signatory":
      return "مفوّض معتمد";
    case "tenant_admin":
      return "مدير الجهة";
    default:
      return role || "النظام";
  }
}

function readChecklistSatisfied(
  checklist: CasePdfValidationResult["checklist"] | undefined,
  pattern: RegExp,
): boolean {
  if (!checklist?.length) {
    return false;
  }

  return checklist.some((item) => pattern.test(item.key) && item.satisfied);
}

function mapPdfStatusTone(
  status: CasePdfVersionSummary["status"],
  locked: boolean,
): { variant: "success" | "warning" | "outline"; label: "Draft" | "Final" | "Locked" | "Failed" } {
  if (locked) {
    return { variant: "success", label: "Locked" };
  }

  if (status === "final") {
    return { variant: "success", label: "Final" };
  }

  if (status === "failed") {
    return { variant: "warning", label: "Failed" };
  }

  return { variant: "outline", label: "Draft" };
}

function ProgressRing({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="inline-flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#1f5fa7"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="41" textAnchor="middle" className="fill-slate-900 text-[12px] font-semibold">
          {clamped}%
        </text>
      </svg>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function mapLegalAction(itemKey: string, tr: (en: string, ar: string) => string): GuidedLegalAction {
  switch (itemKey) {
    case "case_data_complete":
      return { label: tr("Complete case profile", "استكمال ملف الحالة"), stepKey: "medical_decision" };
    case "patient_decision_recorded":
    case "signature_captured":
    case "witness_recorded":
      return { label: tr("Capture patient and witness evidence", "توثيق قرار المريض وبيانات الشهود"), stepKey: "patient_decision" };
    case "risk_explanation_present":
      return { label: tr("Record clinical risk explanation", "تسجيل شرح المخاطر السريرية"), stepKey: "medical_decision" };
    case "timestamp_complete":
      return { label: tr("Refresh legal readiness evidence", "تحديث أدلة الجاهزية القانونية"), stepKey: "closure" };
    case "pdf_ready":
      return { label: tr("Generate final legal PDF", "إنشاء PDF القانوني النهائي"), stepKey: "closure" };
    default:
      return { label: tr("Review legal requirements", "مراجعة المتطلبات القانونية"), stepKey: "closure" };
  }
}

export default function CaseExecutionWorkspaceLayout({
  caseId,
  caseData,
  error,
  loading,
  pdfBusy,
  role,
  presentation,
  setPresentation,
  signature,
  setSignature,
  witness,
  setWitness,
  witnessRecords,
  witnessMinimumMet,
  witnessGateMessage,
  consentForm,
  setConsentForm,
  readiness,
  legalReadinessReport,
  consentRecords,
  auditChain,
  documents,
  legalPackage,
  pdfLatest,
  pdfValidation,
  pdfVersions,
  pdfLanguage,
  setPdfLanguage,
  canMedicalActions,
  canWitnessAction,
  canLegalApprove,
  canGenerateBundle,
  canGeneratePdf,
  canDownloadFinalDocs,
  canReadAudit,
  canReadSmsEvidence,
  deniedMessage,
  successMessage,
  onRecordPresentation,
  onRecordSignature,
  onRecordWitness,
  onRecordConsent,
  onGenerateLegalPackage,
  onGenerateCasePdf,
}: LayoutProps) {
  const { lang } = useI18n();

  const isArabic = lang === "ar";
  const tr = useCallback((en: string, ar: string): string => (isArabic ? ar : en), [isArabic]);

  const [manualStepKey, setSelectedStepKey] = useState<CaseWorkspaceStepKey | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("supporting");
  const [patientFormStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [expandedStepKey, setExpandedStepKey] = useState<CaseWorkspaceStepKey | null>(null);
  const [secureSigningWorkflow, setSecureSigningWorkflow] = useState<SecureSigningWorkflow | null>(null);
  const [secureSigningBusy, setSecureSigningBusy] = useState(false);
  const signerInputRef = useRef<HTMLInputElement | null>(null);
  const witnessInputRef = useRef<HTMLInputElement | null>(null);

  const loadSecureSigning = useCallback(async () => {
    try {
      const response = await fetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/secure-signing-link`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) return;
      const payload = (await response.json()) as { workflow?: SecureSigningWorkflow | null };
      setSecureSigningWorkflow(payload.workflow || null);
    } catch {
      setSecureSigningWorkflow(null);
    }
  }, [caseId]);

  useEffect(() => {
    void loadSecureSigning();
  }, [loadSecureSigning]);

  const sendSecureSigning = useCallback(async () => {
    setSecureSigningBusy(true);
    try {
      const response = await fetch(`/api/discharge/cases/${encodeURIComponent(caseId)}/secure-signing-link`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to send secure signing link");
      }

      const payload = (await response.json()) as { workflow?: SecureSigningWorkflow | null };
      setSecureSigningWorkflow(payload.workflow || null);
    } finally {
      setSecureSigningBusy(false);
    }
  }, [caseId]);

  const refusalScenario =
    signature.patient_decision === "refused" ||
    (!signature.patient_decision && signature.outcome !== "signed");
  const financialNoticeAvailable = documents.some(
    (document) => document.template_key === "financial_responsibility_notice",
  );
  const legalDecisionIndicator = getLegalReadinessDecisionIndicator(
    signature.patient_decision || null,
    isArabic ? "ar" : "en",
  );

  const workflowFlow = useMemo(
    () =>
      buildCaseExecutionWorkspaceFlow({
        role,
        mrn: caseData.mrn,
        patientName: caseData.patient,
        physician: caseData.physician,
        diagnosis: caseData.diagnosis,
        caseStatus: caseData.status,
        presentationRecorded: Boolean(presentation.language),
        patientDecision: signature.patient_decision || null,
        patientAcknowledged: Boolean(signature.signer_name),
        witnessRecorded: witnessMinimumMet,
        consentRecorded: consentRecords.length > 0,
        readinessReadyForLegal: Boolean(readiness?.ready_for_legal),
        readinessReason: readiness?.reason,
        readinessBlockers: legalReadinessReport?.blockers ?? [],
        refusalScenario,
        financialNoticeAvailable,
        pdfLatestStatus: pdfLatest?.status ?? null,
        pdfCanFinalize: Boolean(pdfValidation?.canFinalize),
        pdfVersionCount: pdfVersions.length,
        legalPackageGenerated: Boolean(legalPackage),
        documentCount: documents.length,
      }, isArabic ? "ar" : "en"),
    [
      caseData.diagnosis,
      caseData.mrn,
      caseData.patient,
      caseData.physician,
      caseData.status,
      consentRecords.length,
      documents,
      financialNoticeAvailable,
      legalPackage,
      legalReadinessReport?.blockers,
      pdfLatest?.status,
      pdfValidation?.canFinalize,
      pdfVersions.length,
      presentation.language,
      readiness?.ready_for_legal,
      readiness?.reason,
      refusalScenario,
      role,
      isArabic,
      signature.patient_decision,
      signature.signer_name,
      witnessMinimumMet,
    ],
  );

  // Derive selected step: honour manual user selection as long as the step still exists,
  // otherwise fall back to the workflow-recommended step.
  const selectedStepKey: CaseWorkspaceStepKey =
    manualStepKey && workflowFlow.steps.some((s) => s.key === manualStepKey)
      ? manualStepKey
      : workflowFlow.recommendedStepKey;

  const selectedStep =
    workflowFlow.steps.find((step) => step.key === selectedStepKey) || workflowFlow.currentStep;
  const selectedStepIndex = workflowFlow.steps.findIndex((step) => step.key === selectedStep.key);
  const previousStep = selectedStepIndex > 0 ? workflowFlow.steps[selectedStepIndex - 1] : null;
  const nextStep =
    selectedStepIndex >= 0 && selectedStepIndex < workflowFlow.steps.length - 1
      ? workflowFlow.steps[selectedStepIndex + 1]
      : null;
  const completedSteps = workflowFlow.steps.filter((step) => step.status === "completed").length;
  const progressValue = Math.round((completedSteps / workflowFlow.steps.length) * 100);
  const viewOnlyMode =
    !canMedicalActions && !canLegalApprove && !canGeneratePdf && !canGenerateBundle;
  const completionStateRef = useRef<Record<string, boolean>>({});
  const completionTrackingReadyRef = useRef(false);

  const legalReadinessItems = useMemo<LegalReadinessItem[]>(() => {
    const caseDataComplete =
      Boolean(caseData.mrn && caseData.mrn !== "N/A") &&
      Boolean(caseData.patient && caseData.patient !== "Unknown Patient") &&
      Boolean(caseData.physician && caseData.physician !== "Not assigned") &&
      Boolean(caseData.diagnosis && caseData.diagnosis !== "Discharge refusal workflow");

    const patientDecisionRecorded = Boolean(signature.patient_decision);
    const riskExplanationPresent =
      Boolean(presentation.language) ||
      readChecklistSatisfied(pdfValidation?.checklist, /risk|disclosure|discussion/i);
    const signatureCaptured =
      Boolean(signature.signer_name?.trim()) ||
      readChecklistSatisfied(pdfValidation?.checklist, /patient decision|decision/i);
    const witnessRecorded = witnessMinimumMet || readChecklistSatisfied(pdfValidation?.checklist, /witness/i);
    const timestampComplete =
      readChecklistSatisfied(pdfValidation?.checklist, /timestamp|incident|discharge decision/i);
    const pdfReady = Boolean(pdfValidation?.canFinalize);

    return [
      {
        key: "case_data_complete",
        label: tr("Case Data Complete", "اكتمال بيانات الحالة"),
        satisfied: caseDataComplete,
        missingReason: tr("Case profile is incomplete.", "ملف الحالة غير مكتمل."),
      },
      {
        key: "patient_decision_recorded",
        label: tr("Patient Decision Recorded", "توثيق قرار المريض"),
        satisfied: patientDecisionRecorded,
        missingReason: tr("Required element not satisfied: patient decision has not been recorded.", "العنصر المطلوب غير مستوفى: لم يتم تسجيل قرار المريض."),
      },
      {
        key: "risk_explanation_present",
        label: tr("Risk Explanation Present", "توثيق شرح المخاطر"),
        satisfied: riskExplanationPresent,
        missingReason: tr("Required element not satisfied: risk explanation has not been documented.", "العنصر المطلوب غير مستوفى: لم يتم توثيق شرح المخاطر."),
      },
      {
        key: "signature_captured",
        label: tr("Signature Captured", "توثيق التوقيع"),
        satisfied: signatureCaptured,
        missingReason: tr("Required element not satisfied: signature and signer record are incomplete.", "العنصر المطلوب غير مستوفى: سجل التوقيع والموقّع غير مكتمل."),
      },
      {
        key: "witness_recorded",
        label: tr("Witness Recorded", "توثيق الشاهد"),
        satisfied: witnessRecorded,
        missingReason: tr("Required element not satisfied: witness details remain incomplete.", "العنصر المطلوب غير مستوفى: تفاصيل الشاهد لا تزال غير مكتملة."),
      },
      {
        key: "timestamp_complete",
        label: tr("Timestamp Complete", "اكتمال الطوابع الزمنية"),
        satisfied: timestampComplete,
        missingReason: tr("Required element not satisfied: mandatory legal timestamps remain incomplete.", "العنصر المطلوب غير مستوفى: الطوابع الزمنية القانونية الإلزامية لا تزال غير مكتملة."),
      },
      {
        key: "pdf_ready",
        label: tr("Final PDF Control Satisfied", "استيفاء ضبط PDF النهائي"),
        satisfied: pdfReady,
        missingReason: tr("Final PDF checklist is not complete.", "قائمة تحقق PDF النهائي غير مكتملة."),
      },
    ];
  }, [
    caseData.diagnosis,
    caseData.mrn,
    caseData.patient,
    caseData.physician,
    pdfValidation?.canFinalize,
    pdfValidation?.checklist,
    presentation.language,
    signature.patient_decision,
    signature.signer_name,
    tr,
    witnessMinimumMet,
  ]);

  const missingLegalItems = legalReadinessItems.filter((item) => !item.satisfied);
  const legalReadyForFinalization = missingLegalItems.length === 0;
  const focusedStepList = [selectedStep, ...(nextStep ? [nextStep] : [])].filter(
    (step, index, list) => list.findIndex((candidate) => candidate.key === step.key) === index,
  );
  const legalCompletionPercent = Math.round((
    legalReadinessItems.filter((item) => item.satisfied).length /
    Math.max(legalReadinessItems.length, 1)
  ) * 100);
  const canProceedLegally = Boolean(readiness?.ready_for_legal) && legalReadyForFinalization && witnessMinimumMet;
  const roleKey = String(role || "").trim().toLowerCase();
  const hasLegalDetailAccess = hasLegalDetailRole(roleKey);
  const blockerCount = missingLegalItems.length + (!witnessMinimumMet ? 1 : 0);
  const legalRiskLevel: "LOW" | "MEDIUM" | "HIGH" =
    blockerCount >= 3 || !witnessMinimumMet
      ? "HIGH"
      : blockerCount > 0
        ? "MEDIUM"
        : "LOW";
  const legalRiskBadge: "success" | "warning" | "destructive" =
    legalRiskLevel === "HIGH" ? "destructive" : legalRiskLevel === "MEDIUM" ? "warning" : "success";
  const requiredDocumentSuggestions = useMemo(() => {
    const present = new Set(documents.map((doc) => doc.template_key || "").filter(Boolean));
    const suggestions: string[] = [];

    if (!present.has("financial_responsibility_notice") && refusalScenario) {
      suggestions.push(tr("Financial responsibility notice", "إشعار المسؤولية المالية"));
    }
    if (!present.has("refusal_form")) {
      suggestions.push(tr("Discharge refusal form", "نموذج رفض الخروج"));
    }
    if (!present.has("legal_case_pdf") && !pdfLatest) {
      suggestions.push(tr("Legal case PDF report", "تقرير PDF القانوني للحالة"));
    }

    return suggestions;
  }, [documents, pdfLatest, refusalScenario, tr]);

  const complianceSuggestions = useMemo(
    () => missingLegalItems.map((item) => mapLegalAction(item.key, tr).label),
    [missingLegalItems, tr],
  );

  const legalRuleEvaluations = useMemo<LegalRuleEvaluation[]>(() => {
    const hasConsentEvidence = consentRecords.length > 0;
    const auditVerified = Boolean(auditChain?.verification?.verified);
    const hasCoreRefusalDocument = documents.some(
      (document) => (document.template_key || "").toLowerCase() === "refusal_form",
    );

    return [
      {
        id: "RULE-DOC-001",
        category: "documentation",
        title: tr("Core refusal documentation is present", "توفر مستند رفض الخروج الأساسي"),
        passed: hasCoreRefusalDocument,
        reason: hasCoreRefusalDocument
          ? tr("Required refusal form is available.", "نموذج رفض الخروج المطلوب متوفر.")
          : tr("Refusal form is not generated yet.", "لم يتم إنشاء نموذج رفض الخروج بعد."),
        stepKey: "closure",
      },
      {
        id: "RULE-DOC-002",
        category: "documentation",
        title: tr("Case PDF finalization checklist is complete", "اكتمال قائمة تحقق إنهاء ملف الحالة PDF"),
        passed: Boolean(pdfValidation?.canFinalize),
        reason: pdfValidation?.canFinalize
          ? tr("PDF validation confirms legal completeness.", "تحقق PDF يؤكد الاكتمال القانوني.")
          : tr("PDF checklist still has legal gaps.", "قائمة تحقق PDF لا تزال تحتوي فجوات قانونية."),
        stepKey: "closure",
      },
      {
        id: "RULE-CNS-001",
        category: "consent",
        title: tr("Consent evidence is recorded", "توثيق أدلة الموافقة"),
        passed: hasConsentEvidence,
        reason: hasConsentEvidence
          ? tr("At least one consent record exists.", "يوجد سجل موافقة واحد على الأقل.")
          : tr("No consent records are saved.", "لا توجد سجلات موافقة محفوظة."),
        stepKey: "patient_decision",
      },
      {
        id: "RULE-WIT-001",
        category: "witness",
        title: tr("Minimum witness threshold is met", "استيفاء الحد الأدنى للشهود"),
        passed: witnessMinimumMet,
        reason: witnessMinimumMet
          ? tr("Witness minimum requirement is satisfied.", "تم استيفاء الحد الأدنى المطلوب للشهود.")
          : witnessGateMessage,
        stepKey: "patient_decision",
      },
      {
        id: "RULE-CMP-001",
        category: "compliance",
        title: tr("Readiness checklist has no blockers", "عدم وجود عوائق في قائمة الجاهزية"),
        passed: missingLegalItems.length === 0,
        reason:
          missingLegalItems.length === 0
            ? tr("All readiness controls are satisfied.", "جميع ضوابط الجاهزية مستوفاة.")
            : tr("One or more readiness controls are still missing.", "لا تزال بعض ضوابط الجاهزية غير مكتملة."),
        stepKey: "closure",
      },
      {
        id: "RULE-CMP-002",
        category: "compliance",
        title: tr("Audit hash chain is verified", "التحقق من سلسلة التجزئة للتدقيق"),
        passed: auditVerified,
        reason: auditVerified
          ? tr("Audit chain verification is valid.", "التحقق من سلسلة التدقيق صالح.")
          : tr("Audit chain verification is pending or unavailable.", "التحقق من سلسلة التدقيق قيد الانتظار أو غير متوفر."),
        stepKey: "closure",
      },
    ];
  }, [
    auditChain?.verification?.verified,
    consentRecords.length,
    documents,
    missingLegalItems.length,
    pdfValidation?.canFinalize,
    tr,
    witnessGateMessage,
    witnessMinimumMet,
  ]);

  const triggeredLegalRules = useMemo(
    () => legalRuleEvaluations.filter((rule) => !rule.passed),
    [legalRuleEvaluations],
  );

  const legalBlockedReasons = useMemo(
    () => triggeredLegalRules.map((rule) => `${rule.id}: ${rule.reason}`),
    [triggeredLegalRules],
  );

  const riskBreakdown = useMemo(() => {
    const categories: LegalRiskCategory[] = ["documentation", "consent", "witness", "compliance"];
    return categories.map((category) => {
      const categoryRules = legalRuleEvaluations.filter((rule) => rule.category === category);
      const failed = categoryRules.filter((rule) => !rule.passed).length;
      const total = categoryRules.length;
      const status: "LOW" | "MEDIUM" | "HIGH" =
        failed === 0 ? "LOW" : failed >= Math.max(1, Math.ceil(total / 2)) ? "HIGH" : "MEDIUM";
      const badgeVariant: "success" | "warning" | "destructive" =
        status === "HIGH" ? "destructive" : status === "MEDIUM" ? "warning" : "success";

      return { category, failed, total, status, badgeVariant };
    });
  }, [legalRuleEvaluations]);

  const auditTimeline = useMemo(
    () =>
      (auditChain?.events ?? [])
        .slice()
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [auditChain?.events],
  );

  const prioritizedAction = (() => {
    const userIsDoctor = /doctor|physician|er_doctor/.test(roleKey);
    const userIsLegal = /legal|admin/.test(roleKey);
    const userIsSigner = /signatory|patient|authorized_signatory/.test(roleKey);

    if (canProceedLegally && caseData.status.toUpperCase() !== "CLOSED") {
      return {
        title: tr("Issue the final legal package and conclude the record", "إصدار الحزمة القانونية النهائية وإقفال السجل"),
        detail: tr("The present record is legally eligible to proceed with finalization and formal output issuance.", "السجل الحالي مستوفٍ قانونيًا للمضي في الاعتماد النهائي وإصدار المخرجات الرسمية."),
        stepKey: "closure" as CaseWorkspaceStepKey,
      };
    }

    if (!witnessMinimumMet) {
      return {
        title: tr("Remediate witness sufficiency requirements", "استكمال متطلبات كفاية الشهود"),
        detail: witnessGateMessage,
        stepKey: "patient_decision" as CaseWorkspaceStepKey,
      };
    }

    if (userIsDoctor && !presentation.language) {
      return {
        title: tr("Record the treating physician's explanatory note", "تسجيل الإفادة التوضيحية للطبيب المعالج"),
        detail: tr("A documented clinical explanation is required before legal review may progress.", "يلزم توثيق الإفادة السريرية قبل المضي في المراجعة القانونية."),
        stepKey: "medical_decision" as CaseWorkspaceStepKey,
      };
    }

    if (userIsSigner && (!signature.patient_decision || !signature.signer_name?.trim())) {
      return {
        title: tr("Capture the patient's recorded position and signer evidence", "توثيق موقف المريض وبيانات الموقّع"),
        detail: tr("The record remains incomplete until the signer's identity and the patient's decision are formally captured.", "يبقى السجل غير مكتمل إلى حين توثيق هوية الموقّع وموقف المريض بصورة رسمية."),
        stepKey: "patient_decision" as CaseWorkspaceStepKey,
      };
    }

    if (userIsLegal && !canProceedLegally) {
      return {
        title: tr("Remediate outstanding legal deficiencies", "معالجة أوجه النقص القانونية القائمة"),
        detail: tr("Outstanding legal deficiencies must be resolved before final authorization may be given.", "يجب معالجة أوجه النقص القانونية القائمة قبل منح الاعتماد النهائي."),
        stepKey: "closure" as CaseWorkspaceStepKey,
      };
    }

    if (missingLegalItems.length > 0) {
      const nextMissing = missingLegalItems[0];
      const mapped = mapLegalAction(nextMissing.key, tr);
      return {
        title: mapped.label,
        detail: nextMissing.missingReason,
        stepKey: mapped.stepKey,
      };
    }

    if (nextStep) {
      return {
        title: nextStep.nextAction,
        detail: tr("Proceed to the next prescribed workflow stage in order to maintain legal continuity.", "انتقل إلى المرحلة الإجرائية التالية حفاظًا على الاستمرارية القانونية."),
        stepKey: nextStep.key,
      };
    }

    return {
      title: tr("Review and archive the finalized outputs", "مراجعة المخرجات النهائية وأرشفتها"),
      detail: tr("The material record appears complete and may proceed to final review and archival handling.", "يبدو أن الملف مكتمل ويجوز إحالته للمراجعة النهائية والإجراءات الأرشيفية."),
      stepKey: "closure" as CaseWorkspaceStepKey,
    };
  })();

  const legalReportPayload = useMemo(
    () => ({
      caseId,
      generatedAt: new Date().toISOString(),
      readiness: {
        completionPercent: legalCompletionPercent,
        canProceedLegally,
        blockerCount,
        legalRiskLevel,
      },
      blockers: legalBlockedReasons,
      nextAction: prioritizedAction,
      riskBreakdown,
      ruleEvaluations: legalRuleEvaluations,
      actions: {
        complianceSuggestions,
        requiredDocumentSuggestions,
      },
    }),
    [
      blockerCount,
      canProceedLegally,
      caseId,
      complianceSuggestions,
      legalBlockedReasons,
      legalCompletionPercent,
      legalRiskLevel,
      legalRuleEvaluations,
      prioritizedAction,
      requiredDocumentSuggestions,
      riskBreakdown,
    ],
  );

  useEffect(() => {
    trackStepViewed(selectedStep.key, { role: role ?? undefined });
    setDropOffStep(selectedStep.key);
  }, [role, selectedStep.key]);

  useEffect(() => {
    const previous = completionStateRef.current;
    const next: Record<string, boolean> = {};

    if (!completionTrackingReadyRef.current) {
      for (const step of workflowFlow.steps) {
        next[step.key] = step.status === "completed";
      }
      completionStateRef.current = next;
      completionTrackingReadyRef.current = true;
      return;
    }

    for (const step of workflowFlow.steps) {
      const isCompleted = step.status === "completed";
      next[step.key] = isCompleted;

      if (isCompleted && !previous[step.key]) {
        trackStepCompleted(step.key, { role: role ?? undefined });
      }
    }

    completionStateRef.current = next;
  }, [role, workflowFlow.steps]);

  useEffect(() => {
    if (patientFormStep === 4 && signature.patient_decision && signerInputRef.current) {
      signerInputRef.current.focus();
    }
    if (patientFormStep === 5 && witnessInputRef.current) {
      witnessInputRef.current.focus();
    }
  }, [patientFormStep, signature.patient_decision]);

  useEffect(() => {
    if (!prioritizedAction.stepKey) {
      return;
    }

    const shouldAutoNavigate = blockerCount > 0 && selectedStep.key !== prioritizedAction.stepKey;
    if (shouldAutoNavigate) {
      startTransition(() => {
        setSelectedStepKey(prioritizedAction.stepKey);
      });
    }
  }, [blockerCount, prioritizedAction.stepKey, selectedStep.key]);

  function translateRiskCategory(category: LegalRiskCategory): string {
    switch (category) {
      case "documentation":
        return tr("Documentation", "التوثيق");
      case "consent":
        return tr("Consent", "الموافقة");
      case "witness":
        return tr("Witness", "الشهود");
      case "compliance":
        return tr("Compliance", "الامتثال");
    }
  }

  function handleExportLegalReport() {
    const reportText = [
      tr("Formal Legal Readiness Memorandum", "مذكرة الجاهزية القانونية الرسمية"),
      tr("Prepared for enterprise review and presentation.", "أُعدت هذه المذكرة لأغراض المراجعة والعرض المؤسسي."),
      `${tr("Case ID", "معرف الحالة")}: ${caseId}`,
      `${tr("Generated", "تم الإنشاء")}: ${new Date().toLocaleString()}`,
      "",
      `${tr("Legal Eligibility Position", "موقف الأهلية القانونية")}: ${legalCompletionPercent}%`,
      `${tr("Legal Eligibility Determination", "قرار الأهلية القانونية")}: ${canProceedLegally ? tr("Legally Eligible to Proceed", "مستوفٍ قانونيًا للمضي") : tr("Not Legally Eligible to Proceed", "غير مستوفٍ قانونيًا للمضي")}`,
      `${tr("Outstanding Deficiencies", "أوجه النقص القائمة")}: ${blockerCount}`,
      `${tr("Overall Legal Exposure", "مستوى التعرض القانوني العام")}: ${legalRiskLevel}`,
      "",
      tr("Risk Breakdown by Legal Category", "تفصيل المخاطر بحسب الفئة القانونية"),
      ...riskBreakdown.map((item) => `- ${translateRiskCategory(item.category)}: ${item.status} (${item.failed}/${item.total} ${tr("controls unsatisfied", "ضوابط غير مستوفاة")})`),
      "",
      tr("Triggered Legal Findings", "النتائج القانونية المفعلة"),
      ...(triggeredLegalRules.length > 0
        ? triggeredLegalRules.map((rule) => `- ${rule.id} | ${translateRiskCategory(rule.category)} | ${rule.reason}`)
        : [tr("- No adverse legal findings are presently triggered", "- لا توجد نتائج قانونية سلبية مفعلة في الوقت الراهن")]),
      "",
      tr("Recommended Next Procedural Action", "الإجراء الإجرائي الموصى به"),
      `- ${prioritizedAction.title}`,
      `- ${prioritizedAction.detail}`,
      "",
      tr("Recommended Remediation Measures", "إجراءات المعالجة الموصى بها"),
      ...complianceSuggestions.map((item) => `- ${item}`),
      ...requiredDocumentSuggestions.map((item) => `- ${item}`),
    ].join("\n");

    const jsonBlob = new Blob([JSON.stringify(legalReportPayload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const txtBlob = new Blob([reportText], { type: "text/plain;charset=utf-8" });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const txtUrl = URL.createObjectURL(txtBlob);

    const jsonLink = document.createElement("a");
    jsonLink.href = jsonUrl;
    jsonLink.download = `case-${caseId}-legal-status-${timestamp}.json`;
    document.body.appendChild(jsonLink);
    jsonLink.click();
    document.body.removeChild(jsonLink);

    const txtLink = document.createElement("a");
    txtLink.href = txtUrl;
    txtLink.download = `case-${caseId}-legal-status-${timestamp}.txt`;
    document.body.appendChild(txtLink);
    txtLink.click();
    document.body.removeChild(txtLink);

    URL.revokeObjectURL(jsonUrl);
    URL.revokeObjectURL(txtUrl);
  }

  function handlePrintAuditTrail() {
    if (typeof window === "undefined") {
      return;
    }

    const printableRows = auditTimeline
      .slice(0, 40)
      .map((event) => {
        const when = new Date(event.createdAt).toLocaleString();
        const who = translateActorRole(event.actorRole, isArabic);
        const what = event.eventType;
        const detail = event.payloadSummary;
        const hash = event.currentHash.slice(0, 20);
        return `<tr><td>${when}</td><td>${who}</td><td>${what}</td><td>${detail}</td><td>${hash}...</td></tr>`;
      })
      .join("");

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1080,height=760");
    if (!popup) {
      return;
    }

    popup.document.write(`
      <html>
        <head>
          <title>${tr("Audit Timeline", "الخط الزمني للتدقيق")}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px 0; font-size: 20px; }
            p { margin: 0 0 16px 0; color: #475569; font-size: 13px; }
            .table-wrap { width: 100%; overflow-x: auto; }
            table { width: 100%; min-width: 780px; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; vertical-align: top; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${tr("Case Audit Timeline", "الخط الزمني لتدقيق الحالة")}</h1>
          <p>${tr("Case", "الحالة")}: ${caseId} | ${tr("Generated", "تم الإنشاء")}: ${new Date().toLocaleString()}</p>
          <div class="table-wrap"><table>
            <thead>
              <tr>
                <th>${tr("When", "متى")}</th>
                <th>${tr("By", "بواسطة")}</th>
                <th>${tr("What", "ماذا")}</th>
                <th>${tr("Details", "التفاصيل")}</th>
                <th>${tr("Hash", "البصمة")}</th>
              </tr>
            </thead>
            <tbody>${printableRows || `<tr><td colspan="5">${tr("No audit events available", "لا توجد أحداث تدقيق متاحة")}</td></tr>`}</tbody>
          </table></div>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function renderLegalReadinessPanel() {
    return (
      <Card className="h-fit min-w-0 overflow-hidden border-slate-200 bg-white xl:sticky xl:top-24">
        <CardHeader>
          <CardTitle>{tr("Legal Readiness Panel", "لوحة الجاهزية القانونية")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Badge variant={canProceedLegally ? "success" : "warning"}>
              {canProceedLegally ? tr("Legally Eligible to Proceed", "مستوفٍ قانونيًا للمضي") : tr("Not Legally Eligible to Proceed", "غير مستوفٍ قانونيًا للمضي")}
            </Badge>
            <Badge variant={legalRiskBadge}>{tr("Risk", "المخاطر")}: {legalRiskLevel}</Badge>
          </div>

          {hasLegalDetailAccess ? legalReadinessItems.map((item) => {
            const guided = mapLegalAction(item.key, tr);

            return (
              <div key={item.key} className="space-y-2 rounded-xl border border-slate-200 px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-800">{item.label}</span>
                  <Badge variant={item.satisfied ? "success" : "warning"}>{item.satisfied ? tr("SATISFIED", "مستوفى") : tr("REQUIRED ELEMENT NOT SATISFIED", "العنصر المطلوب غير مستوفى")}</Badge>
                </div>
                <div className="text-xs text-slate-600">
                  {item.satisfied
                    ? tr("Completed and legally acceptable.", "مكتمل ومقبول قانونيًا.")
                    : item.missingReason}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Action", "الإجراء")}: {guided.label}</span>
                  {!item.satisfied ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedStepKey(guided.stepKey)}
                    >
                      {tr("Go", "انتقال")}
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          }) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              {tr(
                "Detailed legal controls are evaluated in the background and shown to Legal/Admin users only.",
                "يتم تقييم الضوابط القانونية التفصيلية في الخلفية وتظهر فقط للمستخدمين القانونيين/الإداريين.",
              )}
            </div>
          )}

          {legalReadyForFinalization ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {tr("Legally Eligible to Proceed with Finalization", "مستوفٍ قانونيًا للمضي في الاعتماد النهائي")}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <div className="font-semibold">{tr("Final PDF issuance is legally restricted", "إصدار PDF النهائي مقيد قانونيًا")}</div>
              <div className="mt-1">{tr("Required elements not satisfied:", "العناصر المطلوبة غير المستوفاة:")}</div>
              <ul className="mt-1 space-y-1">
                {missingLegalItems.map((item) => (
                  <li key={item.key}>• {item.missingReason}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  function renderCaseCreationStep() {
    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tr("Executive Legal Summary", "الملخص القانوني التنفيذي")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("MRN", "رقم الملف الطبي")}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{caseData.mrn}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Patient", "المريض")}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{caseData.patient}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Current owner", "المالك الحالي")}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">{caseData.physician}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Case status", "حالة الحالة")}</div>
                <div className="mt-1"><Badge variant="outline">{translateCaseStatus(caseData.status, isArabic)}</Badge></div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Clinical context", "السياق السريري")}</div>
              <div className="mt-1 text-sm text-slate-700">{caseData.diagnosis}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tr("Intake Completion", "اكتمال الاستقبال")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Case record established", "تم إنشاء سجل الحالة")}</span>
              <Badge variant="success">{tr("Complete", "مكتمل")}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Owner assigned", "تم تعيين المسؤول")}</span>
              <Badge variant={caseData.physician !== "Not assigned" ? "success" : "warning"}>
                {caseData.physician !== "Not assigned" ? tr("Assigned", "معين") : tr("Required Element Not Satisfied", "العنصر المطلوب غير مستوفى")}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Clinical summary present", "الملخص السريري متوفر")}</span>
              <Badge variant={caseData.diagnosis !== "Discharge refusal workflow" ? "success" : "warning"}>
                {caseData.diagnosis !== "Discharge refusal workflow" ? tr("Recorded", "موثق") : tr("Needs update", "يحتاج تحديث")}
              </Badge>
            </div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-slate-700">
              {tr(
                "This step now owns the old Case Summary and Assignments / SLA sections.",
                "تتضمن هذه الخطوة الآن أقسام ملخص الحالة والتكليفات/اتفاقية مستوى الخدمة السابقة.",
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderMedicalDecisionStep() {
    return (
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tr("Record Medical Explanation", "تسجيل الشرح الطبي")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <Select
                aria-label={tr("Presentation language", "لغة الشرح")}
                value={presentation.language}
                onChange={(event) =>
                  setPresentation((previous) => ({
                    ...previous,
                    language: event.target.value,
                  }))
                }
              >
                <option value="">{tr("Select language", "اختر اللغة")}</option>
                <option value="English">{tr("English", "الإنجليزية")}</option>
                <option value="Arabic">{tr("Arabic", "العربية")}</option>
                <option value="Bilingual">{tr("Bilingual", "ثنائي اللغة")}</option>
              </Select>
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={presentation.interpreter_used}
                  onChange={(event) =>
                    setPresentation((previous) => ({
                      ...previous,
                      interpreter_used: event.target.checked,
                    }))
                  }
                />
                {tr("Interpreter used during explanation", "تم استخدام مترجم أثناء الشرح")}
              </label>
              <Input
                placeholder={tr("Presented to", "قُدم الشرح إلى")}
                value={presentation.presented_to}
                onChange={(event) =>
                  setPresentation((previous) => ({
                    ...previous,
                    presented_to: event.target.value,
                  }))
                }
              />
              <Input
                placeholder={tr("Presented by", "قُدم الشرح بواسطة")}
                value={presentation.presented_by}
                onChange={(event) =>
                  setPresentation((previous) => ({
                    ...previous,
                    presented_by: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">{tr("Current clinical owner", "المسؤول السريري الحالي")}</div>
                <div className="mt-1 text-sm text-slate-600">{caseData.physician}</div>
                <div className="mt-4 text-sm font-semibold text-slate-900">{tr("Diagnosis / rationale", "التشخيص / المبرر")}</div>
                <div className="mt-1 text-sm text-slate-600">{caseData.diagnosis}</div>
              </div>
              <div className="space-y-2">
                <Button
                  disabled={loading || !canMedicalActions}
                  title={!canMedicalActions ? deniedMessage : undefined}
                  onClick={() => {
                    trackPrimaryAction("record_medical_decision", { role: role ?? undefined });
                    void onRecordPresentation();
                  }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {tr("Saving...", "جار الحفظ...")}
                    </span>
                  ) : (
                    tr("Record Medical Decision", "تسجيل القرار الطبي")
                  )}
                </Button>
                {!canMedicalActions ? (
                  <div className="text-xs text-amber-700">{deniedMessage}</div>
                ) : null}
                <Badge variant={presentation.language ? "success" : "warning"}>
                  {presentation.language
                    ? tr("Medical explanation recorded", "تم تسجيل الشرح الطبي")
                    : tr("Medical explanation pending", "تسجيل الشرح الطبي قيد الانتظار")}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tr("What Moved Here", "ما الذي انتقل إلى هنا")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 px-3 py-2">{tr("Old section: Presentation / Proof of Notice", "القسم السابق: العرض / إثبات الإبلاغ")}</div>
            <div className="rounded-xl border border-slate-200 px-3 py-2">{tr("Old read-only case physician and diagnosis fields", "حقول الطبيب والتشخيص القديمة للقراءة فقط")}</div>
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">{tr("Only the doctor-facing explanation task is shown here to reduce noise.", "يظهر هنا فقط إجراء الشرح الخاص بالطبيب لتقليل التشتيت.")}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderPatientDecisionStep() {
    return (
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tr("Patient Response & Acknowledgment", "استجابة المريض والإقرار")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{tr("Patient Decision", "قرار المريض")}</div>
                  <div className="text-xs text-slate-500">{tr("Record the response to the proposed treatment path.", "سجل استجابة المريض لخطة العلاج المقترحة.")}</div>
                </div>
                <RadioGroup
                  value={signature.patient_decision}
                  onValueChange={(value) => {
                    const decision = value as PatientDecision;
                    setSignature((previous) => ({
                      ...previous,
                      patient_decision: decision,
                      outcome: decision === "accepted" ? "signed" : "refused_to_sign",
                    }));
                  }}
                >
                  <RadioGroupLabel>
                    <RadioGroupItem value="accepted" /> {tr("Accepted", "قبول")}
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="refused" /> {tr("Refused", "رفض")}
                  </RadioGroupLabel>
                </RadioGroup>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{tr("Attestation", "الإقرار")}</div>
                  <div className="text-xs text-slate-500">{tr("Keep outcome aligned with the patient decision.", "احرص على توافق النتيجة مع قرار المريض.")}</div>
                </div>
                <RadioGroup
                  value={signature.outcome}
                  onValueChange={(value) =>
                    setSignature((previous) => ({
                      ...previous,
                      outcome: value as SignatureOutcome,
                      patient_decision: value === "signed" ? "accepted" : "refused",
                    }))
                  }
                >
                  <RadioGroupLabel>
                    <RadioGroupItem value="signed" /> {tr("Signed", "تم التوقيع")}
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="refused_to_sign" /> {tr("Refused to sign", "رفض التوقيع")}
                  </RadioGroupLabel>
                  <RadioGroupLabel>
                    <RadioGroupItem value="unable_to_sign" /> {tr("Unable to sign", "غير قادر على التوقيع")}
                  </RadioGroupLabel>
                </RadioGroup>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">{tr("Signer", "الموقّع")}</div>
                <Input
                  placeholder={tr("Signer name", "اسم الموقّع")}
                  value={signature.signer_name}
                  onChange={(event) =>
                    setSignature((previous) => ({
                      ...previous,
                      signer_name: event.target.value,
                    }))
                  }
                />
                {signature.outcome !== "signed" ? (
                  <Input
                    placeholder={tr("Reason", "السبب")}
                    value={signature.reason}
                    onChange={(event) =>
                      setSignature((previous) => ({
                        ...previous,
                        reason: event.target.value,
                      }))
                    }
                  />
                ) : null}
                <Button
                  disabled={loading || !canMedicalActions || !signature.patient_decision || !witnessMinimumMet}
                  title={!canMedicalActions ? deniedMessage : !witnessMinimumMet ? witnessGateMessage : undefined}
                  onClick={() => {
                    trackPrimaryAction("record_patient_decision", { role: role ?? undefined });
                    void onRecordSignature();
                  }}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {tr("Saving...", "جار الحفظ...")}
                    </span>
                  ) : (
                    tr("Record Patient Decision", "تسجيل قرار المريض")
                  )}
                </Button>
              </div>

              <div className={`space-y-3 rounded-2xl border p-4 ${witnessMinimumMet ? "border-slate-200" : "border-red-300 bg-red-50/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{tr("Witness", "الشاهد")}</div>
                  <Badge variant={witnessMinimumMet ? "success" : "warning"}>
                    {tr(`${witnessRecords.length}/2 witnesses`, `${witnessRecords.length}/2 شاهد`) }
                  </Badge>
                </div>
                <Input
                  placeholder={tr("Witness full name", "الاسم الكامل للشاهد")}
                  value={witness.full_name}
                  onChange={(event) =>
                    setWitness((previous) => ({
                      ...previous,
                      full_name: event.target.value,
                    }))
                  }
                />
                <Input
                  placeholder={tr("Witness role", "صفة الشاهد")}
                  value={witness.role}
                  onChange={(event) =>
                    setWitness((previous) => ({
                      ...previous,
                      role: event.target.value,
                    }))
                  }
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    aria-label={tr("Witness role category", "تصنيف دور الشاهد")}
                    value={witness.role_category}
                    onChange={(event) =>
                      setWitness((previous) => ({
                        ...previous,
                        role_category: event.target.value === "clinical" ? "clinical" : "non_clinical",
                      }))
                    }
                  >
                    <option value="clinical">{tr("Clinical witness", "شاهد سريري")}</option>
                    <option value="non_clinical">{tr("Non-clinical witness", "شاهد غير سريري")}</option>
                  </Select>
                  <Input
                    placeholder={tr("National ID / Iqama", "رقم الهوية / الإقامة")}
                    value={witness.id_number}
                    onChange={(event) =>
                      setWitness((previous) => ({
                        ...previous,
                        id_number: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    placeholder={tr("Mobile number", "رقم الجوال")}
                    value={witness.mobile_number}
                    onChange={(event) =>
                      setWitness((previous) => ({
                        ...previous,
                        mobile_number: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder={tr("Signature evidence hash", "بصمة دليل التوقيع")}
                    value={witness.signature_hash}
                    onChange={(event) =>
                      setWitness((previous) => ({
                        ...previous,
                        signature_hash: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Select
                    aria-label={tr("Witness verification method", "طريقة تحقق الشاهد")}
                    value={witness.signature_type}
                    onChange={(event) =>
                      setWitness((previous) => ({
                        ...previous,
                        signature_type:
                          event.target.value === "OTP"
                            ? "OTP"
                            : event.target.value === "MANUAL_CONFIRMATION"
                              ? "MANUAL_CONFIRMATION"
                              : "DIGITAL_SIGNATURE",
                      }))
                    }
                  >
                    <option value="DIGITAL_SIGNATURE">{tr("Digital signature", "توقيع رقمي")}</option>
                    <option value="OTP">{tr("OTP", "رمز تحقق")}</option>
                    <option value="MANUAL_CONFIRMATION">{tr("Manual confirmation", "تأكيد يدوي")}</option>
                  </Select>
                  {witness.signature_type === "OTP" ? (
                    <Input
                      placeholder={tr("OTP reference", "مرجع رمز التحقق")}
                      value={witness.otp_reference}
                      onChange={(event) =>
                        setWitness((previous) => ({
                          ...previous,
                          otp_reference: event.target.value,
                        }))
                      }
                    />
                  ) : null}
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={witness.attestation_confirmed}
                    onChange={(event) =>
                      setWitness((previous) => ({
                        ...previous,
                        attestation_confirmed: event.target.checked,
                      }))
                    }
                  />
                  {tr("Witness attestation confirmed", "تم تأكيد إقرار الشاهد")}
                </label>
                {!witnessMinimumMet ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {witnessGateMessage}
                  </div>
                ) : null}
                <Button
                  variant="outline"
                  disabled={loading || !canWitnessAction}
                  title={!canWitnessAction ? deniedMessage : undefined}
                  onClick={() => {
                    trackPrimaryAction("record_witness", { role: role ?? undefined });
                    void onRecordWitness();
                  }}
                >
                  {loading ? tr("Saving...", "جار الحفظ...") : tr("Record Witness", "تسجيل الشاهد")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tr("Consent Evidence", "أدلة الموافقة")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              aria-label={tr("Consent method", "طريقة الموافقة")}
              value={consentForm.consentMethod}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  consentMethod: event.target.value,
                }))
              }
            >
              <option value="ELECTRONIC_SIGNATURE">{tr("Electronic signature", "توقيع إلكتروني")}</option>
              <option value="OTP">{tr("One-time password", "رمز تحقق لمرة واحدة")}</option>
              <option value="WITNESS_ACKNOWLEDGMENT">{tr("Witness acknowledgment", "إقرار الشاهد")}</option>
              <option value="WRITTEN">{tr("Written", "كتابي")}</option>
            </Select>
            <Input
              placeholder={tr("Processing purpose", "غرض المعالجة")}
              value={consentForm.processingPurpose}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  processingPurpose: event.target.value,
                }))
              }
            />
            <Input
              placeholder={tr("Lawful basis", "الأساس النظامي")}
              value={consentForm.lawfulBasis}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  lawfulBasis: event.target.value,
                }))
              }
            />
            <Input
              placeholder={tr("Witness / confirmer", "الشاهد / المقر")}
              value={consentForm.witnessName}
              onChange={(event) =>
                setConsentForm((previous) => ({
                  ...previous,
                  witnessName: event.target.value,
                }))
              }
            />
            {consentForm.consentMethod === "OTP" ? (
              <Input
                placeholder={tr("OTP reference", "مرجع رمز التحقق")}
                value={consentForm.otpReference}
                onChange={(event) =>
                  setConsentForm((previous) => ({
                    ...previous,
                    otpReference: event.target.value,
                  }))
                }
              />
            ) : null}
            <Button
              variant="outline"
              disabled={loading || !witnessMinimumMet}
              title={!witnessMinimumMet ? witnessGateMessage : undefined}
              onClick={() => {
                trackPrimaryAction("record_consent_evidence", { role: role ?? undefined });
                void onRecordConsent();
              }}
            >
              {loading ? tr("Saving...", "جار الحفظ...") : tr("Record Consent Evidence", "تسجيل أدلة الموافقة")}
            </Button>
            <Badge variant={consentRecords.length > 0 ? "success" : "warning"}>
              {consentRecords.length > 0
                ? tr(`${consentRecords.length} consent record(s)`, `${consentRecords.length} سجل موافقة`)
                : tr("Consent evidence pending", "أدلة الموافقة قيد الانتظار")}
            </Badge>
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderLegalReadinessStep() {
    return (
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card className="border-[var(--border-soft)]">
          <CardHeader>
            <CardTitle>{tr("Executive Legal Eligibility Summary", "الملخص التنفيذي للأهلية القانونية")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Badge variant={canProceedLegally ? "success" : "warning"}>
                {canProceedLegally ? tr("Legally Eligible to Proceed", "مستوفٍ قانونيًا للمضي") : tr("Not Legally Eligible to Proceed", "غير مستوفٍ قانونيًا للمضي")}
              </Badge>
              <Badge variant={legalRiskBadge}>{tr("Risk", "المخاطر")}: {legalRiskLevel}</Badge>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-slate-50/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-slate-600">{tr("Legally eligible to proceed", "مستوفٍ قانونيًا للمضي")}</span>
                <Badge variant={readiness?.ready_for_legal ? "success" : "warning"}>
                  {readiness?.ready_for_legal ? tr("Yes", "نعم") : tr("No", "لا")}
                </Badge>
              </div>
              <ProgressRing
                value={
                  legalReadinessReport?.readyForLegal
                    ? 100
                    : Math.round(
                        ((legalReadinessReport?.checklist?.filter((item) => item.satisfied).length || 0) /
                          Math.max(legalReadinessReport?.checklist?.length || 1, 1)) *
                          100,
                      )
                }
                label={tr("Legal completion", "اكتمال الجاهزية القانونية")}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] px-3 py-2">
              <span className="text-slate-600">{tr("Legally eligible to proceed", "مستوفٍ قانونيًا للمضي")}</span>
              <Badge variant={readiness?.ready_for_legal ? "success" : "warning"}>
                {readiness?.ready_for_legal ? tr("Yes", "نعم") : tr("No", "لا")}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border-soft)] px-3 py-2">
              <span className="text-slate-600">{tr("Patient decision", "قرار المريض")}</span>
              <Badge variant={legalDecisionIndicator.badgeVariant}>{legalDecisionIndicator.label}</Badge>
            </div>
            <div className="rounded-xl border border-[var(--border-soft)] bg-slate-50 px-3 py-2 text-slate-700">
              {legalDecisionIndicator.followUpText}
            </div>
            {readiness?.reason ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                {readiness.reason}
              </div>
            ) : null}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-slate-700">
              {tr(
                "This step now owns the old Legal Readiness card and Legal Readiness Checklist.",
                "تتضمن هذه الخطوة الآن بطاقة الجاهزية القانونية وقائمة التحقق القانونية السابقة.",
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--border-soft)]">
          <CardHeader>
            <CardTitle>{tr("Checklist", "قائمة التحقق")}</CardTitle>
          </CardHeader>
          <CardContent>
            {legalReadinessReport ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={legalReadinessReport.readyForLegal ? "success" : "warning"}>
                    {legalReadinessReport.status}
                  </Badge>
                  <span className="text-sm text-slate-600">
                    {tr("Consent", "الموافقة")}: {legalReadinessReport.evidence?.consentCount ?? 0} • {tr("Documents", "المستندات")}: {legalReadinessReport.evidence?.documentCount ?? 0}
                  </span>
                </div>
                {hasLegalDetailAccess ? (
                  <div className="space-y-2">
                    {legalReadinessReport.checklist.map((item) => (
                      <div key={item.key} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-soft)] px-3 py-3 text-sm">
                        <div className="flex items-start gap-2">
                          {item.satisfied ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> : <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />}
                          <div>
                            <div className="font-medium text-slate-800">{item.label}</div>
                            <div className="text-slate-500">{item.reason}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={item.satisfied ? "success" : item.required ? "warning" : "pending"}>
                            {item.satisfied ? tr("Compliant", "متوافق") : item.required ? tr("Legally Restricted", "مقيد قانونيًا") : tr("Optional", "اختياري")}
                          </Badge>
                          {!item.satisfied ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedStepKey(mapLegalAction(item.key, tr).stepKey)}
                            >
                              {tr("Review", "مراجعة")}
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                    {tr(
                      "Checklist details are available to Legal/Admin. Clinical users see summarized readiness only.",
                      "تفاصيل قائمة التحقق متاحة للقانوني/الإداري. يظهر للمستخدم السريري ملخص الجاهزية فقط.",
                    )}
                  </div>
                )}
              </div>
            ) : (
              renderMissingState(tr("No readiness checklist has been evaluated yet.", "لم يتم تقييم قائمة تحقق الجاهزية بعد."))
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderDocumentsStep() {
    return (
      <div className="space-y-4">
        <LegalPackagePanel caseId={caseId} />

        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <Card>
          <CardHeader>
            <CardTitle>{tr("Generate Legal Documents", "إنشاء المستندات القانونية")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                aria-label={tr("PDF language", "لغة ملف PDF")}
                className="w-auto min-w-[10rem]"
                value={pdfLanguage}
                onChange={(event) => setPdfLanguage(event.target.value === "ar" ? "ar" : "en")}
              >
                <option value="en">{tr("English", "الإنجليزية")}</option>
                <option value="ar">{tr("Arabic", "العربية")}</option>
              </Select>
              <Button
                variant="outline"
                disabled={pdfBusy || !canGeneratePdf || !witnessMinimumMet}
                title={!canGeneratePdf ? deniedMessage : !witnessMinimumMet ? witnessGateMessage : undefined}
                onClick={() => {
                  trackPrimaryAction("generate_draft_pdf", { role: role ?? undefined });
                  void onGenerateCasePdf("draft", false);
                }}
              >
                {pdfBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {pdfBusy ? tr("Generating...", "جار الإنشاء...") : tr("Generate Draft PDF", "إنشاء مسودة PDF")}
              </Button>
              <Button
                disabled={pdfBusy || !canGeneratePdf || !canLegalApprove || !legalReadyForFinalization || !witnessMinimumMet}
                title={
                  !canGeneratePdf || !canLegalApprove
                    ? deniedMessage
                    : !witnessMinimumMet
                      ? witnessGateMessage
                    : !legalReadyForFinalization
                      ? tr(
                          "Final PDF cannot be generated until all legal readiness items are complete.",
                          "لا يمكن إنشاء PDF النهائي قبل استكمال جميع عناصر الجاهزية القانونية.",
                        )
                      : undefined
                }
                onClick={() => {
                  trackPrimaryAction("generate_final_pdf", { role: role ?? undefined });
                  void onGenerateCasePdf("final", false);
                }}
              >
                {pdfBusy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {pdfBusy ? tr("Generating...", "جار الإنشاء...") : tr("Generate Final PDF", "إنشاء PDF نهائي")}
              </Button>
              <Button
                variant="outline"
                disabled={pdfBusy || !canGeneratePdf}
                title={!canGeneratePdf ? deniedMessage : undefined}
                onClick={() => {
                  trackPrimaryAction("regenerate_pdf", { role: role ?? undefined });
                  void onGenerateCasePdf("draft", true);
                }}
              >
                <RefreshCw className="h-4 w-4" />
                {tr("Regenerate", "إعادة الإنشاء")}
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={loading || !canGenerateBundle || !witnessMinimumMet}
                title={!canGenerateBundle ? deniedMessage : !witnessMinimumMet ? witnessGateMessage : undefined}
                onClick={() => {
                  trackPrimaryAction("generate_legal_package", { role: role ?? undefined });
                  void onGenerateLegalPackage();
                }}
              >
                <Package className="h-4 w-4" />
                {loading ? tr("Saving...", "جار الحفظ...") : tr("Generate Legal Package", "إنشاء الحزمة القانونية")}
              </Button>
              <Button
                variant="outline"
                disabled={secureSigningBusy}
                onClick={() => {
                  void sendSecureSigning();
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                {tr("Send Secure Signing Link", "إرسال رابط التوقيع الآمن")}
              </Button>
              {legalPackage?.download_url && canDownloadFinalDocs ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(legalPackage.download_url, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Download className="h-4 w-4" />
                  {tr("Download Package", "تنزيل الحزمة")}
                </Button>
              ) : null}
            </div>

            {secureSigningWorkflow ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <SecureSigningStatusBadges status={secureSigningWorkflow.status} />
                <div className="text-xs text-slate-600 break-all">{secureSigningWorkflow.signingUrl}</div>
              </div>
            ) : null}

            {pdfLatest ? (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={pdfLatest.status === "final" ? "success" : pdfLatest.status === "failed" ? "warning" : "outline"}>
                    v{pdfLatest.version} • {translateCaseStatus(pdfLatest.status, isArabic)}
                  </Badge>
                  <Badge variant="outline">{translatePdfLanguage(pdfLatest.language, isArabic)}</Badge>
                  <Badge variant="outline">{Math.round((pdfLatest.fileSize || 0) / 1024)} {tr("KB", "ك.ب")}</Badge>
                </div>
                <div className="text-slate-600">{tr("Generated", "تم الإنشاء")}: {new Date(pdfLatest.generatedAt).toLocaleString()}</div>
                <div className="text-slate-600">{tr("File", "الملف")}: {pdfLatest.fileName}</div>
                <div className="text-slate-500">SHA-256: {pdfLatest.sha256Hash?.slice(0, 24) || tr("N/A", "غير متوفر")}</div>
              </div>
            ) : (
              renderMissingState(tr("No legal case PDF has been generated yet.", "لم يتم إنشاء PDF قانوني للحالة بعد."))
            )}
          </CardContent>
        </Card>

          <Card>
          <CardHeader>
            <CardTitle>{tr("Readiness for Final Documents", "جاهزية المستندات النهائية")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-slate-700">{tr("Finalization readiness", "جاهزية الإنهاء")}</span>
              <Badge variant={legalReadyForFinalization ? "success" : "warning"}>
                {legalReadyForFinalization ? tr("Legally Eligible to Proceed", "مستوفٍ قانونيًا للمضي") : tr("Legally Restricted", "مقيد قانونيًا")}
              </Badge>
            </div>
            {!legalReadyForFinalization ? (
              <ul className="space-y-1 text-sm text-amber-700">
                {missingLegalItems.map((item) => (
                  <li key={item.key}>• {item.missingReason}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-600">{tr("All legal readiness requirements are available.", "جميع متطلبات الجاهزية القانونية متوفرة.")}</div>
            )}
            <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm text-slate-700">
              {tr(
                "This step now owns the old Legal Package, Legal Case PDF Reports, and document export actions.",
                "تتضمن هذه الخطوة الآن الحزمة القانونية وتقارير PDF القانونية وإجراءات تصدير المستندات السابقة.",
              )}
            </div>
          </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  function renderClosureStep() {
    return (
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{tr("Closure Readiness", "جاهزية الإغلاق")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Authorized final PDF", "PDF النهائي المعتمد")}</span>
              <Badge variant={pdfLatest?.status === "final" ? "success" : "warning"}>
                {pdfLatest?.status === "final" ? tr("Available", "متوفر") : tr("Pending", "قيد الانتظار")}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Legal package", "الحزمة القانونية")}</span>
              <Badge variant={legalPackage ? "success" : "warning"}>{legalPackage ? tr("Generated", "تم الإنشاء") : tr("Pending", "قيد الانتظار")}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Case status", "حالة الحالة")}</span>
              <Badge variant={caseData.status.toUpperCase() === "CLOSED" ? "success" : "warning"}>{translateCaseStatus(caseData.status, isArabic)}</Badge>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
              {tr(
                "No backend closure contract is changed here. This step reorganizes the final review and sign-off presentation only.",
                "لم يتم تعديل عقد الإغلاق في الخلفية هنا. تعيد هذه الخطوة تنظيم العرض النهائي للمراجعة والاعتماد فقط.",
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tr("Final Outputs", "المخرجات النهائية")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pdfLatest ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(`/api/cases/${caseId}/pdf/${pdfLatest.version}/preview`, "_blank", "noopener,noreferrer");
                  }}
                >
                  <Eye className="h-4 w-4" />
                  {tr("Preview Latest", "معاينة الأحدث")}
                </Button>
                {canDownloadFinalDocs ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(`/api/cases/${caseId}/pdf/${pdfLatest.version}/download`, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Download className="h-4 w-4" />
                    {tr("Download Latest", "تنزيل الأحدث")}
                  </Button>
                ) : null}
              </div>
            ) : null}
            {legalPackage?.download_url && canDownloadFinalDocs ? (
              <Button
                variant="outline"
                onClick={() => {
                  window.open(legalPackage.download_url, "_blank", "noopener,noreferrer");
                }}
              >
                <Package className="h-4 w-4" />
                {tr("Download Bundle", "تنزيل الحزمة")}
              </Button>
            ) : null}
            {selectedStep.missingItems.length > 0 ? (
              <ul className="space-y-1 text-sm text-amber-700">
                {selectedStep.missingItems.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {tr(
                  "Closure prerequisites are satisfied. Authorized signatory may complete the final workflow action.",
                  "متطلبات الإغلاق مستوفاة. يمكن للمفوّض المعتمد إكمال الإجراء النهائي لسير العمل.",
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  function renderActiveStep(step: CaseWorkspaceStep) {
    switch (step.key) {
      case "case_creation":
        return renderCaseCreationStep();
      case "medical_decision":
        return renderMedicalDecisionStep();
      case "patient_decision":
        return renderPatientDecisionStep();
      case "legal_readiness":
        return renderLegalReadinessStep();
      case "legal_documents_bundle":
        return renderDocumentsStep();
      case "closure":
        return (
          <div className="space-y-4">
            {renderLegalReadinessStep()}
            {renderDocumentsStep()}
            {renderClosureStep()}
          </div>
        );
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6 overflow-x-hidden pb-24 xl:pb-0">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <div className="font-semibold">{tr("Action completed", "تم تنفيذ الإجراء")}</div>
          <div className="mt-1">{successMessage}</div>
        </div>
      ) : null}

      {!witnessMinimumMet ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="font-semibold">{tr("Not Legally Eligible to Proceed: witness legal requirements are not met", "غير مستوفٍ قانونيًا للمضي: يجب استيفاء متطلبات الشهود النظامية")}</div>
          <div className="mt-1">{witnessGateMessage}</div>
        </div>
      ) : null}

      {viewOnlyMode ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-700">
          <div className="font-semibold">{tr("View-only workspace", "مساحة عرض فقط")}</div>
          <div className="mt-1 text-blue-600">
            {tr(
              "You can inspect case progress and evidence, but action steps remain assigned to workflow owners.",
              "يمكنك استعراض تقدم الحالة والأدلة، لكن خطوات التنفيذ تبقى مخصصة لمالكي سير العمل.",
            )}
          </div>
        </div>
      ) : null}

      <Card className="border-[var(--border-soft)] bg-[linear-gradient(135deg,#ffffff_0%,#f2f8ff_58%,#f8fbff_100%)] shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1">IMC</span>
                <span className="rounded-full border border-[#d8c08f] bg-[#fbf6ea] px-2.5 py-1 text-[#866519]">Legal Affairs Department</span>
              </div>
              <CardTitle>{tr("Enterprise Legal Readiness Command Center", "مركز قيادة الجاهزية القانونية المؤسسي")}</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={handleExportLegalReport}>
                <Download className="h-4 w-4" />
                {tr("Export Legal Memo", "تصدير المذكرة القانونية")}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrintAuditTrail}>
                {tr("Print Audit Timeline", "طباعة الخط الزمني للتدقيق")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">{tr("Readiness", "الجاهزية")}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{legalCompletionPercent}%</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">{tr("Blockers", "العوائق")}</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">{blockerCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">{tr("Legal Risk", "المخاطر القانونية")}</div>
              <div className="mt-1"><Badge variant={legalRiskBadge}>{legalRiskLevel}</Badge></div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="text-xs text-slate-500">{tr("Decision", "القرار")}</div>
              <div className="mt-1">
                <Badge variant={canProceedLegally ? "success" : "warning"}>
                  {canProceedLegally ? tr("Legally Eligible to Proceed", "مستوفٍ قانونيًا للمضي") : tr("Not Legally Eligible to Proceed", "غير مستوفٍ قانونيًا للمضي")}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 px-3 py-3">
              <div className="text-sm font-semibold text-slate-900">{tr("Recommended Legal Direction", "التوجيه القانوني الموصى به")}</div>
              <div className="mt-1 text-sm text-slate-700">{prioritizedAction.title}</div>
              <div className="mt-1 text-xs text-slate-500">{prioritizedAction.detail}</div>
              <Button className="mt-2" size="sm" onClick={() => setSelectedStepKey(prioritizedAction.stepKey)}>
                {tr("Open Required Step", "فتح الخطوة المطلوبة")}
              </Button>
            </div>

            <div className="rounded-xl border border-slate-200 px-3 py-3">
              <div className="text-sm font-semibold text-slate-900">{tr("Compliance and Documentary Remediation", "إجراءات الامتثال والمعالجة المستندية")}</div>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {complianceSuggestions.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
                {complianceSuggestions.length === 0 ? <li>• {tr("No material compliance deficiencies identified", "لم يتم رصد أوجه نقص جوهرية في الامتثال")}</li> : null}
              </ul>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{tr("Required supporting instruments", "المحررات الداعمة المطلوبة")}</div>
              <ul className="mt-1 space-y-1 text-sm text-slate-700">
                {requiredDocumentSuggestions.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
                {requiredDocumentSuggestions.length === 0 ? <li>• {tr("The principal supporting instruments appear to be available", "يبدو أن المحررات الداعمة الرئيسية متوفرة")}</li> : null}
              </ul>
            </div>
          </div>

          {hasLegalDetailAccess ? (
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="text-sm font-semibold text-slate-900">{tr("Legal Reasoning", "التسبيب القانوني")}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {canProceedLegally
                    ? tr("No presently identified legal deficiency prevents the record from proceeding to finalization.", "لا يوجد في الوقت الراهن نقص قانوني يمنع إحالة الملف إلى الاعتماد النهائي.")
                    : tr("Finalization is presently withheld because one or more adverse legal findings remain unresolved.", "الاعتماد النهائي محجوب حاليًا لوجود نتيجة قانونية سلبية واحدة أو أكثر لم تتم معالجتها.")}
                </div>
                <div className="mt-3 space-y-2">
                  {triggeredLegalRules.length > 0 ? (
                    triggeredLegalRules.slice(0, 5).map((rule) => (
                      <div key={rule.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <div className="font-semibold">{rule.id} • {translateRiskCategory(rule.category)}</div>
                        <div className="text-xs">{rule.reason}</div>
                        <Button
                          className="mt-2"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedStepKey(rule.stepKey)}
                        >
                          {tr("Open Related Step", "فتح الخطوة المرتبطة")}
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      {tr("No adverse legal findings are presently triggered.", "لا توجد نتائج قانونية سلبية مفعلة في الوقت الراهن.")}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <div className="text-sm font-semibold text-slate-900">{tr("Risk Breakdown by Category", "تفصيل المخاطر حسب الفئة")}</div>
                <div className="mt-2 space-y-2 text-sm">
                  {riskBreakdown.map((item) => (
                    <div key={item.category} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <span className="text-slate-700">{translateRiskCategory(item.category)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{item.failed}/{item.total}</span>
                        <Badge variant={item.badgeVariant}>{item.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700">
              {tr(
                "Detailed legal findings are hidden for this role. Legal readiness and document controls still run in the background.",
                "تم إخفاء النتائج القانونية التفصيلية لهذا الدور. تستمر ضوابط الجاهزية القانونية والمستندات في العمل بالخلفية.",
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--border-soft)] bg-[linear-gradient(135deg,#fdfefe_0%,#f3f7fc_58%,#f7fafc_100%)]">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{workflowFlow.roleSummaryLabel}</Badge>
                <Badge variant={selectedStep.status === "completed" ? "success" : "warning"}>
                  {stepStatusLabel(selectedStep, isArabic)} {tr("stage", "المرحلة")}
                </Badge>
              </div>
              <CardTitle className="text-2xl">{tr("Case Execution Workflow", "سير تنفيذ الحالة")}</CardTitle>
              <div className="text-sm text-slate-600">
                {caseData.patient} • {caseData.mrn} • {caseData.status}
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm">
                <span className="font-semibold text-slate-900">{tr("Recommended Legal Action", "الإجراء القانوني الموصى به")}</span>
                <span className="text-slate-700">{prioritizedAction.title}</span>
              </div>
            </div>

            <div className="min-w-[18rem] rounded-2xl border border-[var(--border-soft)] bg-white/90 p-4 shadow-sm backdrop-blur">
              <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
                <span>{tr("Workflow progress", "تقدم سير العمل")}</span>
                <span>{completedSteps}/{workflowFlow.steps.length}</span>
              </div>
              <ProgressRing value={progressValue} label={tr("Completion ratio", "نسبة الإكمال")} />
              <Progress value={progressValue} className="mb-3" />
              <div className="text-xs text-slate-500">
                {tr(
                  "One active step is shown at a time. Technical detail stays in supporting tabs below.",
                  "يتم عرض خطوة نشطة واحدة في كل مرة. تبقى التفاصيل الفنية في تبويبات الدعم أدناه.",
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Current Stage", "المرحلة الحالية")}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStep.label}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Current Owner", "المالك الحالي")}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStep.ownerLabel}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Recommended Legal Action", "الإجراء القانوني الموصى به")}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStep.nextAction}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Required Elements Not Satisfied", "العناصر المطلوبة غير المستوفاة")}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {selectedStep.missingItems.length === 0 ? tr("None", "لا يوجد") : tr(`${selectedStep.missingItems.length} open item(s)`, `${selectedStep.missingItems.length} عنصر مفتوح`) }
              </div>
            </div>
          </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Guided step navigation", "التنقل الإرشادي للخطوات")}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={!previousStep}
                onClick={() => {
                  if (previousStep) {
                    setSelectedStepKey(previousStep.key);
                  }
                }}
              >
                {tr("Previous Step", "الخطوة السابقة")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!nextStep || !witnessMinimumMet}
                title={!witnessMinimumMet ? witnessGateMessage : undefined}
                onClick={() => {
                  if (nextStep) {
                    setSelectedStepKey(nextStep.key);
                  }
                }}
              >
                {tr("Next Step", "الخطوة التالية")}
              </Button>
              <span className="text-sm text-slate-600">
                {tr(`Viewing step ${selectedStepIndex + 1} of ${workflowFlow.steps.length}`, `عرض الخطوة ${selectedStepIndex + 1} من ${workflowFlow.steps.length}`)}
              </span>
            </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(260px,320px)_minmax(0,1fr)_minmax(260px,340px)]">
        <div className="min-w-0 space-y-4">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{tr("Current + Next", "الحالية + التالية")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {focusedStepList.map((step, index) => {
                const Icon = stepIcon(step.key);
                const isSelected = step.key === selectedStep.key;
                const isExpanded = expandedStepKey ? expandedStepKey === step.key : isSelected;

                return (
                  <div
                    key={step.key}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-blue-300 bg-blue-50/80 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => {
                        setSelectedStepKey(step.key);
                        setExpandedStepKey((prev) => (prev === step.key ? null : step.key));
                      }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                              {index === 0 ? tr("Current Step", "الخطوة الحالية") : tr("Next Step", "الخطوة التالية")}
                            </div>
                            <div className="font-semibold text-slate-900">{step.label}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={stepBadgeVariant(step)}>{stepStatusLabel(step, isArabic)}</Badge>
                          <ChevronRight className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? "rotate-90" : "rotate-0"}`} />
                        </div>
                      </div>
                    </button>

                    {isExpanded ? (
                      <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
                        <div className="text-xs text-slate-500">{tr("Owner", "المالك")}: {step.ownerLabel}</div>
                        <div className="text-xs text-slate-600">{tr("Next", "التالي")}: {step.nextAction}</div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <details className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700">
                  {tr("View full workflow map", "عرض خريطة سير العمل كاملة")}
                </summary>
                <div className="mt-2 space-y-1">
                  {workflowFlow.steps.map((step, index) => (
                    <button
                      key={`full-${step.key}`}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-2 py-1 text-left text-xs text-slate-600 hover:border-slate-200 hover:bg-white"
                      onClick={() => setSelectedStepKey(step.key)}
                    >
                      <span>{tr("Step", "الخطوة")} {index + 1}: {step.label}</span>
                      <Badge variant={stepBadgeVariant(step)}>{stepStatusLabel(step, isArabic)}</Badge>
                    </button>
                  ))}
                </div>
              </details>
            </CardContent>
          </Card>

          <details className="h-fit rounded-2xl border border-slate-200 bg-white xl:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-900">
              {tr("Side Summary", "ملخص جانبي")}
            </summary>
            <div className="space-y-3 border-t border-slate-200 px-4 py-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{tr("Current stage", "المرحلة الحالية")}</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedStep.label}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{tr("Owner", "المالك")}</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedStep.ownerLabel}</div>
              </div>
            </div>
          </details>

          <Card className="hidden h-fit xl:block">
            <CardHeader>
              <CardTitle>{tr("Side Summary", "ملخص جانبي")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{tr("Current stage", "المرحلة الحالية")}</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedStep.label}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{tr("Owner", "المالك")}</div>
                <div className="mt-1 font-semibold text-slate-900">{selectedStep.ownerLabel}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-xs text-slate-500">{tr("Open items", "العناصر المفتوحة")}</div>
                <div className="mt-1 font-semibold text-slate-900">
                  {selectedStep.missingItems.length === 0
                    ? tr("None", "لا يوجد")
                    : tr(`${selectedStep.missingItems.length} item(s)`, `${selectedStep.missingItems.length} عنصر`) }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant={stepBadgeVariant(selectedStep)}>{stepStatusLabel(selectedStep, isArabic)}</Badge>
                    <Badge variant="outline">{selectedStep.shortLabel}</Badge>
                  </div>
                  <CardTitle>{selectedStep.label}</CardTitle>
                  <div className="mt-1 text-sm text-slate-600">{selectedStep.description}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{tr("Recommended visibility", "الرؤية الموصى بها")}</div>
                  <div className="mt-1">{selectedStep.recommendedVisibleRoles.join(" • ")}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{tr("Recommended Legal Action", "الإجراء القانوني الموصى به")}</div>
                  <div className="mt-1 font-medium">{prioritizedAction.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{prioritizedAction.detail}</div>
                  <Button
                    className="mt-2"
                    size="sm"
                    onClick={() => setSelectedStepKey(prioritizedAction.stepKey)}
                  >
                    {tr("Open Guided Step", "فتح الخطوة الإرشادية")}
                  </Button>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{tr("Sections moved into this step", "الأقسام المنقولة إلى هذه الخطوة")}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedStep.includedSections.map((section) => (
                      <Badge key={section} variant="outline">{section}</Badge>
                    ))}
                  </div>
                </div>
              </div>

              {selectedStep.missingItems.length > 0 ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="mb-2 font-semibold text-amber-900">{tr("Required Elements Not Satisfied", "العناصر المطلوبة غير المستوفاة")}</div>
                  <ul className="space-y-1 text-sm text-amber-800">
                    {selectedStep.missingItems.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    {tr("All required elements are satisfied in this step.", "جميع العناصر المطلوبة مستوفاة في هذه الخطوة.")}
                  </div>
                </div>
              )}

              {renderActiveStep(selectedStep)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tr("Supporting Detail", "تفاصيل داعمة")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={detailTab} onValueChange={(value) => setDetailTab(value as DetailTab)}>
                <TabsList>
                  <TabsTrigger value="supporting">{tr("Supporting Evidence", "الأدلة الداعمة")}</TabsTrigger>
                  <TabsTrigger value="documents">{tr("Documents & Versions", "المستندات والإصدارات")}</TabsTrigger>
                  <TabsTrigger value="audit">{tr("Audit & Security", "التدقيق والأمان")}</TabsTrigger>
                </TabsList>

                <TabsContent value="supporting" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>{tr("Readiness Snapshot", "لقطة الجاهزية")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <span className="text-slate-600">{tr("Legally eligible to proceed", "مستوفٍ قانونيًا للمضي")}</span>
                          <Badge variant={readiness?.ready_for_legal ? "success" : "warning"}>{readiness?.ready_for_legal ? tr("Yes", "نعم") : tr("No", "لا")}</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <span className="text-slate-600">{tr("Patient decision", "قرار المريض")}</span>
                          <Badge variant={legalDecisionIndicator.badgeVariant}>{legalDecisionIndicator.label}</Badge>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                          <span className="text-slate-600">{tr("Financial notice", "الإشعار المالي")}</span>
                          <Badge variant={financialNoticeAvailable ? "success" : "outline"}>{financialNoticeAvailable ? tr("Available", "متوفر") : tr("Not found", "غير موجود")}</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{tr("Consent Records", "سجلات الموافقة")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {consentRecords.length === 0 ? (
                          renderMissingState(tr("No consent records saved yet.", "لا توجد سجلات موافقة محفوظة حتى الآن."))
                        ) : (
                          consentRecords.slice(0, 5).map((record) => (
                            <div key={record.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="font-medium text-slate-800">{record.processingPurpose || tr("Discharge refusal consent", "موافقة رفض الخروج")}</div>
                              <div className="text-slate-500">{tr("Method", "الطريقة")}: {translateConsentMethod(record.consentMethod, isArabic) || tr("N/A", "غير متوفر")}</div>
                              <div className="text-slate-500">{tr("Hash", "البصمة")}: {record.documentHash?.slice(0, 16) || "-"}</div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>{tr("Generated Documents", "المستندات المُنشأة")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {documents.length === 0 ? (
                          renderMissingState(tr("No generated documents found for this case yet.", "لا توجد مستندات مُنشأة لهذه الحالة حتى الآن."))
                        ) : (
                          documents.slice(0, 8).map((document) => (
                            <div key={document.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                              <div>
                                <div className="font-medium text-slate-800">{document.title || document.template_key || tr("Document", "مستند")}</div>
                                <div className="text-slate-500">{document.generated_at ? new Date(document.generated_at).toLocaleString() : tr("Pending", "قيد الانتظار")}</div>
                              </div>
                              <Badge variant={document.generationStatus === "generated" ? "success" : "outline"}>{translateCaseStatus(document.generationStatus || "draft", isArabic)}</Badge>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{tr("PDF Versions", "إصدارات PDF")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {pdfVersions.length === 0 ? (
                          renderMissingState(tr("No PDF versions are available yet.", "لا توجد إصدارات PDF متاحة حتى الآن."))
                        ) : (
                          <div className="space-y-3">
                            {pdfVersions
                              .slice()
                              .sort((a, b) => b.version - a.version)
                              .map((version, index) => {
                                const isLocked = version.status === "final" && caseData.status.toUpperCase() === "CLOSED";
                                const statusTone = mapPdfStatusTone(version.status, isLocked);
                                const statusLabel =
                                  statusTone.label === "Draft"
                                    ? tr("Draft", "مسودة")
                                    : statusTone.label === "Final"
                                      ? tr("Final", "نهائي")
                                      : statusTone.label === "Locked"
                                        ? tr("Locked", "مغلق")
                                        : tr("Failed", "فشل");

                                return (
                                  <div key={version.id} className="relative rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
                                    <div className="absolute bottom-0 left-4 top-0 w-px bg-slate-200" aria-hidden="true" />
                                    <div className="relative ml-4 flex flex-wrap items-start justify-between gap-2">
                                      <div>
                                        <div className="font-medium text-slate-800">v{version.version} • {version.fileName}</div>
                                        <div className="text-slate-500">{new Date(version.generatedAt).toLocaleString()}</div>
                                        <div className="text-xs text-slate-500">{tr("Generated by role", "تم الإنشاء بواسطة الدور")}: {role || tr("system", "النظام")}</div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant={statusTone.variant}>{statusLabel}</Badge>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            window.open(`/api/cases/${caseId}/pdf/${version.version}/preview`, "_blank", "noopener,noreferrer");
                                          }}
                                        >
                                          <Eye className="h-4 w-4" />
                                          {tr("Preview", "معاينة")}
                                        </Button>
                                        {canDownloadFinalDocs ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              window.open(`/api/cases/${caseId}/pdf/${version.version}/download`, "_blank", "noopener,noreferrer");
                                            }}
                                          >
                                            <Download className="h-4 w-4" />
                                            {tr("Download", "تنزيل")}
                                          </Button>
                                        ) : null}
                                      </div>
                                    </div>
                                    {index === 0 ? <div className="ml-4 mt-2 text-xs text-slate-500">{tr("Latest version", "أحدث إصدار")}</div> : null}
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                          <CardTitle>{tr("Audit Trail", "مسار التدقيق")}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={handlePrintAuditTrail}>
                              {tr("Print", "طباعة")}
                            </Button>
                            <Button size="sm" onClick={handleExportLegalReport}>
                              <Download className="h-4 w-4" />
                              {tr("Export", "تصدير")}
                              title={!previousStep ? tr("No previous step is available.", "لا توجد خطوة سابقة متاحة.") : undefined}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {!canReadAudit ? (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
                            {deniedMessage}
                          </div>
                        ) : null}
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={auditChain?.verification?.verified ? "success" : "warning"}>
                            {tr("Hash chain", "سلسلة التجزئة")} {auditChain?.verification?.verified ? tr("verified", "متحقق") : tr("pending", "قيد الانتظار")}
                          </Badge>
                          <span className="text-slate-600">{auditChain?.verification?.totalEvents ?? 0} {tr("event(s)", "حدث")}</span>
                          {canReadSmsEvidence ? <Badge variant="outline">{tr("SMS evidence enabled", "أدلة الرسائل النصية مفعّلة")}</Badge> : null}
                        </div>
                        {canReadAudit && auditTimeline.length ? (
                          auditTimeline.slice(0, 10).map((event) => (
                            <div key={event.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium text-slate-800">{event.eventType}</div>
                                <Badge variant="outline">{translateActorRole(event.actorRole, isArabic)}</Badge>
                              </div>
                              <div className="text-slate-500">{event.payloadSummary}</div>
                              <div className="text-xs text-slate-400">
                                {tr("When", "متى")}: {new Date(event.createdAt).toLocaleString()} • {tr("Hash", "البصمة")}: {event.currentHash.slice(0, 16)}...
                              </div>
                            </div>
                          ))
                        ) : (
                          renderMissingState(canReadAudit ? tr("No audit chain events available yet.", "لا توجد أحداث ضمن سلسلة التدقيق حتى الآن.") : tr("Audit records are hidden for your role.", "سجلات التدقيق مخفية لدورك."))
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>{tr("Security / Access Log", "سجل الأمان / الوصول")}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {(auditChain?.events ?? [])
                          .filter((event) => /EXPORT|SIGNATURE|CONSENT|PRIVILEGED/i.test(event.eventType))
                          .slice(0, 8)
                          .map((event) => (
                            <div key={event.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-slate-800">{event.eventType}</span>
                                <Badge variant="outline">{translateActorRole(event.actorRole, isArabic)}</Badge>
                              </div>
                              <div className="text-slate-500">{event.payloadSummary}</div>
                              <div className="text-slate-400">{tr("Hash", "البصمة")}: {event.currentHash.slice(0, 16)}...</div>
                            </div>
                          ))}
                        {(auditChain?.events ?? []).filter((event) => /EXPORT|SIGNATURE|CONSENT|PRIVILEGED/i.test(event.eventType)).length === 0
                          ? renderMissingState(tr("No security-sensitive access events have been captured yet.", "لم يتم التقاط أحداث وصول حساسة أمنيًا حتى الآن."))
                          : null}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {renderLegalReadinessPanel()}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-6px_16px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Recommended Legal Action", "الإجراء القانوني الموصى به")}</div>
            <div className="truncate text-sm font-semibold text-slate-900">{prioritizedAction.title}</div>
          </div>
          <Button
            disabled={!prioritizedAction.stepKey}
            title={!prioritizedAction.stepKey ? tr("No guided next action is currently available.", "لا يوجد إجراء إرشادي تالٍ متاح حاليًا.") : undefined}
            onClick={() => {
              if (prioritizedAction.stepKey) {
                setSelectedStepKey(prioritizedAction.stepKey);
                setExpandedStepKey(prioritizedAction.stepKey);
              }
            }}
          >
            {tr("Next", "التالي")}
          </Button>
        </div>
      </div>
    </div>
  );
}
