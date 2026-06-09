"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  FileText,
  HeartPulse,
  Home,
  Languages,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  UserRound,
  UsersRound,
} from "lucide-react";

type StepKey = "patient" | "template" | "procedure" | "anesthesia" | "education" | "review" | "send";

type ConsentTemplate = {
  id: string;
  title: string;
  titleAr: string;
  department: string;
  type: string;
};

const journeySteps: { key: StepKey; label: string; title: string }[] = [
  { key: "patient", label: "Patient", title: "Patient Context" },
  { key: "template", label: "Template", title: "Approved Consent Template" },
  { key: "procedure", label: "Procedure", title: "Procedure Details" },
  { key: "anesthesia", label: "Anesthesia", title: "Anesthesia Decision" },
  { key: "education", label: "Education", title: "Patient Education" },
  { key: "review", label: "Review", title: "Smart Review" },
  { key: "send", label: "Send", title: "Send to Patient" },
];

const approvedTemplates: ConsentTemplate[] = [
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
  const [selectedTemplate, setSelectedTemplate] = useState<ConsentTemplate>(approvedTemplates[0]);
  const [query, setQuery] = useState("");
  const [procedure, setProcedure] = useState("Coronary Artery Bypass Grafting (CABG)");
  const [anesthesiaRequired, setAnesthesiaRequired] = useState(true);
  const [educationConfirmed, setEducationConfirmed] = useState(false);
  const [mobile, setMobile] = useState("+966 5X XXX XXXX");
  const [email, setEmail] = useState("patient@example.com");

  const currentStep = journeySteps[activeStep]?.key ?? "patient";

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();

    return approvedTemplates.filter((template) => {
      return (
        !q ||
        template.title.toLowerCase().includes(q) ||
        template.titleAr.toLowerCase().includes(q) ||
        template.department.toLowerCase().includes(q) ||
        template.type.toLowerCase().includes(q) ||
        template.id.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const readiness = useMemo(() => {
    let score = 55;
    if (selectedTemplate?.id) score += 15;
    if (procedure.trim().length > 8) score += 10;
    if (educationConfirmed) score += 15;
    if (mobile || email) score += 5;
    return Math.min(score, 100);
  }, [selectedTemplate, procedure, educationConfirmed, mobile, email]);

  function goNext() {
    setActiveStep((step) => Math.min(step + 1, journeySteps.length - 1));
  }

  function goBack() {
    setActiveStep((step) => Math.max(step - 1, 0));
  }

  function sendConsent() {
    const params = new URLSearchParams({
      templateId: selectedTemplate.id,
      procedure,
      anesthesiaRequired: String(anesthesiaRequired),
      educationConfirmed: String(educationConfirmed),
      mobile,
      email,
    });

    openRoute(`/modules/informed-consents/consent-creation-workflow?${params.toString()}`);
  }

  return (
    <main className="wcl-shell" data-testid="wathiq-alive-care-portal">
      <aside className="wcl-sidebar">
        <div className="wcl-brand">
          <ShieldCheck size={34} />
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
          <span>Approved Templates</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/governance")}>
          <ShieldCheck size={19} />
          <span>Governance</span>
        </button>

        <button type="button" onClick={() => openRoute("/modules/informed-consents/settings-support")}>
          <MessageCircle size={19} />
          <span>Support</span>
        </button>
      </aside>

      <section className="wcl-main">
        <header className="wcl-topbar">
          <div className="wcl-top-left">
            <button type="button" onClick={() => openRoute("/modules")}>
              <Home size={19} />
            </button>
            <div>
              <strong>Welcome to WathiqCare</strong>
              <span>Create legally reliable clinical consents with a guided care journey.</span>
            </div>
          </div>

          <div className="wcl-top-actions">
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

        <section className="wcl-hero">
          <div className="wcl-hero-copy">
            <span>وثّق فهمه</span>
            <h1>Issue informed consent with clarity, confidence, and care.</h1>
            <p>
              A living healthcare portal experience: select the patient, choose the right approved form,
              complete the clinical journey, and send the consent for OTP signature.
            </p>
            <div className="wcl-hero-actions">
              <button type="button" onClick={() => setActiveStep(0)}>
                Start consent journey
                <ChevronRight size={17} />
              </button>
              <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
                View pending consents
              </button>
            </div>
          </div>

          <div className="wcl-hero-visual" aria-hidden="true">
            <div className="wcl-care-person">
              <div className="wcl-face" />
              <div className="wcl-hijab" />
              <div className="wcl-body" />
              <div className="wcl-thumb" />
            </div>
            <div className="wcl-ring one" />
            <div className="wcl-ring two" />
            <div className="wcl-floating-card">
              <Sparkles size={18} />
              <strong>{readiness}%</strong>
              <span>Consent readiness</span>
            </div>
          </div>
        </section>

        <section className="wcl-services">
          <article>
            <h2>Consent services</h2>
            <div className="wcl-service-grid two">
              <button type="button" onClick={() => setActiveStep(0)}>
                <FileCheck2 size={31} />
                <span>
                  <strong>Create consent now</strong>
                  <small>Start a guided consent journey</small>
                </span>
              </button>

              <button type="button" onClick={() => openRoute("/modules/informed-consents/list")}>
                <CalendarDays size={31} />
                <span>
                  <strong>Follow pending consents</strong>
                  <small>Track signature and completion</small>
                </span>
              </button>
            </div>
          </article>

          <article>
            <h2>Clinical and legal workflow</h2>
            <div className="wcl-service-grid three">
              <button type="button" onClick={() => setActiveStep(1)}>
                <BookOpen size={31} />
                <span>
                  <strong>Approved templates</strong>
                  <small>Select the right IMC form</small>
                </span>
              </button>

              <button type="button" onClick={() => setActiveStep(3)}>
                <Syringe size={31} />
                <span>
                  <strong>Anesthesia review</strong>
                  <small>Trigger anesthesiologist input</small>
                </span>
              </button>

              <button type="button" onClick={() => setActiveStep(5)}>
                <ShieldCheck size={31} />
                <span>
                  <strong>Smart compliance</strong>
                  <small>Check readiness before send</small>
                </span>
              </button>
            </div>
          </article>
        </section>

        <section className="wcl-journey">
          <div className="wcl-left">
            <nav className="wcl-stepper" aria-label="Consent journey">
              {journeySteps.map((step, index) => (
                <button
                  key={step.key}
                  type="button"
                  className={index < activeStep ? "done" : index === activeStep ? "active" : ""}
                  onClick={() => setActiveStep(index)}
                >
                  <b>{index < activeStep ? <CheckCircle2 size={15} /> : index + 1}</b>
                  <span>{step.label}</span>
                </button>
              ))}
            </nav>

            <section className="wcl-panel">
              {currentStep === "patient" && (
                <>
                  <div className="wcl-panel-title">
                    <h2>Patient Context</h2>
                    <p>Confirm identity and encounter before issuing the consent.</p>
                  </div>

                  <div className="wcl-info-grid">
                    <article>
                      <UserRound size={24} />
                      <small>Patient</small>
                      <strong>Mr. Ramesh Kumar</strong>
                    </article>
                    <article>
                      <ClipboardCheck size={24} />
                      <small>MRN</small>
                      <strong>WC-2025-001123</strong>
                    </article>
                    <article>
                      <CalendarDays size={24} />
                      <small>Encounter</small>
                      <strong>OPD / Cardiac Surgery</strong>
                    </article>
                    <article>
                      <Stethoscope size={24} />
                      <small>Physician</small>
                      <strong>Dr. Arjun Mehta</strong>
                    </article>
                  </div>
                </>
              )}

              {currentStep === "template" && (
                <>
                  <div className="wcl-panel-title">
                    <h2>Approved Consent Template</h2>
                    <p>Search and select the correct consent document.</p>
                  </div>

                  <label className="wcl-search">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by template, Arabic title, department, or ID"
                    />
                  </label>

                  <div className="wcl-template-list">
                    {filteredTemplates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className={template.id === selectedTemplate.id ? "active" : ""}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <FileText size={23} />
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
                  <div className="wcl-panel-title">
                    <h2>Procedure Details</h2>
                    <p>Confirm the clinical procedure and the key explanation.</p>
                  </div>

                  <label className="wcl-input">
                    <span>Procedure Name</span>
                    <input value={procedure} onChange={(event) => setProcedure(event.target.value)} />
                  </label>

                  <label className="wcl-input">
                    <span>Clinical Note</span>
                    <textarea defaultValue="The patient was informed about the nature, benefits, material risks, alternatives, and possible complications of the proposed procedure." />
                  </label>
                </>
              )}

              {currentStep === "anesthesia" && (
                <>
                  <div className="wcl-panel-title">
                    <h2>Anesthesia Decision</h2>
                    <p>Decide whether anesthesia is required for this procedure.</p>
                  </div>

                  <div className="wcl-choice">
                    <button type="button" className={anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(true)}>
                      <Syringe size={28} />
                      <strong>Anesthesia Required</strong>
                      <span>Trigger anesthesiologist section</span>
                    </button>

                    <button type="button" className={!anesthesiaRequired ? "active" : ""} onClick={() => setAnesthesiaRequired(false)}>
                      <BadgeCheck size={28} />
                      <strong>Not Applicable</strong>
                      <span>No anesthesia workflow required</span>
                    </button>
                  </div>
                </>
              )}

              {currentStep === "education" && (
                <>
                  <div className="wcl-panel-title">
                    <h2>Patient Education</h2>
                    <p>Confirm that the patient education package is ready.</p>
                  </div>

                  <div className="wcl-education">
                    {["Procedure explanation", "Risks and benefits", "Alternatives", "Post-procedure care"].map((item) => (
                      <article key={item}>
                        <CheckCircle2 size={20} />
                        <span>{item}</span>
                      </article>
                    ))}
                  </div>

                  <label className="wcl-confirm">
                    <input
                      type="checkbox"
                      checked={educationConfirmed}
                      onChange={(event) => setEducationConfirmed(event.target.checked)}
                    />
                    <span>I confirm the patient education material is ready.</span>
                  </label>
                </>
              )}

              {currentStep === "review" && (
                <>
                  <div className="wcl-panel-title">
                    <h2>Smart Review</h2>
                    <p>Review readiness before sending the consent to the patient.</p>
                  </div>

                  <div className="wcl-review">
                    <div>
                      <Sparkles size={24} />
                      <strong>{readiness}%</strong>
                      <span>Readiness Score</span>
                    </div>
                    <ul>
                      <li>Patient: Mr. Ramesh Kumar</li>
                      <li>Template: {selectedTemplate.title}</li>
                      <li>Procedure: {procedure}</li>
                      <li>Anesthesia: {anesthesiaRequired ? "Required" : "Not Applicable"}</li>
                      <li>Education: {educationConfirmed ? "Confirmed" : "Pending"}</li>
                    </ul>
                  </div>
                </>
              )}

              {currentStep === "send" && (
                <>
                  <div className="wcl-panel-title">
                    <h2>Send to Patient</h2>
                    <p>Send OTP verification and e-signature link.</p>
                  </div>

                  <div className="wcl-send-grid">
                    <label>
                      <Phone size={18} />
                      <input value={mobile} onChange={(event) => setMobile(event.target.value)} />
                    </label>

                    <label>
                      <Mail size={18} />
                      <input value={email} onChange={(event) => setEmail(event.target.value)} />
                    </label>
                  </div>

                  <button type="button" className="wcl-primary wide" onClick={sendConsent}>
                    <Send size={18} />
                    Send Consent for Signature
                  </button>
                </>
              )}
            </section>
          </div>

          <aside className="wcl-summary">
            <div className="wcl-summary-head">
              <HeartPulse size={25} />
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

            <div className="wcl-ai-note">
              <Sparkles size={18} />
              <span>Smart guidance appears only when it supports a real clinical or legal decision.</span>
            </div>

            <div className="wcl-actions">
              <button type="button" onClick={() => setActiveStep((step) => Math.max(step - 1, 0))} disabled={activeStep === 0}>
                Back
              </button>

              {activeStep < journeySteps.length - 1 ? (
                <button type="button" className="wcl-primary" onClick={goNext}>
                  Continue
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button type="button" className="wcl-primary" onClick={sendConsent}>
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
