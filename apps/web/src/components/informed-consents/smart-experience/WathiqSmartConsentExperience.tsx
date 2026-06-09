"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  HeartPulse,
  Home,
  Languages,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  UserRound,
} from "lucide-react";

type StepKey = "patient" | "template" | "procedure" | "anesthesia" | "education" | "review" | "send";

type TemplateItem = {
  id: string;
  title: string;
  titleAr: string;
  department: string;
  type: string;
};

const steps: { key: StepKey; label: string }[] = [
  { key: "patient", label: "Patient" },
  { key: "template", label: "Template" },
  { key: "procedure", label: "Procedure" },
  { key: "anesthesia", label: "Anesthesia" },
  { key: "education", label: "Education" },
  { key: "review", label: "Review" },
  { key: "send", label: "Send" },
];

const templates: TemplateItem[] = [
  {
    id: "IMC-CONS-CABG-2025-001",
    title: "Coronary Artery Bypass Grafting Consent",
    titleAr: "موافقة جراحة تحويل مسار الشريان التاجي",
    department: "Cardiac Surgery",
    type: "Surgical Consent",
  },
  {
    id: "IMC-CONS-ANES-2025-006",
    title: "Anesthesia Consent",
    titleAr: "موافقة التخدير",
    department: "Anesthesia",
    type: "Anesthesia Consent",
  },
  {
    id: "IMC-CONS-ENDO-2025-010",
    title: "Endoscopy Procedure Consent",
    titleAr: "موافقة إجراء المنظار",
    department: "Endoscopy",
    type: "Procedure Consent",
  },
  {
    id: "IMC-CONS-ICU-2025-004",
    title: "Critical Care Treatment Consent",
    titleAr: "موافقة علاج العناية الحرجة",
    department: "ICU",
    type: "Treatment Consent",
  },
];

function openRoute(route: string) {
  window.location.assign(route);
}

export default function WathiqSmartConsentExperience() {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem>(templates[0]);
  const [query, setQuery] = useState("");
  const [procedure, setProcedure] = useState("Coronary Artery Bypass Grafting (CABG)");
  const [anesthesiaRequired, setAnesthesiaRequired] = useState(true);
  const [educationConfirmed, setEducationConfirmed] = useState(false);
  const [mobile, setMobile] = useState("+966 5X XXX XXXX");
  const [email, setEmail] = useState("patient@example.com");

  const currentStep = steps[activeStep]?.key || "patient";

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();

    return templates.filter((template) => {
      return (
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.titleAr.toLowerCase().includes(q) ||
        template.department.toLowerCase().includes(q) ||
        template.id.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const readiness = useMemo(() => {
    let score = 55;
    if (selectedTemplate) score += 15;
    if (procedure.trim().length > 5) score += 10;
    if (educationConfirmed) score += 10;
    if (mobile || email) score += 10;
    return Math.min(score, 100);
  }, [selectedTemplate, procedure, educationConfirmed, mobile, email]);

  function next() {
    setActiveStep((step) => Math.min(step + 1, steps.length - 1));
  }

  function back() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function sendConsent() {
    const params = new URLSearchParams({
      templateId: selectedTemplate.id,
      procedure,
      anesthesiaRequired: String(anesthesiaRequired),
      mobile,
      email,
    });

    openRoute(`/modules/informed-consents/consent-creation-workflow?${params.toString()}`);
  }

  return (
    <main className="care-shell">
      <aside className="care-sidebar">
        <div className="care-brand">
          <ShieldCheck size={30} />
          <div>
            <strong>WathiqCare</strong>
            <span>Smart Consent Portal</span>
          </div>
        </div>

        <button className="active" type="button" onClick={() => openRoute("/modules/informed-consents")}>
          <ClipboardCheck size={19} />
          <span>Create Consent</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
          <FileText size={19} />
          <span>Consent Records</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/template-registry")}>
          <BookOpen size={19} />
          <span>Templates</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/governance")}>
          <ShieldCheck size={19} />
          <span>Governance</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/settings-support")}>
          <MessageSquare size={19} />
          <span>Support</span>
        </button>
      </aside>

      <section className="care-main">
        <header className="care-topbar">
          <button type="button" className="care-icon" onClick={() => openRoute("/modules")}>
            <Home size={19} />
          </button>

          <div>
            <strong>WathiqCare Smart Consent</strong>
            <span>Healthcare-grade consent journey with clinical and legal intelligence</span>
          </div>

          <div className="care-top-actions">
            <button type="button">
              <Languages size={16} />
              EN / AR
            </button>
            <button type="button" onClick={() => openRoute("/alerts")}>
              <Bell size={16} />
              Alerts
            </button>
          </div>
        </header>

        <section className="care-hero">
          <div>
            <span className="care-eyebrow">Today’s Clinical Consent</span>
            <h1>Issue the right consent, faster and safer.</h1>
            <p>
              A focused care portal experience for physicians: select patient, choose approved template,
              confirm procedure, manage anesthesia, educate the patient, and send for signature.
            </p>
          </div>

          <div className="care-hero-card">
            <Sparkles size={22} />
            <strong>{readiness}%</strong>
            <span>Consent readiness</span>
          </div>
        </section>

        <section className="care-services">
          <button type="button" className="active" onClick={() => setActiveStep(0)}>
            <FileCheck2 size={24} />
            <strong>New Consent</strong>
            <span>Create and send consent</span>
          </button>

          <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
            <CalendarDays size={24} />
            <strong>Pending</strong>
            <span>Follow active consents</span>
          </button>

          <button type="button" onClick={() => openRoute("/modules/informed-consents/template-registry")}>
            <BookOpen size={24} />
            <strong>Approved Forms</strong>
            <span>Template library</span>
          </button>

          <button type="button" onClick={() => openRoute("/modules/informed-consents/governance")}>
            <ShieldCheck size={24} />
            <strong>Compliance</strong>
            <span>Audit and legal checks</span>
          </button>
        </section>

        <section className="care-workspace">
          <div className="care-left">
            <nav className="care-stepper">
              {steps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  className={index < activeStep ? "done" : index === activeStep ? "active" : ""}
                  onClick={() => setActiveStep(index)}
                >
                  <b>{index < activeStep ? <Check size={14} /> : index + 1}</b>
                  <span>{step.label}</span>
                </button>
              ))}
            </nav>

            <section className="care-panel">
              {currentStep === "patient" && (
                <>
                  <div className="care-panel-title">
                    <h2>Patient Context</h2>
                    <p>Confirm the patient and encounter before starting the consent.</p>
                  </div>

                  <div className="care-info-grid">
                    <div>
                      <UserRound size={20} />
                      <small>Patient</small>
                      <strong>Mr. Ramesh Kumar</strong>
                    </div>
                    <div>
                      <ClipboardCheck size={20} />
                      <small>MRN</small>
                      <strong>WC-2025-001123</strong>
                    </div>
                    <div>
                      <CalendarDays size={20} />
                      <small>Encounter</small>
                      <strong>OPD / Cardiac Surgery</strong>
                    </div>
                    <div>
                      <Stethoscope size={20} />
                      <small>Physician</small>
                      <strong>Dr. Arjun Mehta</strong>
                    </div>
                  </div>
                </>
              )}

              {currentStep === "template" && (
                <>
                  <div className="care-panel-title">
                    <h2>Approved Consent Template</h2>
                    <p>Search and select the approved template. The selected form drives the rest of the workflow.</p>
                  </div>

                  <label className="care-search">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search template, department, Arabic title, or ID"
                    />
                  </label>

                  <div className="care-template-list">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className={template.id === selectedTemplate.id ? "active" : ""}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <FileText size={21} />
                        <span>
                          <strong>{template.title}</strong>
                          <em>{template.titleAr}</em>
                          <small>{template.id}</small>
                        </span>
                        <i>{template.department}</i>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {currentStep === "procedure" && (
                <>
                  <div className="care-panel-title">
                    <h2>Procedure Details</h2>
                    <p>Confirm the clinical procedure and the essential explanation.</p>
                  </div>

                  <label className="care-input">
                    <span>Procedure Name</span>
                    <input value={procedure} onChange={(event) => setProcedure(event.target.value)} />
                  </label>

                  <label className="care-input">
                    <span>Clinical Note</span>
                    <textarea defaultValue="The patient was informed about the nature, benefits, material risks, alternatives, and possible complications of the proposed procedure." />
                  </label>
                </>
              )}

              {currentStep === "anesthesia" && (
                <>
                  <div className="care-panel-title">
                    <h2>Anesthesia Decision</h2>
                    <p>Decide whether anesthesia is applicable. If required, anesthesiologist review is triggered.</p>
                  </div>

                  <div className="care-choice">
                    <button type="button" className={anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(true)}>
                      <Syringe size={23} />
                      <strong>Anesthesia Required</strong>
                      <span>Send section to anesthesiologist</span>
                    </button>

                    <button type="button" className={!anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(false)}>
                      <BadgeCheck size={23} />
                      <strong>Not Applicable</strong>
                      <span>No anesthesia workflow needed</span>
                    </button>
                  </div>
                </>
              )}

              {currentStep === "education" && (
                <>
                  <div className="care-panel-title">
                    <h2>Patient Education</h2>
                    <p>Confirm the education content before patient signature.</p>
                  </div>

                  <div className="care-education">
                    {["Procedure explanation", "Risks and benefits", "Alternatives", "Post-procedure care"].map((item) => (
                      <div key={item}>
                        <BadgeCheck size={18} />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <label className="care-confirm">
                    <input
                      type="checkbox"
                      checked={educationConfirmed}
                      onChange={(event) => setEducationConfirmed(event.target.checked)}
                    />
                    <span>I confirm patient education is ready.</span>
                  </label>
                </>
              )}

              {currentStep === "review" && (
                <>
                  <div className="care-panel-title">
                    <h2>Smart Review</h2>
                    <p>Review clinical and legal readiness before sending.</p>
                  </div>

                  <div className="care-review">
                    <div>
                      <strong>{readiness}%</strong>
                      <span>Readiness Score</span>
                    </div>
                    <ul>
                      <li>Template selected: {selectedTemplate.title}</li>
                      <li>Procedure: {procedure}</li>
                      <li>Anesthesia: {anesthesiaRequired ? "Required" : "Not Applicable"}</li>
                      <li>Education: {educationConfirmed ? "Confirmed" : "Pending"}</li>
                    </ul>
                  </div>
                </>
              )}

              {currentStep === "send" && (
                <>
                  <div className="care-panel-title">
                    <h2>Send to Patient</h2>
                    <p>The patient will receive OTP verification and electronic signature link.</p>
                  </div>

                  <div className="care-send-grid">
                    <label>
                      <Phone size={18} />
                      <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
                    </label>
                    <label>
                      <Mail size={18} />
                      <input value={email} onChange={(event) => setEmail(event.target.value)} />
                    </label>
                  </div>

                  <button type="button" className="care-primary wide" onClick={sendConsent}>
                    <Send size={18} />
                    Send Consent for Signature
                  </button>

                  <div className="care-security">
                    <Lock size={17} />
                    OTP, QR verification, audit trail, and patient copy will be generated.
                  </div>
                </>
              )}
            </section>
          </div>

          <aside className="care-summary">
            <div className="care-summary-head">
              <HeartPulse size={23} />
              <div>
                <strong>Consent Summary</strong>
                <span>Live journey context</span>
              </div>
            </div>

            <dl>
              <div>
                <dt>Patient</dt>
                <dd>Mr. Ramesh Kumar</dd>
              </div>
              <div>
                <dt>Template</dt>
                <dd>{selectedTemplate.title}</dd>
              </div>
              <div>
                <dt>Procedure</dt>
                <dd>{procedure}</dd>
              </div>
              <div>
                <dt>Anesthesia</dt>
                <dd>{anesthesiaRequired ? "Required" : "Not Applicable"}</dd>
              </div>
              <div>
                <dt>Education</dt>
                <dd>{educationConfirmed ? "Confirmed" : "Pending"}</dd>
              </div>
            </dl>

            <div className="care-ai-note">
              <Sparkles size={18} />
              <span>
                AI guidance appears only when it supports a clinical or legal decision.
              </span>
            </div>

            <div className="care-actions">
              <button type="button" onClick={back} disabled={activeStep === 0}>
                Back
              </button>
              {activeStep < steps.length - 1 ? (
                <button type="button" className="care-primary" onClick={next}>
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" className="care-primary" onClick={sendConsent}>
                  Send
                  <Send size={16} />
                </button>
              )}
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
