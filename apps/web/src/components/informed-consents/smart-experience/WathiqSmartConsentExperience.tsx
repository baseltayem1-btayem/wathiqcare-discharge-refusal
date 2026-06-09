"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
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
  Languages,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  UserRound,
  Users,
  X,
} from "lucide-react";

type StepKey =
  | "patient"
  | "encounter"
  | "template"
  | "procedure"
  | "anesthesia"
  | "education"
  | "review"
  | "send";

type TemplateItem = {
  id: string;
  title: string;
  titleAr: string;
  type: string;
  department: string;
  specialty: string;
  version: string;
  status: string;
  language: string;
};

type PatientItem = {
  name: string;
  mrn: string;
  ageGender: string;
  mobile: string;
  email: string;
  encounter: string;
  department: string;
  physician: string;
};

const steps: { key: StepKey; label: string; hint: string }[] = [
  { key: "patient", label: "Patient", hint: "Identity" },
  { key: "encounter", label: "Encounter", hint: "Visit" },
  { key: "template", label: "Template", hint: "Approved form" },
  { key: "procedure", label: "Procedure", hint: "Clinical details" },
  { key: "anesthesia", label: "Anesthesia", hint: "Decision" },
  { key: "education", label: "Education", hint: "Material" },
  { key: "review", label: "Review", hint: "Readiness" },
  { key: "send", label: "Send", hint: "Signature" },
];

const fallbackPatient: PatientItem = {
  name: "Mr. Ramesh Kumar",
  mrn: "WC-2025-001123",
  ageGender: "52 / Male",
  mobile: "+966 5X XXX XXXX",
  email: "patient@example.com",
  encounter: "OPD / Cardiac Surgery",
  department: "Cardiac Surgery",
  physician: "Dr. Arjun Mehta",
};

const fallbackTemplates: TemplateItem[] = [
  {
    id: "IMC-CONS-CABG-2025-001",
    title: "Coronary Artery Bypass Grafting Consent",
    titleAr: "موافقة جراحة تحويل مسار الشريان التاجي",
    type: "Surgical Consent",
    department: "Cardiac Surgery",
    specialty: "Cardiothoracic Surgery",
    version: "v2.4",
    status: "IMC Approved",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-GEN-SURG-2025-014",
    title: "General Surgical Procedure Consent",
    titleAr: "موافقة إجراء جراحي عام",
    type: "Surgical Consent",
    department: "Surgery",
    specialty: "General Surgery",
    version: "v3.1",
    status: "IMC Approved",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-ANES-2025-006",
    title: "Anesthesia Consent",
    titleAr: "موافقة التخدير",
    type: "Anesthesia Consent",
    department: "Anesthesia",
    specialty: "Anesthesiology",
    version: "v2.9",
    status: "IMC Approved",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-ENDO-2025-010",
    title: "Endoscopy Procedure Consent",
    titleAr: "موافقة إجراء المنظار",
    type: "Procedure Consent",
    department: "Endoscopy",
    specialty: "Gastroenterology",
    version: "v2.1",
    status: "IMC Approved",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-RAD-2025-009",
    title: "Interventional Radiology Consent",
    titleAr: "موافقة الأشعة التداخلية",
    type: "Procedure Consent",
    department: "Radiology",
    specialty: "Interventional Radiology",
    version: "v1.8",
    status: "Clinical Review",
    language: "Bilingual",
  },
  {
    id: "IMC-CONS-ICU-2025-004",
    title: "Critical Care Treatment Consent",
    titleAr: "موافقة علاج العناية الحرجة",
    type: "Treatment Consent",
    department: "ICU",
    specialty: "Critical Care",
    version: "v2.6",
    status: "IMC Approved",
    language: "Bilingual",
  },
];

function normalizeTemplates(payload: unknown): TemplateItem[] {
  const source =
    Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { templates?: unknown[] })?.templates)
        ? (payload as { templates: unknown[] }).templates
        : Array.isArray((payload as { data?: unknown[] })?.data)
          ? (payload as { data: unknown[] }).data
          : [];

  return source
    .map((item, index) => {
      const raw = item as Partial<TemplateItem> & {
        templateId?: string;
        code?: string;
        titleEn?: string;
        consentType?: string;
      };

      return {
        id: raw.id || raw.templateId || raw.code || `WC-TEMPLATE-${index + 1}`,
        title: raw.title || raw.titleEn || "Untitled Consent Template",
        titleAr: raw.titleAr || "نموذج موافقة",
        type: raw.type || raw.consentType || "Procedure Consent",
        department: raw.department || "General",
        specialty: raw.specialty || raw.department || "General",
        version: raw.version || "v1.0",
        status: raw.status || "IMC Approved",
        language: raw.language || "Bilingual",
      };
    })
    .filter((item) => item.title && item.id);
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="sx-field">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SmartSuggestion({
  title,
  text,
  severity = "normal",
}: {
  title: string;
  text: string;
  severity?: "normal" | "warning" | "success";
}) {
  return (
    <article className={`sx-ai-card ${severity}`}>
      <Sparkles size={18} />
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </article>
  );
}

export default function WathiqSmartConsentExperience() {
  const [activeStep, setActiveStep] = useState(0);
  const [patient] = useState<PatientItem>(fallbackPatient);
  const [templates, setTemplates] = useState<TemplateItem[]>(fallbackTemplates);
  const [templateSource, setTemplateSource] = useState<"loading" | "database" | "fallback">("loading");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(fallbackTemplates[0]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All Types");
  const [department, setDepartment] = useState("All Departments");
  const [procedure, setProcedure] = useState("Coronary Artery Bypass Grafting (CABG)");
  const [anesthesiaRequired, setAnesthesiaRequired] = useState(true);
  const [educationConfirmed, setEducationConfirmed] = useState(false);
  const [language, setLanguage] = useState<"English" | "Arabic" | "Bilingual">("Bilingual");
  const [recipientMobile, setRecipientMobile] = useState(patient.mobile);
  const [recipientEmail, setRecipientEmail] = useState(patient.email);

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
        setTemplates(fallbackTemplates);
        setSelectedTemplate(fallbackTemplates[0]);
        setTemplateSource("fallback");
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  const types = useMemo(() => ["All Types", ...Array.from(new Set(templates.map((item) => item.type)))], [templates]);
  const departments = useMemo(() => ["All Departments", ...Array.from(new Set(templates.map((item) => item.department)))], [templates]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();

    return templates.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        item.title.toLowerCase().includes(q) ||
        item.titleAr.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q) ||
        item.specialty.toLowerCase().includes(q);

      const matchesType = type === "All Types" || item.type === type;
      const matchesDepartment = department === "All Departments" || item.department === department;

      return matchesSearch && matchesType && matchesDepartment;
    });
  }, [templates, search, type, department]);

  const readiness = useMemo(() => {
    let score = 40;

    if (patient.mrn) score += 10;
    if (selectedTemplate.id) score += 15;
    if (procedure.trim().length > 5) score += 10;
    if (anesthesiaRequired || anesthesiaRequired === false) score += 10;
    if (educationConfirmed) score += 10;
    if (recipientMobile || recipientEmail) score += 5;

    return Math.min(score, 100);
  }, [patient.mrn, selectedTemplate.id, procedure, anesthesiaRequired, educationConfirmed, recipientMobile, recipientEmail]);

  const currentKey = steps[activeStep]?.key || "patient";

  function goNext() {
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function openRoute(route: string) {
    window.location.assign(route);
  }

  function sendConsent() {
    const params = new URLSearchParams({
      mrn: patient.mrn,
      templateId: selectedTemplate.id,
      procedure,
      anesthesiaRequired: String(anesthesiaRequired),
      language,
      mobile: recipientMobile,
      email: recipientEmail,
    });

    window.location.assign(`/modules/informed-consents/consent-creation-workflow?${params.toString()}`);
  }

  return (
    <main className="sx-shell">
      <aside className="sx-sidebar">
        <div className="sx-brand">
          <ShieldCheck size={29} />
          <div>
            <strong>WathiqCare</strong>
            <span>LEGAL. CARE. TRUSTED.</span>
          </div>
        </div>

        <button className="active" type="button" onClick={() => openRoute("/modules/informed-consents")}>
          <ClipboardCheck size={18} />
          <span>Create Consent</span>
        </button>
        <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
          <FileText size={18} />
          <span>Consent Records</span>
        </button>
        <button type="button" onClick={() => openRoute("/modules/informed-consents/template-registry")}>
          <BookOpen size={18} />
          <span>Templates</span>
        </button>
        <button type="button" onClick={() => openRoute("/modules/informed-consents/governance")}>
          <ShieldCheck size={18} />
          <span>Governance</span>
        </button>
        <button type="button" onClick={() => openRoute("/modules/informed-consents/settings-support")}>
          <Settings size={18} />
          <span>Support</span>
        </button>

        <div className="sx-sidebar-help">
          <MessageSquare size={20} />
          <strong>Need support?</strong>
          <span>Clinical-legal support is available.</span>
          <button type="button" onClick={() => openRoute("/modules/informed-consents/settings-support")}>
            Contact Support
          </button>
        </div>
      </aside>

      <section className="sx-main">
        <header className="sx-header">
          <button type="button" className="sx-icon-button" onClick={() => openRoute("/modules")}>
            <Home size={19} />
          </button>

          <div className="sx-header-title">
            <strong>Smart Consent Experience</strong>
            <span>Simple healthcare workflow with legal-medical intelligence</span>
          </div>

          <div className="sx-header-actions">
            <button type="button" onClick={() => openRoute("/alerts")}>
              <Bell size={16} />
              Alerts
            </button>
            <button type="button">
              <Globe2 size={16} />
              EN / AR
            </button>
            <button type="button" onClick={() => openRoute("/doctor/dashboard")}>
              <Stethoscope size={16} />
              Physician
            </button>
          </div>
        </header>

        <section className="sx-patient-context">
          <Field label="Patient" value={patient.name} icon={<UserRound size={18} />} />
          <Field label="MRN" value={patient.mrn} icon={<ClipboardCheck size={18} />} />
          <Field label="Encounter" value={patient.encounter} icon={<CalendarDays size={18} />} />
          <Field label="Department" value={patient.department} icon={<Building2 size={18} />} />
          <Field label="Physician" value={patient.physician} icon={<Stethoscope size={18} />} />
        </section>

        <nav className="sx-stepper" aria-label="Consent issuance steps">
          {steps.map((step, index) => {
            const done = index < activeStep;
            const active = index === activeStep;

            return (
              <button
                key={step.key}
                type="button"
                className={done ? "done" : active ? "active" : ""}
                onClick={() => setActiveStep(index)}
              >
                <b>{done ? <Check size={14} /> : index + 1}</b>
                <strong>{step.label}</strong>
                <span>{step.hint}</span>
              </button>
            );
          })}
        </nav>

        <div className="sx-workspace">
          <section className="sx-stage">
            {currentKey === "patient" && (
              <>
                <div className="sx-stage-title">
                  <h1>Confirm Patient Identity</h1>
                  <p>Confirm the patient before issuing the consent. This keeps the workflow focused and reduces errors.</p>
                </div>

                <div className="sx-card-grid two">
                  <Field label="Patient Name" value={patient.name} icon={<UserRound size={18} />} />
                  <Field label="Age / Gender" value={patient.ageGender} icon={<Users size={18} />} />
                  <Field label="Mobile" value={patient.mobile} icon={<Phone size={18} />} />
                  <Field label="Email" value={patient.email} icon={<Mail size={18} />} />
                </div>

                <SmartSuggestion
                  severity="success"
                  title="Identity matched"
                  text="Patient context is ready. Continue to encounter confirmation."
                />
              </>
            )}

            {currentKey === "encounter" && (
              <>
                <div className="sx-stage-title">
                  <h1>Select Encounter</h1>
                  <p>Attach this consent to the correct visit or clinical episode.</p>
                </div>

                <div className="sx-selection-list">
                  {["OPD / Cardiac Surgery", "Inpatient / Cardiac Ward", "Day Surgery", "Emergency Visit"].map((item) => (
                    <button key={item} type="button" className={item === patient.encounter ? "active" : ""}>
                      <CalendarDays size={19} />
                      <span>{item}</span>
                      {item === patient.encounter && <CheckCircle2 size={18} />}
                    </button>
                  ))}
                </div>

                <SmartSuggestion
                  title="Smart recommendation"
                  text="The selected encounter is aligned with Cardiac Surgery and CABG-related consent templates."
                />
              </>
            )}

            {currentKey === "template" && (
              <>
                <div className="sx-stage-title compact">
                  <h1>Select Approved Template</h1>
                  <p>Search from approved forms. The system will prioritize templates aligned with the department and procedure.</p>
                </div>

                <div className="sx-filter-row">
                  <label className="sx-search">
                    <Search size={17} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by template, Arabic title, department, specialty, or ID"
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch("")}>
                        <X size={14} />
                      </button>
                    )}
                  </label>

                  <label className="sx-select">
                    <Filter size={16} />
                    <select value={type} onChange={(event) => setType(event.target.value)}>
                      {types.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </label>

                  <label className="sx-select">
                    <Building2 size={16} />
                    <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                      {departments.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </label>
                </div>

                <div className="sx-template-grid">
                  {filteredTemplates.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={item.id === selectedTemplate.id ? "active" : ""}
                      onClick={() => setSelectedTemplate(item)}
                    >
                      <FileText size={20} />
                      <span>
                        <strong>{item.title}</strong>
                        <em>{item.titleAr}</em>
                        <small>{item.id}</small>
                      </span>
                      <i>{item.department}</i>
                    </button>
                  ))}
                </div>

                <SmartSuggestion
                  severity={templateSource === "database" ? "success" : "warning"}
                  title={templateSource === "database" ? "Database templates loaded" : templateSource === "loading" ? "Loading templates" : "Fallback mode active"}
                  text={templateSource === "database" ? "Templates are loaded from the backend." : "The workflow is using safe fallback templates until backend data is available."}
                />
              </>
            )}

            {currentKey === "procedure" && (
              <>
                <div className="sx-stage-title">
                  <h1>Procedure Details</h1>
                  <p>Confirm the procedure name and clinical note before review.</p>
                </div>

                <label className="sx-input-block">
                  <span>Procedure Name</span>
                  <input value={procedure} onChange={(event) => setProcedure(event.target.value)} />
                </label>

                <label className="sx-input-block">
                  <span>Clinical Note</span>
                  <textarea defaultValue="The patient was informed about the nature of the proposed procedure, benefits, alternatives, material risks, and possible complications." />
                </label>

                <SmartSuggestion
                  title="Clinical intelligence"
                  text="CABG usually requires anesthesia review and clear explanation of bleeding, infection, stroke, heart attack, and mortality risks."
                />
              </>
            )}

            {currentKey === "anesthesia" && (
              <>
                <div className="sx-stage-title">
                  <h1>Anesthesia Decision</h1>
                  <p>Determine if anesthesia applies. If required, the anesthesiologist section will be triggered within the same consent.</p>
                </div>

                <div className="sx-choice-row">
                  <button type="button" className={anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(true)}>
                    <Syringe size={22} />
                    <span>
                      <strong>Anesthesia Required</strong>
                      <small>Trigger anesthesiologist workflow</small>
                    </span>
                  </button>

                  <button type="button" className={!anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(false)}>
                    <CheckCircle2 size={22} />
                    <span>
                      <strong>Not Applicable</strong>
                      <small>No anesthesia workflow needed</small>
                    </span>
                  </button>
                </div>

                {anesthesiaRequired && (
                  <SmartSuggestion
                    severity="warning"
                    title="Anesthesia workflow required"
                    text="The consent should not be sent until the anesthesia section is completed or acknowledged."
                  />
                )}
              </>
            )}

            {currentKey === "education" && (
              <>
                <div className="sx-stage-title">
                  <h1>Patient Education</h1>
                  <p>Confirm that education materials are attached and understandable for the patient.</p>
                </div>

                <div className="sx-education-list">
                  {["Procedure explanation", "Risks and benefits", "Available alternatives", "Post-procedure care", "Patient questions"].map((item) => (
                    <button key={item} type="button" className="done">
                      <CheckCircle2 size={18} />
                      {item}
                    </button>
                  ))}
                </div>

                <label className="sx-check-confirm">
                  <input
                    type="checkbox"
                    checked={educationConfirmed}
                    onChange={(event) => setEducationConfirmed(event.target.checked)}
                  />
                  <span>I confirm that the required patient education material is ready.</span>
                </label>
              </>
            )}

            {currentKey === "review" && (
              <>
                <div className="sx-stage-title">
                  <h1>Physician Review</h1>
                  <p>Review consent readiness before sending it to the patient.</p>
                </div>

                <div className="sx-review-layout">
                  <div className="sx-readiness">
                    <strong>{readiness}%</strong>
                    <span>Readiness Score</span>
                    <i><b style={{ width: `${readiness}%` }} /></i>
                  </div>

                  <div className="sx-review-list">
                    <Field label="Template" value={selectedTemplate.title} icon={<FileText size={18} />} />
                    <Field label="Procedure" value={procedure} icon={<HeartPulse size={18} />} />
                    <Field label="Anesthesia" value={anesthesiaRequired ? "Required" : "Not Applicable"} icon={<Syringe size={18} />} />
                    <Field label="Education" value={educationConfirmed ? "Confirmed" : "Pending"} icon={<BookOpen size={18} />} />
                  </div>
                </div>

                {readiness < 90 && (
                  <SmartSuggestion
                    severity="warning"
                    title="Readiness incomplete"
                    text="Complete education confirmation and recipient details before sending."
                  />
                )}
              </>
            )}

            {currentKey === "send" && (
              <>
                <div className="sx-stage-title">
                  <h1>Send to Patient</h1>
                  <p>The patient will receive the consent for OTP verification and electronic signature.</p>
                </div>

                <div className="sx-send-grid">
                  <label>
                    <Phone size={17} />
                    <input value={recipientMobile} onChange={(event) => setRecipientMobile(event.target.value)} />
                  </label>

                  <label>
                    <Mail size={17} />
                    <input value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} />
                  </label>

                  <label>
                    <Languages size={17} />
                    <select value={language} onChange={(event) => setLanguage(event.target.value as "English" | "Arabic" | "Bilingual")}>
                      <option>English</option>
                      <option>Arabic</option>
                      <option>Bilingual</option>
                    </select>
                  </label>
                </div>

                <button type="button" className="sx-primary wide" onClick={sendConsent}>
                  <Send size={18} />
                  Send Consent for Signature
                </button>

                <div className="sx-security-note">
                  <Lock size={17} />
                  OTP, audit trail, QR verification, and patient copy will be generated in the signing flow.
                </div>
              </>
            )}
          </section>

          <aside className="sx-summary">
            <div className="sx-summary-head">
              <BadgeCheck size={22} />
              <div>
                <strong>Consent Summary</strong>
                <span>Live operational context</span>
              </div>
            </div>

            <Field label="Patient" value={patient.name} icon={<UserRound size={17} />} />
            <Field label="Template" value={selectedTemplate.title} icon={<FileText size={17} />} />
            <Field label="Procedure" value={procedure} icon={<HeartPulse size={17} />} />
            <Field label="Anesthesia" value={anesthesiaRequired ? "Required" : "Not Applicable"} icon={<Syringe size={17} />} />
            <Field label="Education" value={educationConfirmed ? "Confirmed" : "Pending"} icon={<BookOpen size={17} />} />

            <div className="sx-summary-alert">
              {readiness >= 90 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{readiness >= 90 ? "Ready to send" : "Pending completion"}</span>
            </div>

            <div className="sx-summary-actions">
              <button type="button" onClick={goBack} disabled={activeStep === 0}>
                <ArrowLeft size={16} />
                Back
              </button>

              {activeStep < steps.length - 1 ? (
                <button type="button" className="sx-primary" onClick={goNext}>
                  Continue
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button type="button" className="sx-primary" onClick={sendConsent}>
                  Send
                  <Send size={16} />
                </button>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
