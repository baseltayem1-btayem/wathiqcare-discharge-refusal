"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BadgeCheck,
  BookOpen,
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
  Sparkles,
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

const allTypes = ["All Types", ...Array.from(new Set(consentTemplates.map((item) => item.type)))];
const allDepartments = ["All Departments", ...Array.from(new Set(consentTemplates.map((item) => item.department)))];

export default function ConsentTemplateSearchPanel() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All Types");
  const [department, setDepartment] = useState("All Departments");
  const [selectedId, setSelectedId] = useState(consentTemplates[0].id);

  const filteredTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return consentTemplates.filter((template) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        template.title.toLowerCase().includes(normalizedQuery) ||
        template.titleAr.toLowerCase().includes(normalizedQuery) ||
        template.id.toLowerCase().includes(normalizedQuery) ||
        template.specialty.toLowerCase().includes(normalizedQuery) ||
        template.department.toLowerCase().includes(normalizedQuery);

      const matchesType = type === "All Types" || template.type === type;
      const matchesDepartment = department === "All Departments" || template.department === department;

      return matchesQuery && matchesType && matchesDepartment;
    });
  }, [query, type, department]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedId) ||
    filteredTemplates[0] ||
    consentTemplates[0];

  return (
    <section className="wpp-template-search-panel" aria-label="Consent template search and selection">
      <div className="wpp-template-search-head">
        <div>
          <span>
            <Sparkles size={16} />
            Smart Consent Selection
          </span>
          <h2>Search & Select Approved Consent Document</h2>
          <p>Distribute templates by consent type, department, specialty, language and approval status before the physician review step.</p>
        </div>

        <div className="wpp-template-search-counter">
          <BadgeCheck size={20} />
          <strong>{filteredTemplates.length}</strong>
          <small>Matching Templates</small>
        </div>
      </div>

      <div className="wpp-template-search-controls">
        <label className="wpp-template-search-input">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by consent name, Arabic title, department, specialty, or template ID"
          />
          {query.length > 0 && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <X size={17} />
            </button>
          )}
        </label>

        <label className="wpp-template-select">
          <Filter size={18} />
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {allTypes.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <ChevronDown size={17} />
        </label>

        <label className="wpp-template-select">
          <Building2 size={18} />
          <select value={department} onChange={(event) => setDepartment(event.target.value)}>
            {allDepartments.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <ChevronDown size={17} />
        </label>
      </div>

      <div className="wpp-template-search-body">
        <div className="wpp-template-list">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            const active = template.id === selectedTemplate.id;

            return (
              <button
                key={template.id}
                type="button"
                className={active ? "wpp-template-row active" : "wpp-template-row"}
                onClick={() => setSelectedId(template.id)}
              >
                <span className="wpp-template-icon">
                  <Icon size={22} />
                </span>

                <span className="wpp-template-copy">
                  <strong>{template.title}</strong>
                  <em>{template.titleAr}</em>
                  <small>{template.id}</small>
                </span>

                <span className="wpp-template-tags">
                  <b>{template.type}</b>
                  <i>{template.department}</i>
                </span>
              </button>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="wpp-template-empty">
              <FileText size={30} />
              <strong>No matching consent templates found</strong>
              <span>Adjust the search keyword, consent type, or department filter.</span>
            </div>
          )}
        </div>

        <aside className="wpp-template-preview">
          <div className="wpp-template-preview-top">
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
              <dt>Consent Type</dt>
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

          <div className="wpp-template-approval">
            <ClipboardCheck size={19} />
            <div>
              <strong>{selectedTemplate.status}</strong>
              <span>Ready to continue in the physician workflow.</span>
            </div>
          </div>

          <button type="button" className="wpp-template-continue">
            Use This Consent Template
          </button>
        </aside>
      </div>
    </section>
  );
}
