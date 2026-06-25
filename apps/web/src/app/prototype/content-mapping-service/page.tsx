"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  BookOpen,
  FileCheck,
  FileText,
  Link2,
  Search,
  Stethoscope,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import SectionPanel from "@/components/ui/SectionPanel";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  getProcedureOptions,
  getExampleWithBoth,
  getExampleConsentOnly,
  resolveContentByProcedureName,
  type ContentMappingResult,
} from "@/lib/prototype/content-mapping-service";

export default function ContentMappingServicePage() {
  const options = useMemo(() => getProcedureOptions(), []);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ContentMappingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options.slice(0, 12);
    return options.filter(
      (o) =>
        o.procedureNameEn.toLowerCase().includes(term) ||
        o.specialty.toLowerCase().includes(term)
    );
  }, [query, options]);

  function handleSelect(procedureName: string) {
    setQuery(procedureName);
    const result = resolveContentByProcedureName(procedureName);
    if (result.found) {
      setSelected(result);
      setError(null);
    } else {
      setSelected(null);
      setError(`No mapping found for "${procedureName}".`);
    }
  }

  function showExampleBoth() {
    const result = getExampleWithBoth();
    if (result.found) {
      setSelected(result);
      setQuery(result.procedureNameEn);
      setError(null);
    }
  }

  function showExampleConsentOnly() {
    const result = getExampleConsentOnly();
    if (result.found) {
      setSelected(result);
      setQuery(result.procedureNameEn);
      setError(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Content Mapping Service"
        subtitle="Prototype integration layer: procedure → education material → consent form using the approved-forms library."
        badge="Phase 43 Prototype"
        icon={<Link2 className="h-7 w-7" />}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mapped Procedures</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{options.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">With Education + Consent</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">
            {options.filter((o) => o.hasEducation).length}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consent Only</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">
            {options.filter((o) => !o.hasEducation).length}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Service Status</div>
          <div className="mt-1 text-2xl font-bold text-violet-700">Active</div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr,22rem]">
        <SectionPanel
          title="Resolve Content by Procedure"
          subtitle="Select a procedure to retrieve its mapped consent form and education material."
          variant="elevated"
        >
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search procedure…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>

          <div className="mb-6 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500">No matching procedures.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredOptions.map((option) => (
                  <li key={option.procedureId}>
                    <button
                      onClick={() => handleSelect(option.procedureNameEn)}
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-violet-50/60"
                    >
                      <span className="font-medium text-slate-800">{option.procedureNameEn}</span>
                      <span className="text-xs text-slate-500">{option.specialty}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          {selected?.found && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 text-violet-700">
                    <Stethoscope className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{selected.procedureNameEn}</div>
                    <div className="text-xs text-slate-500">{selected.specialty} · {selected.department}</div>
                  </div>
                </div>
                <StatusBadge variant={selected.educationMaterial ? "completed" : "warning"}>
                  {selected.educationMaterial ? "Both" : "Consent only"}
                </StatusBadge>
              </div>

              <div className="mb-4 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Category</div>
                  <div className="font-medium text-slate-800">{selected.categoryCode}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Language</div>
                  <div className="font-medium text-slate-800">{selected.language}</div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Version</div>
                  <div className="font-medium text-slate-800">{selected.version}</div>
                </div>
              </div>

              <div className="space-y-4">
                {selected.educationMaterial && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
                      <BookOpen className="h-4 w-4" />
                      Education Material
                    </div>
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-emerald-600" />
                      <div>
                        <div className="text-sm font-medium text-slate-900">{selected.educationMaterial.fileName}</div>
                        <div className="text-xs text-slate-500">{selected.educationMaterial.publicPath}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <ArrowDown className="h-5 w-5 text-slate-300" />
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <FileCheck className="h-4 w-4" />
                    Consent Form
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="text-sm font-medium text-slate-900">{selected.consentForm.fileName}</div>
                      <div className="text-xs text-slate-500">{selected.consentForm.publicPath}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SectionPanel>

        <SectionPanel
          title="Quick Examples"
          subtitle="Click to load a pre-mapped example."
          variant="elevated"
        >
          <div className="space-y-4">
            <button
              onClick={showExampleBoth}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Both: Education + Consent</span>
                <StatusBadge variant="completed">Complete</StatusBadge>
              </div>
              <p className="text-sm text-slate-600">
                Loads the first procedure that has a mapped patient education material and consent form.
              </p>
            </button>

            <button
              onClick={showExampleConsentOnly}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Consent Only</span>
                <StatusBadge variant="warning">Consent only</StatusBadge>
              </div>
              <p className="text-sm text-slate-600">
                Loads the first procedure that has only a consent form and no mapped education material.
              </p>
            </button>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="mb-2 font-semibold text-slate-800">Flow</div>
              <div className="flex flex-col items-center gap-2">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  Procedure
                </div>
                <ArrowDown className="h-4 w-4 text-slate-300" />
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  Education Material
                </div>
                <ArrowDown className="h-4 w-4 text-slate-300" />
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                  Consent Form
                </div>
              </div>
            </div>
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Service Contract"
        subtitle="Input / Output for the Content Mapping Service"
        variant="bordered"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-900">Input</div>
            <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
{`{
  "procedure": "Abdominal Aortic Aneurysm"
}`}
            </pre>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-900">Output</div>
            <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
{`{
  "found": true,
  "procedureNameEn": "Abdominal Aortic Aneurysm",
  "specialty": "General / Other",
  "language": "bilingual",
  "version": "v1.0",
  "consentForm": {
    "fileName": "Abdominal Aortic Aneurysm.pdf",
    "publicPath": "/imc-consent-library/Abdominal%20Aortic%20Aneurysm.pdf",
    "kind": "CONSENT_FORM"
  },
  "educationMaterial": {
    "fileName": "Abdominal Aortic Aneurysm - Patient Copy.pdf",
    "publicPath": "/imc-consent-library/Abdominal%20Aortic%20Aneurysm%20-%20Patient%20Copy.pdf",
    "kind": "EDUCATION_MATERIAL"
  }
}`}
            </pre>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}
