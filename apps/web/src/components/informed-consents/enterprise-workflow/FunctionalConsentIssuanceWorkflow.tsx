"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  HeartPulse,
  Home,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserRound,
  Users,
  X,
} from "lucide-react";

type ConsentMode = "physician" | "patient";

type StepKey =
  | "patient"
  | "category"
  | "template"
  | "procedure"
  | "anesthesia"
  | "education"
  | "review"
  | "send";

type ConsentTemplate = {
  id: string;
  title: string;
  titleAr: string;
  type: string;
  department: string;
  specialty: string;
  status: string;
  version: string;
  language: string;
};

const steps: { key: StepKey; label: string; sub: string }[] = [
  { key: "patient", label: "Patient & Encounter", sub: "Select patient" },
  { key: "category", label: "Category", sub: "Consent type" },
  { key: "template", label: "Template", sub: "Approved form" },
  { key: "procedure", label: "Procedure", sub: "Clinical details" },
  { key: "anesthesia", label: "Anesthesia", sub: "Required or not" },
  { key: "education", label: "Education", sub: "Patient material" },
  { key: "review", label: "Review", sub: "Physician review" },
  { key: "send", label: "Send & Sign", sub: "Patient signing" },
];

const fallbackTemplates: ConsentTemplate[] = [
  {
    id: "IMC-CONS-CABG-2025-001",
    title: "Coronary Artery Bypass Grafting Consent",
    titleAr: "موافقة جراحة تحويل مسار الشريان التاجي",
    type: "Surgical Consent",
    department: "Cardiac Surgery",
    specialty: "Cardiothoracic Surgery",
    status: "IMC Approved",
    version: "v2.4",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-GEN-SURG-2025-014",
    title: "General Surgical Procedure Consent",
    titleAr: "موافقة إجراء جراحي عام",
    type: "Surgical Consent",
    department: "Surgery",
    specialty: "General Surgery",
    status: "IMC Approved",
    version: "v3.1",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-ANES-2025-006",
    title: "Anesthesia Consent",
    titleAr: "موافقة التخدير",
    type: "Anesthesia Consent",
    department: "Anesthesia",
    specialty: "Anesthesiology",
    status: "IMC Approved",
    version: "v2.9",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-ENDO-2025-010",
    title: "Endoscopy Procedure Consent",
    titleAr: "موافقة إجراء المنظار",
    type: "Procedure Consent",
    department: "Endoscopy",
    specialty: "Gastroenterology",
    status: "IMC Approved",
    version: "v2.1",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-RAD-2025-009",
    title: "Interventional Radiology Consent",
    titleAr: "موافقة الأشعة التداخلية",
    type: "Procedure Consent",
    department: "Radiology",
    specialty: "Interventional Radiology",
    status: "Clinical Review",
    version: "v1.8",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-ICU-2025-004",
    title: "Critical Care Treatment Consent",
    titleAr: "موافقة علاج العناية الحرجة",
    type: "Treatment Consent",
    department: "ICU",
    specialty: "Critical Care",
    status: "IMC Approved",
    version: "v2.6",
    language: "Bilingual",
  },
];

function normalizeTemplates(payload: unknown): ConsentTemplate[] {
  const source =
    Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { templates?: unknown[] })?.templates)
        ? (payload as { templates: unknown[] }).templates
        : Array.isArray((payload as { data?: unknown[] })?.data)
          ? (payload as { data: unknown[] }).data
          : [];

  return source.map((item, index) => {
    const raw = item as Partial<ConsentTemplate> & {
      templateId?: string;
      code?: string;
      titleEn?: string;
      consentType?: string;
    };

    return {
      id: raw.id || raw.templateId || raw.code || `IMC-TEMPLATE-${index + 1}`,
      title: raw.title || raw.titleEn || "Untitled Consent Template",
      titleAr: raw.titleAr || "نموذج موافقة",
      type: raw.type || raw.consentType || "Procedure Consent",
      department: raw.department || "General",
      specialty: raw.specialty || raw.department || "General",
      status: raw.status || "IMC Approved",
      version: raw.version || "v1.0",
      language: raw.language || "Bilingual",
    };
  });
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="fc-field">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Stepper({
  currentStep,
  setCurrentStep,
}: {
  currentStep: number;
  setCurrentStep: (step: number) => void;
}) {
  return (
    <nav className="fc-stepper" aria-label="Consent workflow steps">
      {steps.map((step, index) => {
        const completed = index < currentStep;
        const active = index === currentStep;

        return (
          <button
            key={step.key}
            type="button"
            className={completed ? "done" : active ? "active" : ""}
            onClick={() => setCurrentStep(index)}
          >
            <span>{completed ? <Check size={15} /> : index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.sub}</small>
          </button>
        );
      })}
    </nav>
  );
}

function TemplateSelection({
  templates,
  selectedTemplate,
  setSelectedTemplate,
}: {
  templates: ConsentTemplate[];
  selectedTemplate: ConsentTemplate;
  setSelectedTemplate: (template: ConsentTemplate) => void;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All Types");
  const [department, setDepartment] = useState("All Departments");

  const types = useMemo(() => ["All Types", ...Array.from(new Set(templates.map((item) => item.type)))], [templates]);
  const departments = useMemo(() => ["All Departments", ...Array.from(new Set(templates.map((item) => item.department)))], [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return templates.filter((template) => {
      const matchesQuery =
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.titleAr.toLowerCase().includes(q) ||
        template.id.toLowerCase().includes(q) ||
        template.department.toLowerCase().includes(q) ||
        template.specialty.toLowerCase().includes(q);

      const matchesType = type === "All Types" || template.type === type;
      const matchesDepartment = department === "All Departments" || template.department === department;

      return matchesQuery && matchesType && matchesDepartment;
    });
  }, [query, type, department, templates]);

  return (
    <div className="fc-template-step">
      <div className="fc-filter-row">
        <label className="fc-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search consent template, department, specialty, Arabic title, or ID"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")}>
              <X size={15} />
            </button>
          )}
        </label>

        <label className="fc-select">
          <Filter size={16} />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {types.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>

        <label className="fc-select">
          <Building2 size={16} />
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            {departments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
      </div>

      <div className="fc-template-list">
        {filtered.map((template) => {
          const active = template.id === selectedTemplate.id;

          return (
            <button
              key={template.id}
              type="button"
              className={active ? "fc-template-item active" : "fc-template-item"}
              onClick={() => setSelectedTemplate(template)}
            >
              <span className="fc-template-icon">
                <FileText size={21} />
              </span>

              <span className="fc-template-copy">
                <strong>{template.title}</strong>
                <em>{template.titleAr}</em>
                <small>{template.id}</small>
              </span>

              <span className="fc-template-meta">
                <b>{template.type}</b>
                <i>{template.department}</i>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PatientMode() {
  return (
    <section className="fc-patient-view">
      <div className="fc-patient-card">
        <BadgeCheck size={34} />
        <h2>Patient Consent Review</h2>
        <p>The patient receives a clean review screen for education, OTP verification, and e-signature.</p>
        <button type="button" onClick={() => window.location.assign("/sign/test/workflow")}>
          Open Patient Signing Flow
        </button>
      </div>
    </section>
  );
}

export default function FunctionalConsentIssuanceWorkflow() {
  const [mode, setMode] = useState<ConsentMode>("physician");
  const [currentStep, setCurrentStep] = useState(0);
  const [templates, setTemplates] = useState<ConsentTemplate[]>(fallbackTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplate>(fallbackTemplates[0]);
  const [templateSource, setTemplateSource] = useState<"loading" | "database" | "fallback">("loading");
  const [procedure, setProcedure] = useState("Coronary Artery Bypass Grafting (CABG)");
  const [anesthesiaRequired, setAnesthesiaRequired] = useState(true);
  const [educationReady, setEducationReady] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      const endpoints = [
        "/api/modules/informed-consents/templates",
        "/api/modules/informed-consents/library",
        "/api/modules/informed-consents/imc-library",
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          });

          if (!response.ok) continue;

          const payload = await response.json();
          const normalized = normalizeTemplates(payload);

          if (!cancelled && normalized.length > 0) {
            setTemplates(normalized);
            setSelectedTemplate(normalized[0]);
            setTemplateSource("database");
            return;
          }
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setTemplateSource("fallback");
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentKey = steps[currentStep]?.key || "patient";

  function nextStep() {
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function previousStep() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function sendToPatient() {
    window.location.assign(`/modules/informed-consents/consent-creation-workflow?templateId=${encodeURIComponent(selectedTemplate.id)}`);
  }

  return (
    <main className="fc-shell">
      <aside className="fc-sidebar">
        <div className="fc-brand">
          <ShieldCheck size={28} />
          <div>
            <strong>WathiqCare</strong>
            <span>LEGAL. CARE. TRUSTED.</span>
          </div>
        </div>

        <button type="button" className="active" onClick={() => window.location.assign("/modules/informed-consents")}>
          <ClipboardCheck size={19} />
          Create Consent
        </button>
        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/list")}>
          <FileText size={19} />
          Consent List
        </button>
        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/template-registry")}>
          <BookOpen size={19} />
          Templates
        </button>
        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/governance")}>
          <ShieldCheck size={19} />
          Governance
        </button>
        <button type="button" onClick={() => window.location.assign("/modules/informed-consents/settings-support")}>
          <Settings size={19} />
          Support
        </button>
      </aside>

      <section className="fc-main">
        <header className="fc-header">
          <button type="button" className="fc-home" onClick={() => window.location.assign("/modules")}>
            <Home size={19} />
          </button>

          <div>
            <h1>Physician Consent Issuance</h1>
            <p>Functional step-by-step workflow for creating and sending informed consents.</p>
          </div>

          <div className="fc-header-actions">
            <button type="button" className={mode === "physician" ? "active" : ""} onClick={() => setMode("physician")}>
              <Stethoscope size={16} />
              Physician
            </button>
            <button type="button" className={mode === "patient" ? "active" : ""} onClick={() => setMode("patient")}>
              <UserRound size={16} />
              Patient
            </button>
            <button type="button" onClick={() => window.location.assign("/alerts")}>
              <Bell size={17} />
            </button>
            <button type="button">
              <Globe2 size={17} />
              EN / AR
            </button>
          </div>
        </header>

        {mode === "patient" ? (
          <PatientMode />
        ) : (
          <div className="fc-workflow">
            <section className="fc-patient-strip">
              <Field label="Patient" value="Mr. Ramesh Kumar" icon={<UserRound size={19} />} />
              <Field label="MRN" value="WC-2025-001123" icon={<ClipboardCheck size={19} />} />
              <Field label="Encounter" value="OPD / Cardiac Surgery" icon={<CalendarDays size={19} />} />
              <Field label="Physician" value="Dr. Arjun Mehta" icon={<Stethoscope size={19} />} />
              <Field label="Template Source" value={templateSource === "database" ? "Database Connected" : templateSource === "loading" ? "Loading" : "Fallback"} icon={<BadgeCheck size={19} />} />
            </section>

            <Stepper currentStep={currentStep} setCurrentStep={setCurrentStep} />

            <div className="fc-body">
              <section className="fc-step-panel">
                {currentKey === "patient" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Patient & Encounter</h2>
                      <p>Confirm patient identity and encounter before creating the consent.</p>
                    </div>

                    <div className="fc-form-grid">
                      <Field label="Patient Name" value="Mr. Ramesh Kumar" icon={<UserRound size={19} />} />
                      <Field label="MRN / UHID" value="WC-2025-001123" icon={<ClipboardCheck size={19} />} />
                      <Field label="Age / Gender" value="52 / Male" icon={<Users size={19} />} />
                      <Field label="Encounter Type" value="OPD Cardiac Surgery" icon={<CalendarDays size={19} />} />
                    </div>
                  </>
                )}

                {currentKey === "category" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Consent Category</h2>
                      <p>Select the clinical department and consent type.</p>
                    </div>

                    <div className="fc-category-grid">
                      {["Surgical Consent", "Anesthesia Consent", "Procedure Consent", "Treatment Consent", "Research Consent", "Critical Care Consent"].map((item) => (
                        <button key={item} type="button" className={selectedTemplate.type === item ? "active" : ""}>
                          <FileCheck2 size={21} />
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {currentKey === "template" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Approved Template Selection</h2>
                      <p>Search and select the correct consent document from approved templates.</p>
                    </div>

                    <TemplateSelection
                      templates={templates}
                      selectedTemplate={selectedTemplate}
                      setSelectedTemplate={setSelectedTemplate}
                    />
                  </>
                )}

                {currentKey === "procedure" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Procedure Details</h2>
                      <p>Enter or confirm the procedure name and clinical summary.</p>
                    </div>

                    <label className="fc-large-input">
                      <span>Procedure Name</span>
                      <input value={procedure} onChange={(event) => setProcedure(event.target.value)} />
                    </label>

                    <label className="fc-large-input">
                      <span>Clinical Note</span>
                      <textarea defaultValue="The patient was informed about the nature, benefits, risks, alternatives, and potential complications of the proposed procedure." />
                    </label>
                  </>
                )}

                {currentKey === "anesthesia" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Anesthesia Decision</h2>
                      <p>Specify whether anesthesia is applicable and trigger the anesthesiologist workflow when required.</p>
                    </div>

                    <div className="fc-choice-row">
                      <button type="button" className={anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(true)}>
                        <Syringe size={22} />
                        Anesthesia Required
                      </button>
                      <button type="button" className={!anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(false)}>
                        <CheckCircle2 size={22} />
                        Not Applicable
                      </button>
                    </div>

                    {anesthesiaRequired && (
                      <div className="fc-alert soft">
                        <AlertCircle size={18} />
                        Anesthesia section will be sent to the anesthesiologist for completion in the same consent record.
                      </div>
                    )}
                  </>
                )}

                {currentKey === "education" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Patient Education</h2>
                      <p>Attach the required education materials before sending the consent.</p>
                    </div>

                    <div className="fc-checklist">
                      {[
                        "Procedure explanation",
                        "Risks and benefits",
                        "Alternatives",
                        "Post-procedure care",
                        "Patient questions",
                      ].map((item) => (
                        <button key={item} type="button" className="done" onClick={() => setEducationReady(true)}>
                          <CheckCircle2 size={20} />
                          {item}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {currentKey === "review" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Physician Review</h2>
                      <p>Review the selected template, procedure, anesthesia status, and education readiness.</p>
                    </div>

                    <div className="fc-review-card">
                      <h3>Consent Summary</h3>
                      <Field label="Template" value={selectedTemplate.title} icon={<FileText size={19} />} />
                      <Field label="Procedure" value={procedure} icon={<HeartPulse size={19} />} />
                      <Field label="Anesthesia" value={anesthesiaRequired ? "Required" : "Not Applicable"} icon={<Syringe size={19} />} />
                      <Field label="Education" value={educationReady ? "Completed" : "Pending"} icon={<BookOpen size={19} />} />
                    </div>
                  </>
                )}

                {currentKey === "send" && (
                  <>
                    <div className="fc-panel-title">
                      <h2>Send to Patient</h2>
                      <p>Send the consent to the patient for OTP verification and e-signature.</p>
                    </div>

                    <div className="fc-send-grid">
                      <label>
                        <Phone size={18} />
                        <input defaultValue="+966 5X XXX XXXX" />
                      </label>
                      <label>
                        <Mail size={18} />
                        <input defaultValue="patient@example.com" />
                      </label>
                    </div>

                    <button type="button" className="fc-primary wide" onClick={sendToPatient}>
                      <Send size={18} />
                      Send Consent for Patient Signature
                    </button>
                  </>
                )}
              </section>

              <aside className="fc-summary">
                <h2>Issuance Summary</h2>

                <Field label="Patient" value="Mr. Ramesh Kumar" icon={<UserRound size={18} />} />
                <Field label="Template" value={selectedTemplate.title} icon={<FileText size={18} />} />
                <Field label="Department" value={selectedTemplate.department} icon={<Building2 size={18} />} />
                <Field label="Procedure" value={procedure} icon={<HeartPulse size={18} />} />
                <Field label="Anesthesia" value={anesthesiaRequired ? "Required" : "Not Applicable"} icon={<Syringe size={18} />} />

                <div className="fc-summary-actions">
                  <button type="button" onClick={previousStep} disabled={currentStep === 0}>
                    <ArrowLeft size={16} />
                    Back
                  </button>
                  {currentStep < steps.length - 1 ? (
                    <button type="button" className="fc-primary" onClick={nextStep}>
                      Continue
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button type="button" className="fc-primary" onClick={sendToPatient}>
                      Send
                      <Send size={16} />
                    </button>
                  )}
                </div>
              </aside>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
