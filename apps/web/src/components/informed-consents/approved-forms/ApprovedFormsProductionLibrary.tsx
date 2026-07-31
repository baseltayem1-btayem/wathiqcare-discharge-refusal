"use client";

import React from "react";
import {
  Activity,
  Archive,
  CheckCircle2,
  FileCheck2,
  FileText,
  Filter,
  Globe2,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  XCircle
} from "lucide-react";

type ApprovedConsentTemplate = {
  id: string;
  titleEn: string;
  titleAr: string;
  category: string;
  specialty: string;
  procedure: string;
  language: string;
  version: string;
  approvalStatus: "approved";
  legalApprovalDate: string;
  clinicalApprovalDate: string;
  governanceOwner: string;
  riskLevel: "standard" | "medium" | "high";
  tags: string[];
  pdfUrl: string;
  patientCopyPdfUrl?: string;
  summary: string;
  searchScore?: number;
};

const categoryLabels: Record<string, string> = {
  all: "All Approved Forms",
  "general-surgery": "General Surgery",
  anesthesia: "Anesthesia",
  medical: "Medical",
  diagnostic: "Diagnostic",
  "special-procedure": "Special Procedure"
};

const riskLabels: Record<string, string> = {
  all: "All Risk Levels",
  standard: "Standard",
  medium: "Medium",
  high: "High"
};

const categoryOptions = [
  "all",
  "general-surgery",
  "anesthesia",
  "medical",
  "diagnostic",
  "special-procedure"
];

const riskOptions = ["all", "standard", "medium", "high"];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function statusColor(riskLevel: string) {
  if (riskLevel === "high") return "bg-red-50 text-red-700 border-red-200";
  if (riskLevel === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export default function ApprovedFormsProductionLibrary() {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [specialty, setSpecialty] = React.useState("all");
  const [riskLevel, setRiskLevel] = React.useState("all");
  const [templates, setTemplates] = React.useState<ApprovedConsentTemplate[]>([]);
  const [specialties, setSpecialties] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<ApprovedConsentTemplate | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadLibrary = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      q: query,
      category,
      specialty,
      riskLevel
    });

    try {
      const response = await fetch(`/api/modules/informed-consents/forms?${params.toString()}`, {
        credentials: "include",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Approved library API failed with status ${response.status}`);
      }

      const data = await response.json();
      const nextTemplates = data.templates || [];

      setTemplates(nextTemplates);
      setSpecialties(data.specialties || []);
      setSelected((current) => {
        if (current && nextTemplates.some((item: ApprovedConsentTemplate) => item.id === current.id)) return current;
        return nextTemplates[0] || null;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load approved forms library.");
      setTemplates([]);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [query, category, specialty, riskLevel]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLibrary();
    }, 220);

    return () => window.clearTimeout(timer);
  }, [loadLibrary]);

  const stats = React.useMemo(() => {
    return {
      total: templates.length,
      anesthesia: templates.filter((item) => item.category === "anesthesia").length,
      highRisk: templates.filter((item) => item.riskLevel === "high").length
    };
  }, [templates]);

  return (
    <div className="min-h-screen bg-[#f4fafc] text-[#102a43]">
      <div className="mx-auto w-full max-w-[1320px] px-6 py-6">
        <section className="mb-6 overflow-hidden rounded-[24px] bg-gradient-to-r from-[#0b4f82] via-[#1678c8] to-[#22bfb3] px-7 py-7 text-white shadow-[0_18px_50px_rgba(15,76,129,0.18)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.42em] text-blue-100">Approved IMC Library</p>
              <h1 className="text-3xl font-bold tracking-[-0.03em]">Approved Consent Forms</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium text-blue-50">
                Production library for approved IMC consent templates with smart search, governance controls, and in-page PDF preview.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">Approved</p>
              </div>
              <div className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
                <p className="text-2xl font-bold">{stats.anesthesia}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">Anesthesia</p>
              </div>
              <div className="rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
                <p className="text-2xl font-bold">{stats.highRisk}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-100">High Risk</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-[24px] border border-[#d8eaf4] bg-white p-5 shadow-[0_16px_40px_rgba(15,76,129,0.08)]">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.65fr]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b8aa7]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Smart search by procedure, form name, specialty, Arabic keyword, or tag..."
                className="h-12 w-full rounded-2xl border border-[#d5e6f0] bg-[#f8fcfe] pl-12 pr-4 text-sm font-medium text-[#12324d] outline-none transition focus:border-[#1976d2] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="relative block">
              <Filter className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b8aa7]" />
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-[#d5e6f0] bg-[#f8fcfe] pl-12 pr-4 text-sm font-semibold text-[#12324d] outline-none transition focus:border-[#1976d2] focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {categoryLabels[item]}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative block">
              <Stethoscope className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b8aa7]" />
              <select
                value={specialty}
                onChange={(event) => setSpecialty(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-[#d5e6f0] bg-[#f8fcfe] pl-12 pr-4 text-sm font-semibold text-[#12324d] outline-none transition focus:border-[#1976d2] focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All Specialties</option>
                {specialties.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative block">
              <Activity className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b8aa7]" />
              <select
                value={riskLevel}
                onChange={(event) => setRiskLevel(event.target.value)}
                className="h-12 w-full appearance-none rounded-2xl border border-[#d5e6f0] bg-[#f8fcfe] pl-12 pr-4 text-sm font-semibold text-[#12324d] outline-none transition focus:border-[#1976d2] focus:bg-white focus:ring-4 focus:ring-blue-100"
              >
                {riskOptions.map((item) => (
                  <option key={item} value={item}>
                    {riskLabels[item]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {error && (
          <section className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </section>
        )}

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.35fr]">
          <div className="rounded-[24px] border border-[#d8eaf4] bg-white p-4 shadow-[0_16px_40px_rgba(15,76,129,0.08)]">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-bold text-[#102a43]">Approved Templates</h2>
                <p className="text-sm text-[#64748b]">Only approved and controlled templates are displayed.</p>
              </div>
              <span className="rounded-full bg-[#eef8fb] px-3 py-1 text-xs font-bold text-[#0b6f91]">{templates.length} results</span>
            </div>

            <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1">
              {loading && (
                <div className="rounded-2xl border border-[#d8eaf4] bg-[#f8fcfe] p-5 text-sm font-semibold text-[#52708a]">
                  Loading approved forms library...
                </div>
              )}

              {!loading && templates.length === 0 && (
                <div className="rounded-2xl border border-[#d8eaf4] bg-[#f8fcfe] p-5 text-sm font-semibold text-[#52708a]">
                  No approved consent form matched the current search criteria.
                </div>
              )}

              {!loading &&
                templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelected(template)}
                    className={cn(
                      "w-full rounded-[20px] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,76,129,0.12)]",
                      selected?.id === template.id
                        ? "border-[#1976d2] bg-[#f3faff] ring-4 ring-blue-100"
                        : "border-[#d8eaf4] bg-white"
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#05b8d6] text-white">
                          <FileCheck2 className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold leading-5 text-[#102a43]">{template.titleEn}</h3>
                          <p className="mt-1 text-xs font-semibold text-[#52708a]">{template.titleAr}</p>
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-[#d8eaf4] bg-[#f8fcfe] px-2.5 py-1 text-[11px] font-bold text-[#31546f]">
                        v{template.version}
                      </span>
                      <span className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold", statusColor(template.riskLevel))}>
                        {template.riskLevel.toUpperCase()}
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        APPROVED
                      </span>
                    </div>

                    <p className="line-clamp-2 text-xs leading-5 text-[#64748b]">{template.summary}</p>
                  </button>
                ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#d8eaf4] bg-white p-5 shadow-[0_16px_40px_rgba(15,76,129,0.08)]">
            {selected ? (
              <div className="flex h-full flex-col">
                <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Approved Controlled Template
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#d8eaf4] bg-[#f8fcfe] px-3 py-1 text-xs font-bold text-[#31546f]">
                        <Globe2 className="h-3.5 w-3.5" />
                        {selected.language}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-[-0.02em] text-[#102a43]">{selected.titleEn}</h2>
                    <p className="mt-1 text-sm font-semibold text-[#52708a]">{selected.titleAr}</p>
                  </div>

                  <a
                    href={selected.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0b5f95] px-5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(11,95,149,0.22)] transition hover:bg-[#084a77]"
                  >
                    <FileText className="h-4 w-4" />
                    Open signing PDF
                  </a>
                  {selected.patientCopyPdfUrl ? (
                    <a
                      href={selected.patientCopyPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <FileText className="h-4 w-4" />
                      Open patient copy
                    </a>
                  ) : null}
                </div>

                <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-[#d8eaf4] bg-[#f8fcfe] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b93aa]">Specialty</p>
                    <p className="mt-1 text-sm font-bold text-[#102a43]">{selected.specialty}</p>
                  </div>
                  <div className="rounded-2xl border border-[#d8eaf4] bg-[#f8fcfe] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b93aa]">Procedure</p>
                    <p className="mt-1 text-sm font-bold text-[#102a43]">{selected.procedure}</p>
                  </div>
                  <div className="rounded-2xl border border-[#d8eaf4] bg-[#f8fcfe] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b93aa]">Legal Approval</p>
                    <p className="mt-1 text-sm font-bold text-[#102a43]">{selected.legalApprovalDate}</p>
                  </div>
                  <div className="rounded-2xl border border-[#d8eaf4] bg-[#f8fcfe] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b93aa]">Clinical Approval</p>
                    <p className="mt-1 text-sm font-bold text-[#102a43]">{selected.clinicalApprovalDate}</p>
                  </div>
                </div>

                <div className="mb-5 rounded-2xl border border-[#d8eaf4] bg-[#f8fcfe] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#102a43]">
                    <Sparkles className="h-4 w-4 text-[#1976d2]" />
                    Smart Search Match Context
                  </div>
                  <p className="text-sm leading-6 text-[#52708a]">{selected.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selected.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#52708a] ring-1 ring-[#d8eaf4]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="min-h-[540px] flex-1 overflow-hidden rounded-[22px] border border-[#cfe3ee] bg-[#eef7fb]">
                  <div className="flex items-center justify-between border-b border-[#cfe3ee] bg-white px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-[#102a43]">
                      <Archive className="h-4 w-4 text-[#0b6f91]" />
                      In-page Form Viewer
                    </div>
                    <span className="text-xs font-semibold text-[#64748b]">PDF Preview</span>
                  </div>
                  <iframe
                    key={selected.id}
                    src={selected.pdfUrl}
                    title={selected.titleEn}
                    className="h-[540px] w-full bg-white"
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[640px] items-center justify-center rounded-[22px] border border-dashed border-[#cfe3ee] bg-[#f8fcfe] p-10 text-center">
                <div>
                  <XCircle className="mx-auto mb-3 h-10 w-10 text-[#7b93aa]" />
                  <h2 className="text-lg font-bold text-[#102a43]">No template selected</h2>
                  <p className="mt-2 text-sm text-[#64748b]">Select an approved form from the library to preview it inside this page.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

