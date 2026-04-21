"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
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
import { getLegalReadinessDecisionIndicator } from "@/components/cases/legalReadinessDecision";
import { useI18n } from "@/i18n/I18nProvider";
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
  witness_name: string;
  witness_role: string;
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
  onRecordPresentation: () => Promise<void>;
  onRecordSignature: () => Promise<void>;
  onRecordWitness: () => Promise<void>;
  onRecordConsent: () => Promise<void>;
  onGenerateLegalPackage: () => Promise<void>;
  onGenerateCasePdf: (mode: "draft" | "final", regenerate?: boolean) => Promise<void>;
};

type DetailTab = "supporting" | "documents" | "audit";

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
  onRecordPresentation,
  onRecordSignature,
  onRecordWitness,
  onRecordConsent,
  onGenerateLegalPackage,
  onGenerateCasePdf,
}: LayoutProps) {
  const { lang } = useI18n();
  const isArabic = lang === "ar";
  const tr = (en: string, ar: string): string => (isArabic ? ar : en);

  const [manualStepKey, setSelectedStepKey] = useState<CaseWorkspaceStepKey | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("supporting");

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
        witnessRecorded: Boolean(witness.witness_name),
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
      witness.witness_name,
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
  const completedSteps = workflowFlow.steps.filter((step) => step.status === "completed").length;
  const progressValue = Math.round((completedSteps / workflowFlow.steps.length) * 100);
  const viewOnlyMode =
    !canMedicalActions && !canLegalApprove && !canGeneratePdf && !canGenerateBundle;
  const completionStateRef = useRef<Record<string, boolean>>({});
  const completionTrackingReadyRef = useRef(false);

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

  function renderCaseCreationStep() {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tr("Case Summary", "ملخص الحالة")}</CardTitle>
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
                {caseData.physician !== "Not assigned" ? tr("Assigned", "معين") : tr("Missing", "مفقود")}
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
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
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
                  {tr("Record Medical Decision", "تسجيل القرار الطبي")}
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
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
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
                  disabled={loading || !canMedicalActions || !signature.patient_decision}
                  title={!canMedicalActions ? deniedMessage : undefined}
                  onClick={() => {
                    trackPrimaryAction("record_patient_decision", { role: role ?? undefined });
                    void onRecordSignature();
                  }}
                >
                  {tr("Record Patient Decision", "تسجيل قرار المريض")}
                </Button>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">{tr("Witness", "الشاهد")}</div>
                <Input
                  placeholder={tr("Witness name", "اسم الشاهد")}
                  value={witness.witness_name}
                  onChange={(event) =>
                    setWitness((previous) => ({
                      ...previous,
                      witness_name: event.target.value,
                    }))
                  }
                />
                <Input
                    placeholder={tr("Witness role", "صفة الشاهد")}
                  value={witness.witness_role}
                  onChange={(event) =>
                    setWitness((previous) => ({
                      ...previous,
                      witness_role: event.target.value,
                    }))
                  }
                />
                <Button
                  variant="outline"
                  disabled={loading || !canWitnessAction}
                  title={!canWitnessAction ? deniedMessage : undefined}
                  onClick={() => {
                    trackPrimaryAction("record_witness", { role: role ?? undefined });
                    void onRecordWitness();
                  }}
                >
                  {tr("Record Witness", "تسجيل الشاهد")}
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
              disabled={loading}
              onClick={() => {
                trackPrimaryAction("record_consent_evidence", { role: role ?? undefined });
                void onRecordConsent();
              }}
            >
              {tr("Record Consent Evidence", "تسجيل أدلة الموافقة")}
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
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tr("Readiness Summary", "ملخص الجاهزية")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Ready for legal", "جاهز للشؤون القانونية")}</span>
              <Badge variant={readiness?.ready_for_legal ? "success" : "warning"}>
                {readiness?.ready_for_legal ? tr("Yes", "نعم") : tr("No", "لا")}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
              <span className="text-slate-600">{tr("Patient decision", "قرار المريض")}</span>
              <Badge variant={legalDecisionIndicator.badgeVariant}>{legalDecisionIndicator.label}</Badge>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
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

        <Card>
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
                <div className="space-y-2">
                  {legalReadinessReport.checklist.map((item) => (
                    <div key={item.key} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium text-slate-800">{item.label}</div>
                        <div className="text-slate-500">{item.reason}</div>
                      </div>
                      <Badge variant={item.satisfied ? "success" : item.required ? "warning" : "outline"}>
                        {item.satisfied ? tr("Compliant", "متوافق") : item.required ? tr("Blocked", "محظور") : tr("Optional", "اختياري")}
                      </Badge>
                    </div>
                  ))}
                </div>
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
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
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
                disabled={pdfBusy || !canGeneratePdf}
                title={!canGeneratePdf ? deniedMessage : undefined}
                onClick={() => {
                  trackPrimaryAction("generate_draft_pdf", { role: role ?? undefined });
                  void onGenerateCasePdf("draft", false);
                }}
              >
                <FileText className="h-4 w-4" />
                {tr("Generate Draft PDF", "إنشاء مسودة PDF")}
              </Button>
              <Button
                variant="outline"
                disabled={pdfBusy || !canGeneratePdf || !canLegalApprove}
                title={!canGeneratePdf || !canLegalApprove ? deniedMessage : undefined}
                onClick={() => {
                  trackPrimaryAction("generate_final_pdf", { role: role ?? undefined });
                  void onGenerateCasePdf("final", false);
                }}
              >
                <ShieldCheck className="h-4 w-4" />
                {tr("Generate Final PDF", "إنشاء PDF نهائي")}
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
                disabled={loading || !canGenerateBundle}
                title={!canGenerateBundle ? deniedMessage : undefined}
                onClick={() => {
                  trackPrimaryAction("generate_legal_package", { role: role ?? undefined });
                  void onGenerateLegalPackage();
                }}
              >
                <Package className="h-4 w-4" />
                {tr("Generate Legal Package", "إنشاء الحزمة القانونية")}
              </Button>
              {legalPackage?.download_url && canDownloadFinalDocs ? (
                <a href={legalPackage.download_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Download className="h-4 w-4" />
                    {tr("Download Package", "تنزيل الحزمة")}
                  </Button>
                </a>
              ) : null}
            </div>

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
              <Badge variant={pdfValidation?.canFinalize ? "success" : "warning"}>
                {pdfValidation?.canFinalize ? tr("Ready", "جاهز") : tr("Missing required fields", "حقول مطلوبة مفقودة")}
              </Badge>
            </div>
            {pdfValidation?.missingRequired?.length ? (
              <ul className="space-y-1 text-sm text-amber-700">
                {pdfValidation.missingRequired.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-600">{tr("All required compliance fields are available.", "جميع حقول الامتثال المطلوبة متوفرة.")}</div>
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
    );
  }

  function renderClosureStep() {
    return (
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
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
                <a href={`/api/cases/${caseId}/pdf/${pdfLatest.version}/preview`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Eye className="h-4 w-4" />
                    {tr("Preview Latest", "معاينة الأحدث")}
                  </Button>
                </a>
                {canDownloadFinalDocs ? (
                  <a href={`/api/cases/${caseId}/pdf/${pdfLatest.version}/download`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Download className="h-4 w-4" />
                      {tr("Download Latest", "تنزيل الأحدث")}
                    </Button>
                  </a>
                ) : null}
              </div>
            ) : null}
            {legalPackage?.download_url && canDownloadFinalDocs ? (
              <a href={legalPackage.download_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Package className="h-4 w-4" />
                  {tr("Download Bundle", "تنزيل الحزمة")}
                </Button>
              </a>
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
        return renderClosureStep();
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {viewOnlyMode ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <div className="font-semibold">{tr("View-only workspace", "مساحة عرض فقط")}</div>
          <div className="mt-1 text-blue-600">
            {tr(
              "You can inspect case progress and evidence, but action steps remain assigned to workflow owners.",
              "يمكنك استعراض تقدم الحالة والأدلة، لكن خطوات التنفيذ تبقى مخصصة لمالكي سير العمل.",
            )}
          </div>
        </div>
      ) : null}

      <Card className="border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef6ff_55%,#f4fbf6_100%)]">
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
            </div>

            <div className="min-w-[18rem] rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                <span>{tr("Workflow progress", "تقدم سير العمل")}</span>
                <span>{completedSteps}/{workflowFlow.steps.length} {tr("completed", "مكتملة")}</span>
              </div>
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
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Next Action", "الإجراء التالي")}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{selectedStep.nextAction}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Missing Items", "العناصر المفقودة")}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {selectedStep.missingItems.length === 0 ? tr("None", "لا يوجد") : tr(`${selectedStep.missingItems.length} open item(s)`, `${selectedStep.missingItems.length} عنصر مفتوح`) }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{tr("Workflow Steps", "خطوات سير العمل")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflowFlow.steps.map((step, index) => {
                const Icon = stepIcon(step.key);
                const isSelected = step.key === selectedStep.key;

                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setSelectedStepKey(step.key)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-cyan-300 bg-cyan-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isSelected ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("Step", "الخطوة")} {index + 1}</div>
                          <div className="font-semibold text-slate-900">{step.label}</div>
                        </div>
                      </div>
                      <Badge variant={stepBadgeVariant(step)}>{stepStatusLabel(step, isArabic)}</Badge>
                    </div>
                    <div className="text-xs text-slate-500">{tr("Owner", "المالك")}: {step.ownerLabel}</div>
                    <div className="mt-2 flex items-center text-xs text-slate-600">
                      {tr("Open step", "فتح الخطوة")}
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card className="h-fit">
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

        <div className="space-y-6">
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
              <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">{tr("Next Action", "الإجراء التالي")}</div>
                  <div className="mt-1">{selectedStep.nextAction}</div>
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
                  <div className="mb-2 font-semibold text-amber-900">{tr("Missing Items", "العناصر المفقودة")}</div>
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
                    {tr("No missing items in this step.", "لا توجد عناصر مفقودة في هذه الخطوة.")}
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
                          <span className="text-slate-600">{tr("Ready for legal", "جاهز للشؤون القانونية")}</span>
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
                          pdfVersions.map((version) => (
                            <div key={version.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="font-medium text-slate-800">v{version.version} • {version.fileName}</div>
                                  <div className="text-slate-500">{new Date(version.generatedAt).toLocaleString()}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={version.status === "final" ? "success" : version.status === "failed" ? "warning" : "outline"}>{translateCaseStatus(version.status, isArabic)}</Badge>
                                  <a href={`/api/cases/${caseId}/pdf/${version.version}/preview`} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm">
                                      <Eye className="h-4 w-4" />
                                      {tr("Preview", "معاينة")}
                                    </Button>
                                  </a>
                                  {canDownloadFinalDocs ? (
                                    <a href={`/api/cases/${caseId}/pdf/${version.version}/download`} target="_blank" rel="noopener noreferrer">
                                      <Button variant="outline" size="sm">
                                        <Download className="h-4 w-4" />
                                        {tr("Download", "تنزيل")}
                                      </Button>
                                    </a>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>{tr("Audit Trail", "مسار التدقيق")}</CardTitle>
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
                        {canReadAudit && auditChain?.events?.length ? (
                          auditChain.events.slice(0, 6).map((event) => (
                            <div key={event.id} className="rounded-xl border border-slate-200 px-3 py-2">
                              <div className="font-medium text-slate-800">{event.eventType}</div>
                              <div className="text-slate-500">{event.payloadSummary}</div>
                              <div className="text-slate-400">{new Date(event.createdAt).toLocaleString()}</div>
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
      </div>
    </div>
  );
}
