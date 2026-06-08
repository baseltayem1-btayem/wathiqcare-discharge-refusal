"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileText,
  Filter,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  imcApprovedConsentLibraryGenerated,
  type ImcApprovedConsentLibraryItem,
} from "./imcApprovedConsentLibrary.generated";

const approvedTemplates: ImcApprovedConsentLibraryItem[] = imcApprovedConsentLibraryGenerated;

const departments = Array.from(
  new Set(approvedTemplates.map((item) => item.department).filter(Boolean)),
).sort();

const specialties = Array.from(
  new Set(approvedTemplates.map((item) => item.specialty).filter(Boolean)),
).sort();

const consentTypes = Array.from(
  new Set(approvedTemplates.map((item) => item.consentType).filter(Boolean)),
).sort();

function normalize(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function formatConsentType(value: string | null | undefined) {
  return (value || "GENERAL_CONSENT")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ConsentSearchEngine() {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("ALL");
  const [specialty, setSpecialty] = useState("ALL");
  const [consentType, setConsentType] = useState("ALL");

  const filteredTemplates = useMemo(() => {
    const q = normalize(query);

    return approvedTemplates.filter((template) => {
      const matchesDepartment = department === "ALL" || template.department === department;
      const matchesSpecialty = specialty === "ALL" || template.specialty === specialty;
      const matchesConsentType = consentType === "ALL" || template.consentType === consentType;

      const searchableText = [
        template.id,
        template.titleEn,
        template.titleAr,
        template.specialty,
        template.department,
        template.categoryCode,
        template.consentType,
        template.templateType,
        template.version,
        template.hospitalPdfFilename,
        template.patientEducationPdfFilename,
        ...template.keywords,
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || searchableText.includes(q);

      return (
        template.status === "ACTIVE" &&
        matchesDepartment &&
        matchesSpecialty &&
        matchesConsentType &&
        matchesQuery
      );
    });
  }, [query, department, specialty, consentType]);

  const educationCount = approvedTemplates.filter((item) => item.educationMaterialAvailable).length;
  const anesthesiaCount = approvedTemplates.filter((item) => item.anesthesiaRequired).length;

  return (
    <section className="min-w-0" dir="auto">
      <div className="overflow-hidden rounded-[30px] border border-[#D8DCE3] bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
        <div className="border-b border-[#E5E7EB] bg-[linear-gradient(135deg,#002B5C_0%,#123E76_100%)] px-5 py-5 text-white">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#C9A13B]">
                IMC Approved Consent Library
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">
                Smart Consent Search / محرك بحث الموافقات المعتمدة
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/80">
                Search the generated IMC approved PDF library, including hospital consent files and linked patient education copies.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-4">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xl font-extrabold">{approvedTemplates.length}</p>
                <p className="text-[11px] font-semibold text-white/70">Approved Models</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xl font-extrabold">{educationCount}</p>
                <p className="text-[11px] font-semibold text-white/70">Education Copies</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xl font-extrabold">{departments.length}</p>
                <p className="text-[11px] font-semibold text-white/70">Departments</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3">
                <p className="text-xl font-extrabold">{anesthesiaCount}</p>
                <p className="text-[11px] font-semibold text-white/70">Anesthesia Flag</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 bg-[#F4F7FB] p-5 xl:grid-cols-[minmax(0,1fr)_220px_220px_220px]">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#002B5C]">
              <Search className="h-4 w-4" />
              Search by procedure, file name, Arabic/English keyword
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Example: colonoscopy, anesthesia, منظار, نقل الدم..."
              className="h-12 w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#172033] outline-none transition focus:border-[#4B9CD3] focus:ring-4 focus:ring-[#4B9CD3]/15"
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#002B5C]">
              <Filter className="h-4 w-4" />
              Department
            </span>
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#172033] outline-none transition focus:border-[#4B9CD3] focus:ring-4 focus:ring-[#4B9CD3]/15"
            >
              <option value="ALL">All departments</option>
              {departments.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#002B5C]">
              <Filter className="h-4 w-4" />
              Specialty
            </span>
            <select
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#172033] outline-none transition focus:border-[#4B9CD3] focus:ring-4 focus:ring-[#4B9CD3]/15"
            >
              <option value="ALL">All specialties</option>
              {specialties.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-extrabold text-[#002B5C]">
              <Filter className="h-4 w-4" />
              Consent Type
            </span>
            <select
              value={consentType}
              onChange={(event) => setConsentType(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 text-sm font-semibold text-[#172033] outline-none transition focus:border-[#4B9CD3] focus:ring-4 focus:ring-[#4B9CD3]/15"
            >
              <option value="ALL">All consent types</option>
              {consentTypes.map((item) => (
                <option key={item} value={item}>
                  {formatConsentType(item)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="border-b border-[#E5E7EB] px-5 py-3 text-sm font-bold text-[#002B5C]">
          Showing {filteredTemplates.length} of {approvedTemplates.length} approved models
        </div>

        <div className="grid gap-4 p-5 xl:grid-cols-2">
          {filteredTemplates.map((template) => (
            <article
              key={template.id}
              className="rounded-[24px] border border-[#D8DCE3] bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:border-[#4B9CD3] hover:shadow-[0_16px_36px_rgba(0,43,92,0.1)]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#002B5C] text-white">
                    <FileText className="h-6 w-6" />
                  </div>

                  <div>
                    <h3 className="text-lg font-extrabold text-[#002B5C]">
                      {template.titleEn}
                    </h3>

                    {template.titleAr ? (
                      <p className="mt-1 text-sm font-bold text-[#2F2F2F]" dir="rtl">
                        {template.titleAr}
                      </p>
                    ) : null}

                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                      {template.department} • {template.specialty} • {template.version}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Active
                </span>
              </div>

              <div className="mt-4 grid gap-3 text-sm lg:grid-cols-3">
                <div className="rounded-2xl bg-[#F4F7FB] p-3">
                  <p className="text-[11px] font-bold uppercase text-[#64748B]">Consent Type</p>
                  <p className="mt-1 font-extrabold text-[#002B5C]">
                    {formatConsentType(template.consentType)}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F4F7FB] p-3">
                  <p className="text-[11px] font-bold uppercase text-[#64748B]">Education</p>
                  <p className="mt-1 font-extrabold text-[#002B5C]">
                    {template.educationMaterialAvailable ? "Linked" : "Not linked"}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F4F7FB] p-3">
                  <p className="text-[11px] font-bold uppercase text-[#64748B]">Anesthesia</p>
                  <p className="mt-1 font-extrabold text-[#002B5C]">
                    {template.anesthesiaRequired ? "Required" : "Not required"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-xs font-semibold text-[#475569]">
                <p>
                  <span className="font-extrabold text-[#002B5C]">Hospital PDF:</span>{" "}
                  {template.hospitalPdfFilename}
                </p>
                <p>
                  <span className="font-extrabold text-[#002B5C]">Patient Copy:</span>{" "}
                  {template.patientEducationPdfFilename || "Not available"}
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-3 border-t border-[#E5E7EB] pt-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                  <Clock3 className="h-4 w-4 text-[#C9A13B]" />
                  Visit date and diagnosis can be synced from TrakCare during encounter selection.
                </div>

                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#002B5C] px-5 py-3 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(0,43,92,0.18)] transition hover:bg-[#123E76]"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Select for physician review
                </button>
              </div>
            </article>
          ))}

          {filteredTemplates.length === 0 ? (
            <div className="col-span-full rounded-[24px] border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-8 text-center">
              <BookOpenCheck className="mx-auto h-10 w-10 text-[#C9A13B]" />
              <p className="mt-3 text-lg font-extrabold text-[#002B5C]">
                No approved consent templates found
              </p>
              <p className="mt-2 text-sm text-[#64748B]">
                Try another keyword, department, specialty, consent type, Arabic term, or procedure name.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}


