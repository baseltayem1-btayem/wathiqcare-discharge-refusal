"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardList } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import Header from "./Header";
import PatientInfoCard from "./PatientInfoCard";
import ConsentTypeSelector from "./ConsentTypeSelector";
import WorkflowStepper from "./WorkflowStepper";
import MedicalExplanationForm from "./MedicalExplanationForm";
import SignaturePanel from "./SignaturePanel";
import LegalReadinessCard from "./LegalReadinessCard";
import ActionBar from "./ActionBar";
import {
  CONSENT_TYPES,
  DEFAULT_MEDICAL_EXPLANATION,
  DEFAULT_PATIENT_INFO,
  DEFAULT_SIGNATURES,
  ROLE_OPTIONS,
  WORKFLOW_STEPS,
  type LegalReadinessCheck,
  type UserRole,
} from "./types";

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

export default function InformedConsentIssuancePage({ auth }: { auth: ModuleAuth }) {
  const [mrnQuery, setMrnQuery] = useState(DEFAULT_PATIENT_INFO.mrn);
  const [selectedRole, setSelectedRole] = useState<UserRole>("Doctor");
  const [selectedConsentTypeId, setSelectedConsentTypeId] = useState(CONSENT_TYPES[0]?.id ?? "");
  const [medicalExplanation, setMedicalExplanation] = useState(DEFAULT_MEDICAL_EXPLANATION);
  const [signatures, setSignatures] = useState(DEFAULT_SIGNATURES);
  const [patientCollapsed, setPatientCollapsed] = useState(false);
  const [medicalCollapsed, setMedicalCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<"workflow" | "compliance">("workflow");
  const [toastMessage, setToastMessage] = useState<string>("");

  const timestamp = useMemo(() => new Date().toLocaleString("en-SA", { hour12: false }), []);

  const legalChecks = useMemo<LegalReadinessCheck[]>(() => {
    const witnessRequired = selectedConsentTypeId === "high-risk" || selectedConsentTypeId === "ama";
    const interpreterRequired = DEFAULT_PATIENT_INFO.capacityStatus !== "competent";

    return [
      { key: "mandatory", label: { ar: "الحقول الإلزامية مكتملة", en: "Mandatory fields completed" }, passed: !!medicalExplanation.procedureDescription && !!medicalExplanation.diagnosisReason },
      { key: "capacity", label: { ar: "القدرة القانونية موثقة", en: "Capacity verified" }, passed: DEFAULT_PATIENT_INFO.capacityStatus.length > 0 },
      { key: "risks", label: { ar: "المخاطر موثقة", en: "Risks documented" }, passed: !!medicalExplanation.materialRisks },
      { key: "alternatives", label: { ar: "البدائل موثقة", en: "Alternatives documented" }, passed: !!medicalExplanation.alternativesExplained },
      { key: "refusal", label: { ar: "عواقب الرفض موثقة", en: "Refusal consequences documented" }, passed: !!medicalExplanation.refusalConsequences },
      { key: "signature", label: { ar: "التوقيع مكتمل", en: "Signature completed" }, passed: signatures.patientSigned && signatures.physicianSigned },
      { key: "witness", label: { ar: witnessRequired ? "الشاهد مطلوب" : "الشاهد غير مطلوب", en: witnessRequired ? "Witness required" : "Witness not required" }, passed: !witnessRequired || signatures.witnessSigned },
      { key: "interpreter", label: { ar: interpreterRequired ? "المترجم مطلوب" : "المترجم غير مطلوب", en: interpreterRequired ? "Interpreter required" : "Interpreter not required" }, passed: !interpreterRequired || signatures.interpreterSigned },
      { key: "ready", label: { ar: "جاهز لتوليد PDF قانوني", en: "Ready to Generate Legal PDF" }, passed: false },
    ];
  }, [medicalExplanation, selectedConsentTypeId, signatures]);

  const readinessWithoutGate = legalChecks.slice(0, legalChecks.length - 1).every((check) => check.passed);
  const readinessChecks = legalChecks.map((check) => (check.key === "ready" ? { ...check, passed: readinessWithoutGate } : check));

  const validationAlerts = [
    !medicalExplanation.physicianConfirmed ? "Physician confirmation checkbox is required." : "",
    !signatures.otpVerified ? "OTP verification is pending." : "",
    !signatures.pdfFillerSelected ? "Select PDF filler signing option before final legal PDF." : "",
  ].filter(Boolean);

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
    // TODO: Connect action buttons to backend workflow APIs (save/submit/generate/archive/print).
    const message = `Action executed: ${action}`;
    setToastMessage(message);
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
      <div className="space-y-4" dir="rtl">
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
            // TODO: Integrate MRN search API and update patient card payload.
          }}
          selectedRole={selectedRole}
          onRoleChange={setSelectedRole}
          roleOptions={ROLE_OPTIONS}
        />

        <PatientInfoCard patient={DEFAULT_PATIENT_INFO} collapsed={patientCollapsed} onToggle={() => setPatientCollapsed((prev) => !prev)} />
        <ConsentTypeSelector consentTypes={CONSENT_TYPES} selectedConsentTypeId={selectedConsentTypeId} onSelect={setSelectedConsentTypeId} />

        <div className="wc-panel border-slate-200 bg-white">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
            <button type="button" onClick={() => setActiveTab("workflow")} className={`wc-tab ${activeTab === "workflow" ? "wc-tab-active" : ""}`}>
              <ClipboardList className="h-3.5 w-3.5" /> Workflow
            </button>
            <button type="button" onClick={() => setActiveTab("compliance")} className={`wc-tab ${activeTab === "compliance" ? "wc-tab-active" : ""}`}>
              <CheckCircle2 className="h-3.5 w-3.5" /> Compliance
            </button>
          </div>

          {activeTab === "workflow" ? <WorkflowStepper steps={WORKFLOW_STEPS} /> : complianceSummary}
        </div>

        <MedicalExplanationForm
          value={medicalExplanation}
          onChange={setMedicalExplanation}
          collapsed={medicalCollapsed}
          onToggle={() => setMedicalCollapsed((prev) => !prev)}
        />

        <SignaturePanel value={signatures} onChange={setSignatures} timestamp={timestamp} />
        <LegalReadinessCard checks={readinessChecks} />
        <ActionBar onAction={showActionToast} />
      </div>
    </ModuleShell>
  );
}
