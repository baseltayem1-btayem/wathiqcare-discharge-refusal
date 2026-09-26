"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BadgeCheck, CheckCircle2, ClipboardList, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { emitPatientEducationEvent } from "@/lib/modules/patient-education-events";
import Header from "./Header";
import PatientInfoCard from "./PatientInfoCard";
import ConsentTypeSelector from "./ConsentTypeSelector";
import ActionBar from "./ActionBar";
import {
  CONSENT_TYPES,
  DEFAULT_MEDICAL_EXPLANATION,
  DEFAULT_PATIENT_INFO,
  DEFAULT_SIGNATURES,
  ROLE_OPTIONS,
  WORKFLOW_STEPS,
  getActiveConsentTypes,
  type LegalReadinessCheck,
  type UserRole,
} from "./types";

// Pilot stabilization (v1.0.1): only `pilot-ready` / `active` consent types are exposed to
// physicians. Hidden types are not yet validated end-to-end (template + workflow + signing +
// PDF + audit chain). See `pilot-package/CONSENT_TYPE_READINESS_MATRIX.md`.
const ACTIVE_CONSENT_TYPES = getActiveConsentTypes();

const WorkflowStepper = dynamic(() => import("./WorkflowStepper"), {
  loading: () => <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Loading workflow panel…</div>,
});
const MedicalExplanationForm = dynamic(() => import("./MedicalExplanationForm"));
const SignaturePanel = dynamic(() => import("./SignaturePanel"));
const LegalReadinessCard = dynamic(() => import("./LegalReadinessCard"));
const PatientEducationSummary = dynamic(() => import("@/components/modules/consent/patient-education/PatientEducationSummary"));
const FaqAccordion = dynamic(() => import("@/components/modules/consent/patient-education/FaqAccordion"));
const UnderstandingCheck = dynamic(() => import("@/components/modules/consent/patient-education/UnderstandingCheck"));

import {
  loadPhase22Template,
  PHASE_22_TEMPLATE_CODES,
  type Phase22TemplateBundle,
  type Phase22TemplateCode,
} from "@/modules/consent-engine/loaders/phase22-content-loader";

/**
 * Phase 2.4 — informed consent flow step machine.
 * Order: TEMPLATE_SELECTION → PATIENT_EDUCATION → CONSENT_FORM → OTP → SIGNATURE.
 * The PATIENT_EDUCATION stage is gated by the Phase 2.2 UNDERSTANDING_CHECK
 * passing score (>= 80% by content-package definition). For consent types
 * without a Phase 2.2 bundle (ama, telemedicine, media, data-sharing) the
 * patient-education gate is bypassed automatically.
 */
export type ConsentFlowStep =
  | "TEMPLATE_SELECTION"
  | "PATIENT_EDUCATION"
  | "CONSENT_FORM"
  | "OTP"
  | "SIGNATURE";

const CONSENT_TYPE_TO_PHASE22: Partial<Record<string, Phase22TemplateCode>> = {
  surgical: "SURGICAL_PROCEDURE_CONSENT",
  anesthesia: "ANESTHESIA_CONSENT",
  blood: "BLOOD_AND_PRODUCTS_TRANSFUSION_CONSENT",
  "high-risk": "HIGH_RISK_MEDICAL_PROCEDURE_CONSENT",
};

function mapConsentTypeToPhase22Code(consentTypeId: string): Phase22TemplateCode | null {
  const code = CONSENT_TYPE_TO_PHASE22[consentTypeId];
  return code && PHASE_22_TEMPLATE_CODES.includes(code) ? code : null;
}

function formatAuditTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: false,
    timeZone: "Asia/Riyadh",
  }).format(date);
}

type ModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

const MENU_ITEMS = [
  { href: "/modules/informed-consents", label: { ar: "الموافقات المستنيرة", en: "Informed Consents" } },
  { href: "/modules/informed-consents/list", label: { ar: "قائمة الموافقات", en: "Consent List" } },
  { href: "/modules/informed-consents/archive", label: { ar: "الأرشيف", en: "Archive" } },
  { href: "/modules/informed-consents/templates", label: { ar: "القوالب", en: "Templates" } },
  { href: "/modules/discharge-refusal", label: { ar: "منصة رفض الخروج", en: "Discharge Refusal" } },
];

const JOURNEY_BADGES = [
  { icon: ShieldCheck, title: "PDPL Compliant", description: "Privacy-first consent flow" },
  { icon: FileCheck2, title: "Audit Protected", description: "Immutable event evidence" },
  { icon: BadgeCheck, title: "Evidence Ready", description: "PDF and QR package output" },
  { icon: LockKeyhole, title: "OTP Secured", description: "Optional step-up verification" },
];

export default function InformedConsentIssuancePage({ auth, clinicalAiEnabled = false, tabletSignatureEnabled = true, biometricSignatureEnabled = false }: { auth: ModuleAuth; clinicalAiEnabled?: boolean; tabletSignatureEnabled?: boolean; biometricSignatureEnabled?: boolean }) {
  const [mrnQuery, setMrnQuery] = useState(DEFAULT_PATIENT_INFO.mrn);
  const [selectedRole, setSelectedRole] = useState<UserRole>("Doctor");
  const [selectedConsentTypeId, setSelectedConsentTypeId] = useState(ACTIVE_CONSENT_TYPES[0]?.id ?? "");
  const [medicalExplanation, setMedicalExplanation] = useState(DEFAULT_MEDICAL_EXPLANATION);
  const [signatures, setSignatures] = useState(DEFAULT_SIGNATURES);
  const [patientCollapsed, setPatientCollapsed] = useState(false);
  const [medicalCollapsed, setMedicalCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"workflow" | "compliance">("workflow");
  const [toastMessage, setToastMessage] = useState<string>("");
  const [runtimeTimestamp, setRuntimeTimestamp] = useState("--");
  const [aiDraftPending, setAiDraftPending] = useState(false);
  const [aiDraftError, setAiDraftError] = useState("");

  // Phase 2.4 — consent-flow step machine + patient-education gate state.
  const [currentStep, setCurrentStep] = useState<ConsentFlowStep>("TEMPLATE_SELECTION");
  const [educationScorePct, setEducationScorePct] = useState<number | null>(null);
  const [educationPassed, setEducationPassed] = useState(false);

  // Phase 2.5 — patient-education evidence capture state. The page is rendered
  // bilingually (AR + EN side-by-side) so events default to "bilingual".
  const educationLanguage: "ar" | "en" | "bilingual" = "bilingual";
  const educationStartedAtRef = useRef<number | null>(null);
  const educationOpenedLoggedRef = useRef<string | null>(null);
  const educationCompletedLoggedRef = useRef<string | null>(null);
  const faqViewedRef = useRef<Set<string>>(new Set());
  const [educationAttempts, setEducationAttempts] = useState(0);

  const phase22Code = useMemo<Phase22TemplateCode | null>(
    () => mapConsentTypeToPhase22Code(selectedConsentTypeId),
    [selectedConsentTypeId],
  );
  const phase22Bundle = useMemo<Phase22TemplateBundle | null>(
    () => (phase22Code ? loadPhase22Template(phase22Code) : null),
    [phase22Code],
  );
  const educationSection = useMemo(
    () => phase22Bundle?.sections.find((s) => s.kind === "patient-education") ?? null,
    [phase22Bundle],
  );
  const faqSection = useMemo(
    () => phase22Bundle?.sections.find((s) => s.kind === "faq") ?? null,
    [phase22Bundle],
  );
  const understandingSection = useMemo(
    () => phase22Bundle?.sections.find((s) => s.kind === "understanding-check") ?? null,
    [phase22Bundle],
  );

  function handleConsentTypeSelect(id: string) {
    setSelectedConsentTypeId(id);
    setEducationPassed(false);
    setEducationScorePct(null);
    setEducationAttempts(0);
    faqViewedRef.current = new Set();
    educationOpenedLoggedRef.current = null;
    educationCompletedLoggedRef.current = null;
    educationStartedAtRef.current = null;
    const hasBundle = mapConsentTypeToPhase22Code(id) !== null;
    setCurrentStep(hasBundle ? "PATIENT_EDUCATION" : "CONSENT_FORM");
  }

  // Phase 2.5 — EDUCATION_OPENED is emitted exactly once per (templateCode)
  // entry into the PATIENT_EDUCATION stage. The start timestamp is also
  // captured here so subsequent events can report durationSeconds.
  useEffect(() => {
    if (currentStep !== "PATIENT_EDUCATION" || !phase22Code) return;
    if (educationOpenedLoggedRef.current === phase22Code) return;
    educationOpenedLoggedRef.current = phase22Code;
    educationStartedAtRef.current = Date.now();
    void emitPatientEducationEvent({
      eventType: "EDUCATION_OPENED",
      templateCode: phase22Code,
      language: educationLanguage,
    });
  }, [currentStep, phase22Code, educationLanguage]);

  function getEducationDurationSeconds(): number | undefined {
    const startedAt = educationStartedAtRef.current;
    if (!startedAt) return undefined;
    return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  }

  const handleFaqItemViewed = useCallback(
    (itemId: string) => {
      if (!phase22Code) return;
      // De-dupe: a given item should only emit FAQ_VIEWED once per stage entry.
      if (faqViewedRef.current.has(itemId)) return;
      faqViewedRef.current.add(itemId);
      void emitPatientEducationEvent({
        eventType: "FAQ_VIEWED",
        templateCode: phase22Code,
        language: educationLanguage,
        durationSeconds: getEducationDurationSeconds(),
        extra: { faqItemId: itemId, faqViewedCount: faqViewedRef.current.size },
      });
    },
    [phase22Code, educationLanguage],
  );

  function handleEducationResult(r: { scorePct: number; passed: boolean; answers: Record<string, string>; correctIds: string[] }) {
    setEducationScorePct(r.scorePct);
    setEducationPassed(r.passed);
    const attemptNumber = educationAttempts + 1;
    setEducationAttempts(attemptNumber);
    if (!phase22Code) return;

    const passingScore = understandingSection?.meta?.scoring?.passingScore ?? 80;
    const durationSeconds = getEducationDurationSeconds();

    void emitPatientEducationEvent({
      eventType: "UNDERSTANDING_COMPLETED",
      templateCode: phase22Code,
      language: educationLanguage,
      score: r.scorePct,
      durationSeconds,
      attempts: attemptNumber,
      extra: {
        passed: r.passed,
        passingScore,
        correctIds: r.correctIds,
        answers: r.answers,
      },
    });

    if (r.passed) {
      void emitPatientEducationEvent({
        eventType: "UNDERSTANDING_PASSED",
        templateCode: phase22Code,
        language: educationLanguage,
        score: r.scorePct,
        durationSeconds,
        attempts: attemptNumber,
        extra: { passingScore },
      });
    }
  }

  function advanceFromEducation() {
    if (!educationPassed) return;
    // Phase 2.5 — EDUCATION_COMPLETED marks the PE gate as cleared (one fire
    // per (templateCode) entry into the stage).
    if (phase22Code && educationCompletedLoggedRef.current !== phase22Code) {
      educationCompletedLoggedRef.current = phase22Code;
      void emitPatientEducationEvent({
        eventType: "EDUCATION_COMPLETED",
        templateCode: phase22Code,
        language: educationLanguage,
        score: educationScorePct ?? undefined,
        durationSeconds: getEducationDurationSeconds(),
        attempts: educationAttempts,
        extra: { faqViewedCount: faqViewedRef.current.size },
      });
    }
    setCurrentStep("CONSENT_FORM");
  }

  function backToTemplateSelection() {
    setCurrentStep("TEMPLATE_SELECTION");
    setEducationPassed(false);
    setEducationScorePct(null);
    setEducationAttempts(0);
    faqViewedRef.current = new Set();
    educationOpenedLoggedRef.current = null;
    educationCompletedLoggedRef.current = null;
    educationStartedAtRef.current = null;
  }

  function advanceFromConsentForm() {
    setCurrentStep("OTP");
  }

  function advanceFromOtp() {
    setCurrentStep("SIGNATURE");
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setRuntimeTimestamp(formatAuditTimestamp(new Date()));
    }, 0);
    return () => window.clearTimeout(handle);
  }, []);

  useEffect(() => {
    // TODO: Integrate consent template API to load role/department specific templates for the selected consent type.
  }, [selectedConsentTypeId]);

  const legalChecks = useMemo<LegalReadinessCheck[]>(() => {
    // Pilot scope exclusion: interpreter and witness signing workflows are not
    // implemented for the controlled pilot.  Only `surgical` consent is exposed,
    // and it is dispatched for competent patients without witness/interpreter
    // requirements.  See `pilot-package/CONSENT_TYPE_READINESS_MATRIX.md` and
    // `docs/rc2-operational-readiness/09-go-live-readiness.md` §3.
    const witnessRequired = false;
    const interpreterRequired = false;

    return [
      { key: "mandatory", label: { ar: "الحقول الإلزامية مكتملة", en: "Mandatory fields completed" }, passed: !!medicalExplanation.procedureDescription && !!medicalExplanation.diagnosisReason },
      { key: "capacity", label: { ar: "القدرة القانونية موثقة", en: "Capacity verified" }, passed: DEFAULT_PATIENT_INFO.capacityStatus.length > 0 },
      { key: "risks", label: { ar: "المخاطر موثقة", en: "Risks documented" }, passed: !!medicalExplanation.materialRisks },
      { key: "alternatives", label: { ar: "البدائل موثقة", en: "Alternatives documented" }, passed: !!medicalExplanation.alternativesExplained },
      { key: "refusal", label: { ar: "عواقب الرفض موثقة", en: "Refusal consequences documented" }, passed: !!medicalExplanation.refusalConsequences },
      { key: "signature", label: { ar: "التوقيع مكتمل", en: "Signature completed" }, passed: signatures.patientSigned && signatures.physicianSigned && signatures.signatureEvidenceReady },
      { key: "witness", label: { ar: witnessRequired ? "الشاهد مطلوب" : "الشاهد غير مطلوب", en: witnessRequired ? "Witness required" : "Witness not required" }, passed: !witnessRequired || signatures.witnessSigned },
      { key: "interpreter", label: { ar: interpreterRequired ? "المترجم مطلوب" : "المترجم غير مطلوب", en: interpreterRequired ? "Interpreter required" : "Interpreter not required" }, passed: !interpreterRequired || signatures.interpreterSigned },
      { key: "ready", label: { ar: "جاهز لتوليد PDF قانوني", en: "Ready to Generate Legal PDF" }, passed: false },
    ];
  }, [medicalExplanation, signatures]);

  const readinessWithoutGate = legalChecks.slice(0, legalChecks.length - 1).every((check) => check.passed);
  const readinessChecks = legalChecks.map((check) => (check.key === "ready" ? { ...check, passed: readinessWithoutGate } : check));

  const validationAlerts = [
    !medicalExplanation.physicianConfirmed ? "Physician confirmation checkbox is required." : "",
    !signatures.acknowledgmentAccepted ? "Patient acknowledgment is required before signature capture." : "",
    ((signatures.selectedMethod === "otp" || signatures.selectedMethod === "combined-tablet-and-otp" || signatures.selectedMethod === "combined-biometric-and-otp") && !signatures.otpVerified)
      ? "OTP verification is pending for the selected signing method."
      : "",
    !signatures.signatureEvidenceReady ? "Patient signing evidence must be captured before final legal PDF generation." : "",
    medicalExplanation.aiDraftStatus === "pending-physician-review" ? "AI-assisted draft must be approved or rejected by the physician before proceeding." : "",
  ].filter(Boolean);

  const disabledActionKeys = medicalExplanation.aiDraftStatus === "pending-physician-review"
    ? ["save-draft", "submit-review", "generate-draft", "generate-final", "archive"]
    : [];

  const complianceSummary = (
    <div className="grid gap-2 md:grid-cols-2">
      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <p className="font-semibold text-slate-800">PDPL & audit requirements</p>
        <p className="mt-1 text-[11px] text-slate-600">Enforce immutable PDF, full audit trail, and role-scoped issuance actions.</p>
      </div>
      <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        <p className="font-semibold text-slate-800">Bilingual legal output</p>
        <p className="mt-1 text-[11px] text-slate-600">Generate Arabic/English consent package with versioned legal archive.</p>
      </div>
    </div>
  );

  function showActionToast(action: string) {
    // TODO: Integrate PDF generation API for draft/final legal outputs.
    // TODO: Integrate audit logging API for every user action and status transition.
    const message = `Action executed: ${action}`;
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 2500);
  }

  async function generateAiDraft() {
    if (!clinicalAiEnabled) {
      setAiDraftError("Clinical AI assistant is disabled.");
      return;
    }

    setAiDraftPending(true);
    setAiDraftError("");

    try {
      const response = await fetch("/api/modules/informed-consents/ai/draft", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clinicalContext: [medicalExplanation.expectedBenefits, medicalExplanation.patientQuestions].filter(Boolean),
          consentType: selectedConsentTypeId,
          diagnosisLabel: medicalExplanation.diagnosisReason,
          language: "en",
          procedure: medicalExplanation.procedureDescription,
          specialty: DEFAULT_PATIENT_INFO.department,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
        throw new Error(errorPayload?.message || errorPayload?.error || "AI draft generation failed.");
      }

      const payload = (await response.json()) as {
        draft: { medicalDisclaimer: string };
        preparedFields: {
          aiDraftStatus: "pending-physician-review";
          alternativesExplained: string;
          materialRisks: string;
          patientEducationSummary: string;
          postProcedureInstructions: string;
          procedureDescription: string;
          refusalConsequences: string;
        };
      };

      setMedicalExplanation((current) => ({
        ...current,
        aiDraftDisclaimer: payload.draft.medicalDisclaimer,
        aiDraftStatus: payload.preparedFields.aiDraftStatus,
        alternativesExplained: payload.preparedFields.alternativesExplained,
        materialRisks: payload.preparedFields.materialRisks,
        patientEducationSummary: payload.preparedFields.patientEducationSummary,
        postProcedureInstructions: payload.preparedFields.postProcedureInstructions,
        procedureDescription: payload.preparedFields.procedureDescription,
        refusalConsequences: payload.preparedFields.refusalConsequences,
      }));
      setToastMessage("AI draft generated. Physician review is required.");
      setTimeout(() => setToastMessage(""), 2500);
    } catch (error) {
      setAiDraftError(error instanceof Error ? error.message : "AI draft generation failed.");
    } finally {
      setAiDraftPending(false);
    }
  }

  function approveAiDraft() {
    setMedicalExplanation((current) => ({
      ...current,
      aiDraftStatus: "approved",
      physicianConfirmed: true,
    }));
    setToastMessage("AI draft approved by physician.");
    setTimeout(() => setToastMessage(""), 2500);
  }

  function rejectAiDraft() {
    setMedicalExplanation((current) => ({
      ...current,
      aiDraftStatus: "rejected",
    }));
    setToastMessage("AI draft rejected by physician.");
    setTimeout(() => setToastMessage(""), 2500);
  }

  return (
    <ModuleShell
      auth={auth}
      moduleKey="informed-consents"
      title={{ ar: "الموافقات المستنيرة", en: "Informed Consents" }}
      subtitle={{ ar: "واجهة إصدار الموافقات المستنيرة المتوافقة مع الاستخدام الطبي والقانوني", en: "Production-informed consent issuance interface for clinical and legal workflows" }}
      menuItems={MENU_ITEMS}
    >
      <div className="space-y-4" dir="rtl" lang="ar">
        {toastMessage ? (
          <div className="wc-alert-success flex items-center gap-2 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> {toastMessage}</div>
        ) : null}

        {validationAlerts.length > 0 ? (
          <div className="wc-alert-error text-xs">
            <div className="mb-1 flex items-center gap-1 font-semibold"><AlertCircle className="h-3.5 w-3.5" /> Validation alerts</div>
            <ul className="list-disc space-y-0.5 ps-5">
              {validationAlerts.map((alert) => <li key={alert}>{alert}</li>)}
            </ul>
          </div>
        ) : null}

        <Header
          mrnQuery={mrnQuery}
          onMrnQueryChange={(value) => {
            setMrnQuery(value);
            // TODO: Integrate patient lookup API and update patient card payload from canonical patient service.
          }}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          roleOptions={ROLE_OPTIONS}
        />

        <div className="wc-trust-strip">
          {JOURNEY_BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.title} className="wc-trust-badge">
                <span className="wc-trust-badge__icon" aria-hidden="true"><Icon className="h-3.5 w-3.5" /></span>
                <div className="min-w-0">
                  <span className="wc-trust-badge__label">{badge.title}</span>
                  <span className="wc-trust-badge__description">{badge.description}</span>
                </div>
              </div>
            );
          })}
        </div>

        <PatientInfoCard patient={DEFAULT_PATIENT_INFO} collapsed={patientCollapsed} onToggle={() => setPatientCollapsed((prev) => !prev)} />

        {/* Phase 2.4 step indicator — non-destructive, shows the active stage of the consent flow. */}
        <nav aria-label="Consent flow progress" className="rounded-[24px] border border-[rgba(0,43,92,0.1)] bg-white px-4 py-3 shadow-[var(--shadow-md)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--foreground-secondary)]">Consent wizard</p>
              <p className="text-[12px] font-medium text-[var(--foreground)]">Current stage: {currentStep.replaceAll("_", " ")}</p>
            </div>
            <span className="rounded-full bg-[rgba(201,161,59,0.12)] px-3 py-1 text-[11px] font-semibold text-[var(--primary-pressed)]">5-step journey</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-[var(--foreground-secondary)]">
          {([
            { id: "TEMPLATE_SELECTION", label: "1. Template" },
            { id: "PATIENT_EDUCATION", label: "2. Patient Education" },
            { id: "CONSENT_FORM", label: "3. Consent Form" },
            { id: "OTP", label: "4. OTP" },
            { id: "SIGNATURE", label: "5. Signature" },
          ] as { id: ConsentFlowStep; label: string }[]).map((s) => (
            <span
              key={s.id}
              data-flow-step={s.id}
              data-active={currentStep === s.id ? "true" : "false"}
              className={`rounded-full border px-3 py-1 transition-colors ${currentStep === s.id ? "border-[rgba(0,43,92,0.2)] bg-[rgba(75,156,211,0.12)] text-[var(--primary-pressed)]" : "border-[var(--border-soft)] bg-[var(--surface-muted)] text-[var(--foreground-secondary)]"}`}
            >
              {s.label}
            </span>
          ))}
          </div>
        </nav>

        {currentStep === "TEMPLATE_SELECTION" ? (
          <ConsentTypeSelector
            consentTypes={ACTIVE_CONSENT_TYPES}
            hiddenCount={CONSENT_TYPES.length - ACTIVE_CONSENT_TYPES.length}
            selectedConsentTypeId={selectedConsentTypeId}
            onSelect={handleConsentTypeSelect}
          />
        ) : (
          <div className="rounded-2xl border border-[rgba(0,43,92,0.08)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--foreground-secondary)] shadow-sm">
            <span className="font-semibold text-[var(--foreground)]">Selected consent type:</span>{" "}
            {CONSENT_TYPES.find((c) => c.id === selectedConsentTypeId)?.title.en ?? selectedConsentTypeId}
            <button type="button" onClick={backToTemplateSelection} className="ms-3 text-[11px] font-semibold text-[var(--primary)] underline underline-offset-2">Change template</button>
          </div>
        )}

        {currentStep === "PATIENT_EDUCATION" && phase22Bundle && educationSection && faqSection && understandingSection ? (
          <section data-consent-flow-step="PATIENT_EDUCATION" className="space-y-4">
            <PatientEducationSummary section={educationSection} />
            <FaqAccordion
              titleEn={faqSection.titleEn}
              titleAr={faqSection.titleAr}
              items={faqSection.meta?.faqItems ?? []}
              onItemViewed={handleFaqItemViewed}
            />
            <UnderstandingCheck
              titleEn={understandingSection.titleEn}
              titleAr={understandingSection.titleAr}
              questions={understandingSection.meta?.understandingQuestions ?? []}
              scoring={understandingSection.meta?.scoring ?? { passingScore: 80, maxScore: 100, formula: "weighted_sum", remediationOnFail: "Please review the summary and try again." }}
              onResult={handleEducationResult}
            />
            <div className="flex flex-col gap-3 rounded-2xl border border-[rgba(0,43,92,0.08)] bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs leading-5 text-[var(--foreground-secondary)]">
                {educationScorePct === null
                  ? "Complete the understanding check to continue."
                  : educationPassed
                    ? `PASS · ${educationScorePct}% — you may continue to the consent form.`
                    : `Score ${educationScorePct}% — please retry to reach the required 80%.`}
              </div>
              <button
                type="button"
                onClick={advanceFromEducation}
                disabled={!educationPassed}
                className="rounded-full bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Continue to Consent Form
              </button>
            </div>
          </section>
        ) : null}

        <div className="wc-panel border-slate-200 bg-white">
          <div className="mb-3 flex items-center gap-2 border-b border-[var(--border-soft)] pb-2">
            <button type="button" onClick={() => setActiveTab("workflow")} className={`wc-tab ${activeTab === "workflow" ? "wc-tab-active" : ""}`} aria-label="Show workflow tab">
              <ClipboardList className="h-3.5 w-3.5" /> Workflow
            </button>
            <button type="button" onClick={() => setActiveTab("compliance")} className={`wc-tab ${activeTab === "compliance" ? "wc-tab-active" : ""}`} aria-label="Show compliance tab">
              <CheckCircle2 className="h-3.5 w-3.5" /> Compliance
            </button>
          </div>

          {activeTab === "workflow" ? <WorkflowStepper steps={WORKFLOW_STEPS} /> : complianceSummary}
        </div>

        {(currentStep === "CONSENT_FORM" || currentStep === "OTP" || currentStep === "SIGNATURE") ? (
          <>
            <MedicalExplanationForm
              aiDraftAvailable={clinicalAiEnabled}
              aiDraftError={aiDraftError}
              aiDraftPending={aiDraftPending}
              onApproveAiDraft={approveAiDraft}
              value={medicalExplanation}
              onChange={setMedicalExplanation}
              collapsed={medicalCollapsed}
              onGenerateAiDraft={generateAiDraft}
              onRejectAiDraft={rejectAiDraft}
              onToggle={() => setMedicalCollapsed((prev) => !prev)}
            />
            {currentStep === "CONSENT_FORM" ? (
              <div className="flex justify-end">
                <button type="button" onClick={advanceFromConsentForm} className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm">Continue to OTP</button>
              </div>
            ) : null}
          </>
        ) : null}

        {(currentStep === "OTP" || currentStep === "SIGNATURE") ? (
          <>
            <SignaturePanel
              biometricEnabled={biometricSignatureEnabled}
              tabletEnabled={tabletSignatureEnabled}
              value={signatures}
              onChange={setSignatures}
              timestamp={runtimeTimestamp}
            />
            {currentStep === "OTP" ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={advanceFromOtp}
                  disabled={!signatures.otpVerified}
                  className="rounded-full bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Proceed to Signature
                </button>
              </div>
            ) : null}
          </>
        ) : null}
        <section className="wc-panel border-slate-200 bg-white text-[11px] text-slate-600">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div><strong>Timestamp Placeholder:</strong> {runtimeTimestamp}</div>
            <div><strong>Audit Event Stream:</strong> tablet and biometric evidence routes are available for live consent documents</div>
            <div><strong>Legal Package Link:</strong> final PDF can include signature method, evidence ID, and verification metadata</div>
          </div>
        </section>
        <LegalReadinessCard checks={readinessChecks} />
        <ActionBar disabledActionKeys={disabledActionKeys} onAction={showActionToast} />
      </div>
    </ModuleShell>
  );
}
