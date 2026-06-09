"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  Brain,
  Building2,
  ChevronDown,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Filter,
  HeartPulse,
  Microscope,
  Search,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Users,
  X,
} from "lucide-react";

type ConsentTemplate = {
  id: string;
  title: string;
  titleAr: string;
  type: string;
  department: string;
  specialty: string;
  status: "IMC Approved" | "Ready for Review" | "Clinical Review";
  version: string;
  language: "Bilingual" | "English" | "Arabic";
  icon: typeof FileText;
};

const consentTemplates: ConsentTemplate[] = [
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
    icon: HeartPulse,
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
    icon: Stethoscope,
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
    icon: Syringe,
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
    icon: Activity,
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
    icon: Brain,
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
    icon: ShieldCheck,
  },
  {
    id: "IMC-CONS-RESEARCH-2025-002",
    title: "Research Participation Consent",
    titleAr: "موافقة المشاركة في الأبحاث الطبية",
    type: "Research Consent",
    department: "Research",
    specialty: "Clinical Research",
    status: "Ready for Review",
    version: "v1.5",
    language: "Bilingual",
    icon: Microscope,
  },
  {
    id: "IMC-CONS-PEDS-2025-012",
    title: "Pediatric Procedure Consent",
    titleAr: "موافقة إجراء للأطفال",
    type: "Procedure Consent",
    department: "Pediatrics",
    specialty: "Pediatrics",
    status: "IMC Approved",
    version: "v2.2",
    language: "Bilingual",
    icon: Users,
  },
];

const consentTypes = ["All Types", ...Array.from(new Set(consentTemplates.map((item) => item.type)))];
const departments = ["All Departments", ...Array.from(new Set(consentTemplates.map((item) => item.department)))];

export default function ConsentTemplateSearchPanel() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All Types");
  const [department, setDepartment] = useState("All Departments");
  const [selectedId, setSelectedId] = useState(consentTemplates[0].id);

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();

    return consentTemplates.filter((template) => {
      const matchesSearch =
        q.length === 0 ||
        template.title.toLowerCase().includes(q) ||
        template.titleAr.toLowerCase().includes(q) ||
        template.id.toLowerCase().includes(q) ||
        template.department.toLowerCase().includes(q) ||
        template.specialty.toLowerCase().includes(q);

      const matchesType = type === "All Types" || template.type === type;
      const matchesDepartment = department === "All Departments" || template.department === department;

      return matchesSearch && matchesType && matchesDepartment;
    });
  }, [query, type, department]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedId) ||
    filteredTemplates[0] ||
    consentTemplates[0];

  return (
    <section className="wc-template-search" aria-label="Consent template search">
      <div className="wc-template-toolbar">
        <div className="wc-template-title">
          <h2>Consent Template Selection</h2>
          <span>{filteredTemplates.length} templates</span>
        </div>

        <label className="wc-template-searchbox">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by template, department, specialty, Arabic title, or ID"
          />
          {query.length > 0 && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={16} />
            </button>
          )}
        </label>

        <label className="wc-template-filter">
          <Filter size={16} />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {consentTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>

        <label className="wc-template-filter">
          <Building2 size={16} />
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            {departments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
      </div>

      <div className="wc-template-grid">
        <div className="wc-template-results">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            const active = template.id === selectedTemplate.id;

            return (
              <button
                key={template.id}
                type="button"
                className={active ? "wc-template-card active" : "wc-template-card"}
                onClick={() => setSelectedId(template.id)}
              >
                <span className="wc-template-card-icon">
                  <Icon size={22} />
                </span>

                <span className="wc-template-card-main">
                  <strong>{template.title}</strong>
                  <em>{template.titleAr}</em>
                  <small>{template.id}</small>
                </span>

                <span className="wc-template-card-meta">
                  <b>{template.type}</b>
                  <i>{template.department}</i>
                </span>
              </button>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="wc-template-empty">
              <FileText size={28} />
              <strong>No matching consent templates</strong>
              <span>Change the search or filters.</span>
            </div>
          )}
        </div>

        <aside className="wc-template-details">
          <div className="wc-template-details-head">
            <span>
              <FileCheck2 size={22} />
            </span>
            <div>
              <strong>{selectedTemplate.title}</strong>
              <em>{selectedTemplate.titleAr}</em>
            </div>
          </div>

          <dl>
            <div>
              <dt>Template ID</dt>
              <dd>{selectedTemplate.id}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{selectedTemplate.type}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{selectedTemplate.department}</dd>
            </div>
            <div>
              <dt>Specialty</dt>
              <dd>{selectedTemplate.specialty}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{selectedTemplate.version}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{selectedTemplate.language}</dd>
            </div>
          </dl>

          <div className="wc-template-status">
            <BadgeCheck size={18} />
            <span>{selectedTemplate.status}</span>
          </div>

          <button type="button" className="wc-template-use">
            <ClipboardCheck size={17} />
            Use Selected Template
          </button>
        </aside>
      </div>
    </section>
  );
}
