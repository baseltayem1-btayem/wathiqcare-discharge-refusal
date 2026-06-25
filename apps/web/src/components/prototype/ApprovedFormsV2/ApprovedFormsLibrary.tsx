"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Filter,
  FileText,
  ShieldAlert,
  Users,
  Globe,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import SectionPanel from "@/components/ui/SectionPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ConsentTemplateV2, RiskLevel } from "@/lib/prototype/types";
import {
  CONSENT_CATEGORIES_V2,
  CONSENT_TEMPLATES_V2,
  getCategoryByCode,
  getDepartments,
  getSpecialties,
  getConsentTypes,
} from "@/lib/prototype/form-taxonomy";

type FilterKey = "category" | "consentType" | "specialty" | "department" | "riskLevel" | "status";

const RISK_ORDER: Record<RiskLevel, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function riskTone(risk: RiskLevel) {
  switch (risk) {
    case "LOW":
      return "success";
    case "MEDIUM":
      return "info";
    case "HIGH":
      return "warning";
    case "CRITICAL":
      return "error";
  }
}

function statusVariant(status: ConsentTemplateV2["status"]) {
  switch (status) {
    case "IMC_APPROVED":
      return "completed";
    case "PILOT_READY":
      return "info";
    case "CLINICAL_REVIEW":
      return "warning";
    case "LEGAL_REVIEW":
      return "under-review";
    case "DRAFT":
      return "draft";
  }
}

function statusLabel(status: ConsentTemplateV2["status"]) {
  switch (status) {
    case "IMC_APPROVED":
      return "IMC Approved";
    case "PILOT_READY":
      return "Pilot Ready";
    case "CLINICAL_REVIEW":
      return "Clinical Review";
    case "LEGAL_REVIEW":
      return "Legal Review";
    case "DRAFT":
      return "Draft";
  }
}

export default function ApprovedFormsLibrary() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    category: "all",
    consentType: "all",
    specialty: "all",
    department: "all",
    riskLevel: "all",
    status: "all",
  });
  const [selected, setSelected] = useState<ConsentTemplateV2 | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return CONSENT_TEMPLATES_V2.filter((t) => {
      const matchesTerm =
        !term ||
        t.titleEn.toLowerCase().includes(term) ||
        t.titleAr.includes(term) ||
        t.templateCode.toLowerCase().includes(term) ||
        t.specialty.toLowerCase().includes(term);
      const matchesFilters =
        (filters.category === "all" || t.categoryCode === filters.category) &&
        (filters.consentType === "all" || t.consentType === filters.consentType) &&
        (filters.specialty === "all" || t.specialty === filters.specialty) &&
        (filters.department === "all" || t.department === filters.department) &&
        (filters.riskLevel === "all" || t.riskLevel === filters.riskLevel) &&
        (filters.status === "all" || t.status === filters.status);
      return matchesTerm && matchesFilters;
    }).sort((a, b) => {
      const catDiff =
        (getCategoryByCode(a.categoryCode)?.sortOrder ?? 99) -
        (getCategoryByCode(b.categoryCode)?.sortOrder ?? 99);
      if (catDiff !== 0) return catDiff;
      return RISK_ORDER[b.riskLevel] - RISK_ORDER[a.riskLevel];
    });
  }, [search, filters]);

  const stats = useMemo(() => {
    return {
      total: CONSENT_TEMPLATES_V2.length,
      approved: CONSENT_TEMPLATES_V2.filter((t) => t.status === "IMC_APPROVED").length,
      highOrCritical: CONSENT_TEMPLATES_V2.filter(
        (t) => t.riskLevel === "HIGH" || t.riskLevel === "CRITICAL"
      ).length,
      categories: CONSENT_CATEGORIES_V2.length,
    };
  }, []);

  function updateFilter(key: FilterKey, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function FilterSelect({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
  }) {
    return (
      <div className="min-w-[10rem] flex-1">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        >
          <option value="all">All</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Approved Forms V2"
        subtitle="Searchable consent taxonomy with category, specialty, risk, and approval-status filters."
        badge="Prototype"
        icon={<FileText className="h-7 w-7" />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Templates</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">IMC Approved</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{stats.approved}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">High / Critical Risk</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{stats.highOrCritical}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.categories}</div>
        </div>
      </div>

      <SectionPanel
        title="Template Library"
        subtitle={`${filtered.length} form(s) match the current filters`}
        action={
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            Taxonomy filters
          </div>
        }
        variant="elevated"
      >
        <div className="mb-4 flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-[2]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, code, specialty…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <FilterSelect
            label="Category"
            value={filters.category}
            options={CONSENT_CATEGORIES_V2.map((c) => c.code)}
            onChange={(v) => updateFilter("category", v)}
          />
          <FilterSelect
            label="Type"
            value={filters.consentType}
            options={getConsentTypes()}
            onChange={(v) => updateFilter("consentType", v)}
          />
          <FilterSelect
            label="Risk"
            value={filters.riskLevel}
            options={["LOW", "MEDIUM", "HIGH", "CRITICAL"]}
            onChange={(v) => updateFilter("riskLevel", v)}
          />
        </div>

        <div className="mb-4 flex flex-col gap-4 sm:flex-row">
          <FilterSelect
            label="Specialty"
            value={filters.specialty}
            options={getSpecialties()}
            onChange={(v) => updateFilter("specialty", v)}
          />
          <FilterSelect
            label="Department"
            value={filters.department}
            options={getDepartments()}
            onChange={(v) => updateFilter("department", v)}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            options={["IMC_APPROVED", "PILOT_READY", "CLINICAL_REVIEW", "LEGAL_REVIEW", "DRAFT"]}
            onChange={(v) => updateFilter("status", v)}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr,22rem]">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm text-slate-700">
              <thead className="bg-slate-50/90">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Form
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Risk
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                      No templates match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => {
                    const category = getCategoryByCode(t.categoryCode);
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelected(t)}
                        className={`cursor-pointer border-t border-slate-100 transition-colors ${
                          selected?.id === t.id ? "bg-violet-50/60" : "hover:bg-blue-50/40"
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-900">{t.titleEn}</div>
                          <div className="text-xs text-slate-500">{t.templateCode}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="text-slate-700">{category?.nameEn}</div>
                          <div className="text-xs text-slate-500">{t.consentType}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge variant={riskTone(t.riskLevel)}>{t.riskLevel}</StatusBadge>
                        </td>
                        <td className="px-4 py-3.5">
                          <StatusBadge variant={statusVariant(t.status)}>{statusLabel(t.status)}</StatusBadge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {selected ? (
              <>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{selected.titleEn}</h3>
                    <p className="text-sm text-slate-500">{selected.titleAr}</p>
                  </div>
                  <StatusBadge variant={statusVariant(selected.status)}>{statusLabel(selected.status)}</StatusBadge>
                </div>

                <div className="mb-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-700">Template code</div>
                      <div className="text-slate-600">{selected.templateCode}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-700">Version</div>
                      <div className="text-slate-600">{selected.version} · Bilingual</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-700">Risk level</div>
                      <div className="text-slate-600">{selected.riskLevel}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="mt-0.5 h-4 w-4 text-slate-400" />
                    <div>
                      <div className="font-medium text-slate-700">Requirements</div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {selected.requiresWitness && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                            Witness
                          </span>
                        )}
                        {selected.requiresGuardian && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                            Guardian
                          </span>
                        )}
                        {selected.requiresInterpreter && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                            Interpreter
                          </span>
                        )}
                        {selected.requiresSeparateConsent && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                            Separate consent
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <div className="mb-1 font-medium text-slate-900">Summary</div>
                  <p className="mb-2 leading-relaxed">{selected.summaryEn}</p>
                  <p className="leading-relaxed text-slate-600" dir="rtl">
                    {selected.summaryAr}
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Preview only — this prototype does not generate PDFs or trigger signatures.
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center text-slate-500">
                <CheckCircle2 className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm">Select a form from the list to preview its taxonomy metadata.</p>
              </div>
            )}
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
