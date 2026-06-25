"use client";

import { useMemo, useState } from "react";
import {
  Network,
  Search,
  ChevronRight,
  AlertTriangle,
  BookOpen,
  Stethoscope,
  Syringe,
  X,
  FileCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import SectionPanel from "@/components/ui/SectionPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ProcedureMappingV2 } from "@/lib/prototype/types";
import {
  PROCEDURE_MAPPINGS_V2,
  getMappingsByCategory,
  getMappingsBySpecialty,
  getProcedureDepartments,
  getProcedureSpecialties,
} from "@/lib/prototype/procedure-mapping-matrix";
import { CONSENT_CATEGORIES_V2 } from "@/lib/prototype/form-taxonomy";
import { getTemplateById, EDUCATION_ASSETS_V2 } from "@/lib/prototype/form-taxonomy";

function riskTone(risk: ProcedureMappingV2["riskLevel"]) {
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

function anesthesiaLabel(value: ProcedureMappingV2["anesthesiaImplication"]) {
  switch (value) {
    case "NONE":
      return "None";
    case "LOCAL":
      return "Local";
    case "SEDATION":
      return "Sedation";
    case "REGIONAL":
      return "Regional";
    case "GENERAL":
      return "General";
  }
}

export default function MappingMatrix() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [selected, setSelected] = useState<ProcedureMappingV2 | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base =
      category === "all" && specialty === "all"
        ? PROCEDURE_MAPPINGS_V2
        : category !== "all" && specialty !== "all"
        ? PROCEDURE_MAPPINGS_V2.filter((m) => m.categoryCode === category && m.specialty === specialty)
        : category !== "all"
        ? getMappingsByCategory(category)
        : getMappingsBySpecialty(specialty);

    return base.filter((m) => {
      if (!term) return true;
      return (
        m.procedureNameEn.toLowerCase().includes(term) ||
        m.procedureNameAr.includes(term) ||
        m.procedureCode.toLowerCase().includes(term) ||
        m.department.toLowerCase().includes(term)
      );
    });
  }, [search, category, specialty]);

  const stats = useMemo(() => {
    return {
      total: PROCEDURE_MAPPINGS_V2.length,
      critical: PROCEDURE_MAPPINGS_V2.filter((m) => m.riskLevel === "CRITICAL").length,
      withAnesthesia: PROCEDURE_MAPPINGS_V2.filter((m) => m.anesthesiaImplication !== "NONE").length,
      educationAssets: EDUCATION_ASSETS_V2.length,
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Procedure Mapping Engine"
        subtitle="Procedure-to-template matrix with risk, anesthesia, mandatory disclosures, education, and alternatives."
        badge="Prototype"
        icon={<Network className="h-7 w-7" />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mapped Procedures</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Critical Risk</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{stats.critical}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Requires Anesthesia</div>
          <div className="mt-1 text-2xl font-bold text-violet-700">{stats.withAnesthesia}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Education Assets</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.educationAssets}</div>
        </div>
      </div>

      <SectionPanel
        title="Mapping Matrix"
        subtitle={`${filtered.length} procedure mapping(s) match the current filters`}
        variant="elevated"
      >
        <div className="mb-4 flex flex-col gap-4 lg:flex-row">
          <div className="relative flex-[2]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search procedure, code, department…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="all">All categories</option>
              {CONSENT_CATEGORIES_V2.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.nameEn}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[12rem] flex-1">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Specialty</label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            >
              <option value="all">All specialties</option>
              {getProcedureSpecialties().map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm text-slate-700">
            <thead className="bg-slate-50/90">
              <tr>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Procedure
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Specialty / Dept
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Category
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Anesthesia
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Risk
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Templates
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No mappings match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const category = CONSENT_CATEGORIES_V2.find((c) => c.code === m.categoryCode);
                  return (
                    <tr
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className={`cursor-pointer border-t border-slate-100 transition-colors ${
                        selected?.id === m.id ? "bg-violet-50/60" : "hover:bg-blue-50/40"
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900">{m.procedureNameEn}</div>
                        <div className="text-xs text-slate-500">{m.procedureCode}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-700">{m.specialty}</div>
                        <div className="text-xs text-slate-500">{m.department}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-slate-700">{category?.nameEn}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          <Syringe className="h-3.5 w-3.5 text-slate-400" />
                          {anesthesiaLabel(m.anesthesiaImplication)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge variant={riskTone(m.riskLevel)}>{m.riskLevel}</StatusBadge>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {m.recommendedTemplateIds.map((id) => {
                            const tpl = getTemplateById(id);
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600"
                              >
                                <FileCheck className="h-3 w-3" />
                                {tpl?.templateCode ?? id}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selected.procedureNameEn}</h3>
                <p className="text-sm text-slate-500" dir="rtl">
                  {selected.procedureNameAr}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Category</div>
                <div className="text-sm font-medium text-slate-800">
                  {CONSENT_CATEGORIES_V2.find((c) => c.code === selected.categoryCode)?.nameEn}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Anesthesia</div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
                  <Syringe className="h-3.5 w-3.5 text-slate-400" />
                  {anesthesiaLabel(selected.anesthesiaImplication)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Risk Level</div>
                <div>
                  <StatusBadge variant={riskTone(selected.riskLevel)}>{selected.riskLevel}</StatusBadge>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileCheck className="h-4 w-4 text-violet-600" />
                Recommended Forms
              </h4>
              <ul className="space-y-2">
                {selected.recommendedTemplateIds.map((id) => {
                  const tpl = getTemplateById(id);
                  return (
                    <li key={id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                      <div className="font-medium text-slate-800">{tpl?.titleEn ?? id}</div>
                      <div className="text-xs text-slate-500">{tpl?.templateCode ?? id}</div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mb-5">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Mandatory Disclosures
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                {selected.mandatoryDisclosures.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>

            <div className="mb-5 grid gap-5 md:grid-cols-2">
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Stethoscope className="h-4 w-4 text-sky-600" />
                  Common Alternatives
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {selected.commonAlternatives.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BookOpen className="h-4 w-4 text-emerald-600" />
                  Refusal Consequences
                </h4>
                <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
                  {selected.refusalConsequences.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Recommended Education
              </h4>
              <div className="flex flex-wrap gap-2">
                {selected.educationAssetIds.map((id) => {
                  const asset = EDUCATION_ASSETS_V2.find((a) => a.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                    >
                      <BookOpen className="h-3 w-3" />
                      {asset?.titleEn ?? id}
                      {asset?.durationMinutes ? ` · ${asset.durationMinutes}m` : ""}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
