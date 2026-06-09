"use client";

import { useEffect, useMemo, useState } from "react";
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

type ApiTemplate = Partial<{
  id: string;
  templateId: string;
  code: string;
  title: string;
  titleEn: string;
  titleAr: string;
  consentType: string;
  type: string;
  department: string;
  specialty: string;
  status: string;
  version: string;
  language: string;
}>;

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

function iconForTemplate(template: ConsentTemplate): typeof FileText {
  const haystack = `${template.title} ${template.titleAr} ${template.type} ${template.department} ${template.specialty}`.toLowerCase();

  if (haystack.includes("cardiac") || haystack.includes("heart") || haystack.includes("cabg") || haystack.includes("قلب") || haystack.includes("تاجي")) return HeartPulse;
  if (haystack.includes("anesthesia") || haystack.includes("anesth") || haystack.includes("تخدير")) return Syringe;
  if (haystack.includes("radiology") || haystack.includes("brain") || haystack.includes("أشعة")) return Brain;
  if (haystack.includes("research") || haystack.includes("clinical trial") || haystack.includes("بحث")) return Microscope;
  if (haystack.includes("pediatric") || haystack.includes("child") || haystack.includes("أطفال")) return Users;
  if (haystack.includes("critical") || haystack.includes("icu") || haystack.includes("عناية")) return ShieldCheck;
  if (haystack.includes("endoscopy") || haystack.includes("منظار")) return Activity;
  if (haystack.includes("surgery") || haystack.includes("surgical") || haystack.includes("جراح")) return Stethoscope;

  return FileText;
}

function normalizeStatus(status?: string): ConsentTemplate["status"] {
  const s = (status || "").toLowerCase();

  if (s.includes("review")) return "Ready for Review";
  if (s.includes("clinical")) return "Clinical Review";

  return "IMC Approved";
}

function normalizeLanguage(language?: string): ConsentTemplate["language"] {
  const lang = (language || "").toLowerCase();

  if (lang.includes("arabic")) return "Arabic";
  if (lang.includes("english")) return "English";

  return "Bilingual";
}

function normalizeTemplates(payload: unknown): ConsentTemplate[] {
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
      const raw = item as ApiTemplate;

      const template: ConsentTemplate = {
        id: raw.id || raw.templateId || raw.code || `IMC-CONS-TEMPLATE-${index + 1}`,
        title: raw.titleEn || raw.title || "Untitled Consent Template",
        titleAr: raw.titleAr || "نموذج موافقة",
        type: raw.consentType || raw.type || "Procedure Consent",
        department: raw.department || "General",
        specialty: raw.specialty || raw.department || "General",
        status: normalizeStatus(raw.status),
        version: raw.version || "v1.0",
        language: normalizeLanguage(raw.language),
        icon: FileText,
      };

      template.icon = iconForTemplate(template);
      return template;
    })
    .filter((template) => template.title !== "Untitled Consent Template" || template.id);
}

const templateEndpoints = [
  "/api/modules/informed-consents/templates",
  "/api/modules/informed-consents/library",
  "/api/modules/informed-consents/imc-library",
];

export default function ConsentTemplateSearchPanel() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All Types");
  const [department, setDepartment] = useState("All Departments");
  const [selectedId, setSelectedId] = useState(fallbackTemplates[0].id);
  const [templates, setTemplates] = useState<ConsentTemplate[]>(fallbackTemplates);
  const [source, setSource] = useState<"database" | "fallback" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      setSource("loading");
      setError(null);

      for (const endpoint of templateEndpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          });

          if (!response.ok) {
            continue;
          }

          const payload = await response.json();
          const normalized = normalizeTemplates(payload);

          if (!cancelled && normalized.length > 0) {
            setTemplates(normalized);
            setSelectedId(normalized[0].id);
            setSource("database");
            return;
          }
        } catch {
          continue;
        }
      }

      if (!cancelled) {
        setTemplates(fallbackTemplates);
        setSelectedId(fallbackTemplates[0].id);
        setSource("fallback");
        setError("Database templates unavailable. Showing local approved sample templates.");
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, []);

  const consentTypes = useMemo(
    () => ["All Types", ...Array.from(new Set(templates.map((item) => item.type).filter(Boolean)))],
    [templates],
  );

  const departments = useMemo(
    () => ["All Departments", ...Array.from(new Set(templates.map((item) => item.department).filter(Boolean)))],
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();

    return templates.filter((template) => {
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
  }, [query, type, department, templates]);

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedId) ||
    filteredTemplates[0] ||
    templates[0] ||
    fallbackTemplates[0];

  function openTemplateRegistry() {
    window.location.assign("/modules/informed-consents/template-registry");
  }

  function openTemplateBuilder() {
    window.location.assign("/modules/informed-consents/template-builder");
  }

  function useSelectedTemplate() {
    const params = new URLSearchParams({
      templateId: selectedTemplate.id,
      source,
    });

    window.location.assign(`/modules/informed-consents/consent-creation-workflow?${params.toString()}`);
  }

  return (
    <section className="wc-template-search" aria-label="Consent template search">
      <div className="wc-template-toolbar">
        <div className="wc-template-title">
          <h2>Consent Template Selection</h2>
          <span className={source === "database" ? "wc-source-pill db" : source === "loading" ? "wc-source-pill loading" : "wc-source-pill fallback"}>
            {source === "database" ? "Database connected" : source === "loading" ? "Loading templates" : "Fallback templates"}
          </span>
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

      {error && <div className="wc-template-error">{error}</div>}

      <div className="wc-template-actions">
        <button type="button" onClick={openTemplateRegistry}>
          Template Registry
        </button>
        <button type="button" onClick={openTemplateBuilder}>
          Template Builder
        </button>
        <strong>{filteredTemplates.length} templates</strong>
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

          <button type="button" className="wc-template-use" onClick={useSelectedTemplate}>
            <ClipboardCheck size={17} />
            Use Selected Template
          </button>
        </aside>
      </div>
    </section>
  );
}
