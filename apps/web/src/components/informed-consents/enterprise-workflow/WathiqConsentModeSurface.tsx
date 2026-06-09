"use client";


import ConsentTemplateSearchPanel from "./ConsentTemplateSearchPanel";
import {
  Activity,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  Folder,
  Globe2,
  Headphones,
  HeartPulse,
  Home,
  Languages,
  Lock,
  Mail,
  Maximize2,
  Menu,
  MessageSquare,
  Minus,
  PenLine,
  Phone,
  Plus,
  Printer,
  QrCode,
  Scale,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  Stethoscope,
  Syringe,
  User,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

type Mode = "physician" | "patient";

const physicianSteps = [
  { label: "Patient & Encounter", sub: "Completed", icon: Users, state: "done" },
  { label: "Consent Category", sub: "Completed", icon: Folder, state: "done" },
  { label: "Template", sub: "IMC Approved", icon: FileText, state: "done" },
  { label: "Procedure", sub: "Completed", icon: PenLine, state: "done" },
  { label: "Anesthesia", sub: "Pending", icon: Syringe, state: "warning" },
  { label: "Education", sub: "In Progress", icon: BookOpen, state: "active" },
  { label: "Physician Review", sub: "Pending", icon: UserRound, state: "idle" },
  { label: "Send & Sign", sub: "Pending", icon: Send, state: "idle" },
];

const patientSteps = [
  { label: "Procedure Summary", sub: "Completed", icon: FileText, state: "done" },
  { label: "Education Material", sub: "Completed", icon: BookOpen, state: "done" },
  { label: "Risks & Benefits", sub: "Completed", icon: ShieldCheck, state: "done" },
  { label: "Questions Answered", sub: "Completed", icon: MessageSquare, state: "done" },
  { label: "Review PDF", sub: "In Progress", icon: FileCheck2, state: "active" },
  { label: "OTP Verification", sub: "Completed", icon: Lock, state: "done" },
  { label: "E-Signature", sub: "Completed", icon: PenLine, state: "done" },
];

function LogoBlock() {
  return (
    <div className="wc-logo-block" aria-label="WathiqCare">
      <div className="wc-logo-mark">
        <Scale size={30} strokeWidth={2.2} />
      </div>
      <div>
        <div className="wc-logo-title">WathiqCare</div>
        <div className="wc-logo-subtitle">LEGAL. CARE. TRUSTED.</div>
      </div>
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return (
    <div className="wc-mode-toggle" role="tablist" aria-label="Mode switcher">
      <button
        type="button"
        className={mode === "physician" ? "wc-mode-pill active" : "wc-mode-pill"}
        onClick={() => setMode("physician")}
      >
        <User size={17} />
        <span>Physician Mode</span>
      </button>
      <button
        type="button"
        className={mode === "patient" ? "wc-mode-pill active" : "wc-mode-pill"}
        onClick={() => setMode("patient")}
      >
        <UserRound size={17} />
        <span>Patient Mode</span>
      </button>
    </div>
  );
}

function Sidebar({ mode }: { mode: Mode }) {
  const items =
    mode === "patient"
      ? [
          ["My Consents", FileText],
          ["Appointments", CalendarDays],
          ["Health Records", ClipboardList],
          ["Messages", MessageSquare],
          ["Education Library", BookOpen],
          ["My Documents", FileCheck2],
          ["Profile & Settings", Settings],
        ]
      : [
          ["Informed Consents", ClipboardCheck],
          ["Encounters", CalendarDays],
          ["Patients", UserRound],
          ["Templates", FileText],
          ["Education Library", BookOpen],
          ["Anesthesia", Syringe],
          ["Reports & Audit", ClipboardList],
          ["Notifications", Bell],
          ["Institution Settings", Settings],
        ];

  return (
    <aside className="wc-sidebar">
      <div className="wc-sidebar-orb wc-sidebar-orb-a" />
      <div className="wc-sidebar-orb wc-sidebar-orb-b" />
      <div className="wc-sidebar-orb wc-sidebar-orb-c" />

      <LogoBlock />

      <nav className="wc-sidebar-nav">
        {items.map(([label, Icon], index) => (
          <button key={label as string} type="button" className={index === 0 ? "wc-nav-item active" : "wc-nav-item"}>
            <Icon size={22} />
            <span>{label as string}</span>
          </button>
        ))}
      </nav>

      <div className="wc-support-card">
        <Headphones size={34} />
        <div>
          <strong>{mode === "patient" ? "24/7 Patient Support" : "24/7 Legal & Clinical Support"}</strong>
          <span>{mode === "patient" ? "We’re here to help you" : "Clinical-legal experts available"}</span>
        </div>
        <p><Mail size={15} /> support@wathiqcare.com</p>
        <p><Phone size={15} /> +91 80 6933 0000</p>
        <button type="button">{mode === "patient" ? "Chat with Support" : "Contact Support"}</button>
      </div>

      <button type="button" className="wc-collapse">
        <ChevronLeft size={18} />
        <span>Collapse</span>
      </button>
    </aside>
  );
}

function Header({ mode, setMode }: { mode: Mode; setMode: (mode: Mode) => void }) {
  return (
    <header className="wc-header">
      <div className="wc-title-group">
        <button type="button" className="wc-menu-button" aria-label="Open menu">
          <Menu size={25} />
        </button>
        <div>
          <h1>{mode === "patient" ? "Review & Sign Informed Consent" : "Informed Consents Command Center"}</h1>
          <p>
            {mode === "patient"
              ? "Please read each section carefully and complete your consent."
              : "Create, review, and manage legally compliant informed consents"}
          </p>
        </div>
      </div>

      <div className="wc-header-actions">
        <ModeToggle mode={mode} setMode={setMode} />

        <div className="wc-language">
          <Globe2 size={18} />
          <span>EN</span>
          <i />
          <span>العربية</span>
        </div>

        <button type="button" className="wc-bell" aria-label="Notifications">
          <Bell size={23} />
          <b>{mode === "patient" ? "2" : "2"}</b>
        </button>

        <div className="wc-profile">
          <div className="wc-avatar">
            <span>{mode === "patient" ? "RK" : "AM"}</span>
            <em />
          </div>
          <div>
            <strong>{mode === "patient" ? "Mr. Ramesh Kumar" : "Dr. Arjun Mehta"}</strong>
            <span>{mode === "patient" ? "Patient" : "Cardiothoracic Surgery"}</span>
          </div>
          <ChevronDown size={17} />
        </div>
      </div>
    </header>
  );
}

function Stepper({ mode }: { mode: Mode }) {
  const steps = mode === "patient" ? patientSteps : physicianSteps;

  return (
    <section className="wc-step-card">
      {mode === "physician" && (
        <div className="wc-section-head">
          <h2>Latest Consent Workflow</h2>
          <button type="button">View All Workflows <span>→</span></button>
        </div>
      )}

      <div className={mode === "patient" ? "wc-stepper patient" : "wc-stepper physician"}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className={`wc-step ${step.state}`}>
              <div className="wc-step-top">
                <div className="wc-step-circle">
                  {mode === "patient" ? <span className="wc-step-number">{index + 1}</span> : <Icon size={27} />}
                  {mode === "physician" && step.state === "done" && <b><Check size={12} /></b>}
                  {mode === "physician" && step.state === "warning" && <b className="warn">!</b>}
                </div>
                {index < steps.length - 1 && <i className="wc-step-line" />}
              </div>
              <div className="wc-step-text">
                {mode === "patient" && <Icon size={24} />}
                <strong>{step.label}</strong>
                <span>{step.sub}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PhysicianStatusRow() {
  return (
    <section className="wc-physician-grid">
      <div className="wc-status-card success">
        <div className="wc-status-icon"><ClipboardCheck size={34} /></div>
        <div>
          <span>Workflow Status</span>
          <strong>In Progress</strong>
          <p>Last updated: 10:24 AM</p>
        </div>
      </div>

      <div className="wc-status-card warning">
        <div className="wc-status-icon"><Syringe size={34} /></div>
        <div>
          <span>Anesthesia Section</span>
          <strong>Pending</strong>
          <p>Action required</p>
        </div>
      </div>

      <div className="wc-status-card info">
        <div className="wc-status-icon"><BookOpen size={34} /></div>
        <div>
          <span>Patient Education</span>
          <strong>80% Complete</strong>
          <p>2 of 5 items completed</p>
          <i className="wc-mini-progress"><b /></i>
        </div>
      </div>

      <div className="wc-status-card purple">
        <div className="wc-status-icon"><FileCheck2 size={34} /></div>
        <div>
          <span>Consent PDF</span>
          <strong>Ready Soon</strong>
          <p>After Physician Review</p>
        </div>
      </div>
    </section>
  );
}

function PatientSummary() {
  const data = [
    ["Patient Name", "Mr. Ramesh Kumar", UserRound],
    ["MRN / UHID", "WC-2025-001123", ClipboardList],
    ["Procedure", "Coronary Artery Bypass Grafting (CABG)", HeartPulse],
    ["Physician", "Dr. Arjun Mehta", Stethoscope],
    ["Hospital / Clinic", "WathiqCare Medical Center", Building2],
  ];

  return (
    <section className="wc-patient-summary">
      <h2>Patient Summary</h2>
      <div className="wc-patient-strip">
        {data.map(([label, value, Icon]) => (
          <div key={label as string} className="wc-patient-field">
            <span><Icon size={24} /></span>
            <div>
              <small>{label as string}</small>
              <strong>{value as string}</strong>
            </div>
          </div>
        ))}
        <div className="wc-patient-field status">
          <span><CheckCircle2 size={25} /></span>
          <div>
            <small>Consent Status</small>
            <strong>Signed & Verified</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function EducationProgress() {
  return (
    <div className="wc-education-progress">
      <strong>Education Progress</strong>
      <span>100% Completed</span>
      <i><b /></i>
      <small>All required sections completed <CheckCircle2 size={16} /></small>
    </div>
  );
}

function ConsentDocumentPreview({ mode }: { mode: Mode }) {
  return (
    <section className="wc-document-card">
      <div className="wc-document-head">
        <h2>{mode === "patient" ? "Review Consent Document" : "Consent Document Preview"}</h2>

        {mode === "physician" && (
          <button type="button" className="wc-template-badge">
            <Check size={16} />
            IMC Approved Template
            <ChevronDown size={16} />
          </button>
        )}

        <div className="wc-document-tools">
          {mode === "patient" && (
            <button type="button" className="wc-doc-select">
              Consent Document (English)
              <ChevronDown size={16} />
            </button>
          )}

          {mode === "physician" && (
            <button type="button" className="wc-doc-select compact">
              Fit Width
              <ChevronDown size={16} />
            </button>
          )}

          <button type="button"><Download size={19} /></button>
          {mode === "patient" && <button type="button"><Printer size={19} /></button>}
          <button type="button"><Minus size={17} /></button>
          {mode === "patient" && <span className="wc-zoom-label">100%</span>}
          <button type="button"><Plus size={17} /></button>
          {mode === "patient" && <button type="button"><Maximize2 size={18} /></button>}
        </div>
      </div>

      {mode === "patient" && (
        <div className="wc-patient-toolbar-note">
          You may download or print a copy before signing.
        </div>
      )}

      <div className="wc-document-viewer">
        <aside className="wc-thumbnails">
          <div className="wc-thumb active">
            <div />
            <span>1</span>
          </div>
          <div className="wc-thumb">
            <div />
            <span>2</span>
          </div>
        </aside>

        <div className="wc-scrollbar-left" />

        <article className="wc-pdf-page">
          <div className="wc-pdf-brand">
            <LogoBlock />
            <div>
              <h3>{mode === "patient" ? "Informed Consent for Surgical Procedure" : ""}</h3>
              {mode === "patient" && (
                <>
                  <p>Created On: 20 May 2025, 10:32 AM</p>
                  <p>Date: 21 May 2025, 10:25 AM</p>
                </>
              )}
            </div>
          </div>

          {mode === "physician" && <h3 className="wc-pdf-title">INFORMED CONSENT FOR SURGICAL PROCEDURE</h3>}

          <div className="wc-pdf-meta">
            <div><b>Patient Name:</b><span>Mr. Ramesh Kumar</span></div>
            <div><b>MRN / UHID:</b><span>WC-2025-001123</span></div>
            <div><b>Age / Gender:</b><span>52 / Male</span></div>
            <div><b>Physician:</b><span>Dr. Arjun Mehta</span></div>
            <div><b>Procedure:</b><span>Coronary Artery Bypass Grafting (CABG)</span></div>
            <div><b>Hospital / Clinic:</b><span>WathiqCare Medical Center</span></div>
          </div>

          <div className="wc-pdf-body">
            <p>
              I have been informed about my condition, the nature of the proposed procedure,
              its benefits, potential risks, alternatives, and possible complications.
            </p>
            <p>
              I have had the opportunity to ask questions and my queries have been answered satisfactorily.
            </p>
            <p>I voluntarily consent to the procedure mentioned above.</p>
            <h4>Risks Discussed (including but not limited to):</h4>
            <ul>
              <li>Bleeding and need for blood transfusion</li>
              <li>Infection</li>
              <li>Stroke</li>
              <li>Heart attack</li>
              <li>Death</li>
            </ul>
          </div>
        </article>

        <div className="wc-view-scroll" />
      </div>
    </section>
  );
}

function PhysicianRightPanel() {
  const checks = [
    ["IMC Approved Template", "Template ID: IMC/CA/05/2024/0178"],
    ["Audit Trail Active", "All actions are being recorded"],
    ["PDPL Ready", "Patient data protection enabled"],
    ["Patient Copy with QR", "Secure PDF with verification QR"],
  ];

  return (
    <aside className="wc-right-panel">
      <section className="wc-side-card compliance">
        <h2><Shield size={24} /> Legal & Compliance Status</h2>
        {checks.map(([title, sub]) => (
          <div key={title} className="wc-check-row">
            <CheckCircle2 size={20} />
            <div>
              <strong>{title}</strong>
              <span>{sub}</span>
            </div>
            <button type="button">View</button>
          </div>
        ))}
      </section>

      <section className="wc-side-card support">
        <h2><Headphones size={24} /> Support</h2>
        <p>Need help with this consent?</p>
        <span>Our legal & clinical experts are available.</span>
        <button type="button"><MessageSquare size={16} /> Chat with Expert</button>
        <a>Raise a Ticket</a>
      </section>

      <section className="wc-side-card settings">
        <h2><Settings size={24} /> Settings</h2>
        <div>
          <strong>Consent Settings</strong>
          <span>Default preferences, branding, and notifications.</span>
        </div>
        <ChevronLeft size={22} />
      </section>
    </aside>
  );
}

function PatientRightPanel() {
  return (
    <aside className="wc-patient-right">
      <section className="wc-otp-card">
        <h2><b>6</b> OTP Verification</h2>
        <p>A 6-digit OTP was sent to your registered mobile number</p>
        <strong>+91 98****1123</strong>
        <div className="wc-otp-digits">
          {["5", "2", "7", "1", "9", "8"].map((digit) => <span key={digit}>{digit}</span>)}
        </div>
        <div className="wc-verified">
          <CheckCircle2 size={18} />
          <span>OTP Verified Successfully</span>
          <small>Verified at 10:25 AM</small>
        </div>
      </section>

      <section className="wc-sign-card">
        <h2><b>7</b> E-Signature</h2>
        <p>Please sign in the box below. Your signature is legally binding.</p>
        <div className="wc-signature">
          <span>Ramesh Kumar</span>
          <CheckCircle2 size={26} />
        </div>
        <dl>
          <dt>Signed by:</dt>
          <dd>Mr. Ramesh Kumar</dd>
          <dt>Date & Time:</dt>
          <dd>21 May 2025, 10:26 AM</dd>
        </dl>
        <div className="wc-sign-success">
          <CheckCircle2 size={20} />
          Consent Signed Successfully
        </div>
      </section>
    </aside>
  );
}

function BottomBadges() {
  const badges = [
    ["Audit Trail Active", "All actions are being recorded", ShieldCheck],
    ["Patient Copy with QR", "Download or scan to view", QrCode],
    ["Arabic / English Copy", "Bilingual consent provided", Globe2],
    ["Secure Access", "Encrypted & HIPAA Compliant", Lock],
  ];

  return (
    <section className="wc-bottom-badges">
      {badges.map(([title, sub, Icon]) => (
        <div key={title as string}>
          <span><Icon size={25} /></span>
          <div>
            <strong>{title as string}</strong>
            <p>{sub as string}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Footer() {
  return (
    <footer className="wc-footer">
      <span><Shield size={17} /> WathiqCare © 2025. All rights reserved.</span>
      <div>
        <span>Enterprise Plan</span>
        <i />
        <span>WathiqCare Medical Center</span>
        <ChevronDown size={16} />
      </div>
      <strong><CheckCircle2 size={15} /> System Status: Operational</strong>
    </footer>
  );
}

function PhysicianMode() {
  return (
    <>
      <Stepper mode="physician" />
      <ConsentTemplateSearchPanel />
      <div className="wc-main-layout physician">
        <div className="wc-main-left">
          <PhysicianStatusRow />
          <ConsentDocumentPreview mode="physician" />
        </div>
        <PhysicianRightPanel />
      </div>
    </>
  );
}

function PatientMode() {
  return (
    <>
      <PatientSummary />
      <Stepper mode="patient" />
      <EducationProgress />
      <div className="wc-main-layout patient">
        <div className="wc-main-left">
          <ConsentDocumentPreview mode="patient" />
        </div>
        <PatientRightPanel />
      </div>
      <BottomBadges />
    </>
  );
}

export default function WathiqConsentModeSurface() {
  const [mode, setMode] = useState<Mode>("physician");

  const pageClass = useMemo(() => `wc-app-shell ${mode}`, [mode]);

  return (
    <main className={pageClass} dir="ltr">
      <Sidebar mode={mode} />

      <section className="wc-content">
        <Header mode={mode} setMode={setMode} />

        <div className="wc-content-scroll">
          {mode === "physician" ? <PhysicianMode /> : <PatientMode />}
          <Footer />
        </div>
      </section>
    </main>
  );
}


