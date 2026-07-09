"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  FileSignature,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";

type ApprovedTemplate = {
  id: string;
  titleEn: string;
  titleAr: string;
  specialty?: string;
  procedure?: string;
  version?: string;
  pdfUrl?: string;
  approvedPdfUrl?: string;
  pdfTemplateUrl?: string;
  status?: string;
  approvalStatus?: string;
};

type Mapping = {
  id: string;
  fieldKey: string;
  fieldType: string;
  role?: string | null;
  labelEn?: string | null;
  labelAr?: string | null;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  required: boolean;
  isActive: boolean;
};

const FIELD_TYPES = [
  "PATIENT_SIGNATURE",
  "PATIENT_NAME",
  "PATIENT_MRN",
  "PATIENT_SIGNED_AT",
  "PHYSICIAN_SIGNATURE",
  "PHYSICIAN_NAME",
  "PHYSICIAN_LICENSE",
  "PHYSICIAN_SIGNED_AT",
  "GUARDIAN_SIGNATURE",
  "GUARDIAN_NAME",
  "WITNESS_SIGNATURE",
  "WITNESS_NAME",
  "INTERPRETER_SIGNATURE",
  "OTP_VERIFICATION_REF",
  "QR_VERIFICATION_CODE",
  "CONSENT_DOCUMENT_ID",
];

const DEFAULT_FORM = {
  fieldType: "PATIENT_SIGNATURE",
  fieldKey: "patientSignature",
  role: "patient",
  labelEn: "Patient Signature",
  labelAr: "توقيع المريض",
  pageNumber: "1",
  x: "0.10",
  y: "0.78",
  width: "0.30",
  height: "0.08",
  required: true,
};

function getTemplatePdfUrl(template: ApprovedTemplate | null): string {
  if (!template) return "";
  return (
    template.approvedPdfUrl ||
    template.pdfTemplateUrl ||
    template.pdfUrl ||
    ""
  );
}

function toCamelFieldKey(fieldType: string): string {
  return fieldType
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function normalizeNumberText(value: string): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return number.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

export default function SignatureMappingEditorScreen() {
  const [templates, setTemplates] = useState<ApprovedTemplate[]>([]);
  const [selectedFormId, setSelectedFormId] = useState("");
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingMappings, setLoadingMappings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState(DEFAULT_FORM);

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === selectedFormId) || null,
    [templates, selectedFormId],
  );

  const pdfUrl = getTemplatePdfUrl(selectedTemplate);

  async function loadTemplates() {
    setLoadingTemplates(true);
    setError(null);

    try {
      const response = await fetch("/api/modules/informed-consents/signature-mapping/forms", {
        cache: "no-store",
      });
      const body = await response.json();

      if (!response.ok || body.ok === false) {
        throw new Error(body.error || "Unable to load consent forms.");
      }

      const loadedTemplates: ApprovedTemplate[] = Array.isArray(body.templates)
        ? body.templates
        : Array.isArray(body.forms)
          ? body.forms
          : [];

      setTemplates(loadedTemplates);

      if (!selectedFormId && loadedTemplates.length > 0) {
        setSelectedFormId(loadedTemplates[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load consent forms.");
    } finally {
      setLoadingTemplates(false);
    }
  }

  async function loadMappings(formId: string) {
    if (!formId) return;

    setLoadingMappings(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/modules/informed-consents/forms/${encodeURIComponent(formId)}/signature-mapping`,
        { cache: "no-store" },
      );
      const body = await response.json();

      if (!response.ok || body.ok === false) {
        throw new Error(body.error || "Unable to load signature mappings.");
      }

      setMappings(Array.isArray(body.mappings) ? body.mappings : []);
    } catch (loadError) {
      setMappings([]);
      setError(loadError instanceof Error ? loadError.message : "Unable to load signature mappings.");
    } finally {
      setLoadingMappings(false);
    }
  }

  async function saveMapping() {
    if (!selectedFormId) {
      setError("Please select a consent form first.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const payload = {
        fieldType: draft.fieldType,
        fieldKey: draft.fieldKey || toCamelFieldKey(draft.fieldType),
        role: draft.role || null,
        labelEn: draft.labelEn || null,
        labelAr: draft.labelAr || null,
        pageNumber: Number(draft.pageNumber),
        x: Number(draft.x),
        y: Number(draft.y),
        width: Number(draft.width),
        height: Number(draft.height),
        required: draft.required,
      };

      const response = await fetch(
        `/api/modules/informed-consents/forms/${encodeURIComponent(selectedFormId)}/signature-mapping`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await response.json();

      if (!response.ok || body.ok === false) {
        throw new Error(body.error || "Unable to save signature mapping.");
      }

      setMessage("Signature field mapping saved successfully.");
      await loadMappings(selectedFormId);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save signature mapping.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedFormId) {
      void loadMappings(selectedFormId);
    }
  }, [selectedFormId]);

  function updateFieldType(fieldType: string) {
    setDraft((current) => ({
      ...current,
      fieldType,
      fieldKey: toCamelFieldKey(fieldType),
      labelEn: fieldType
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase()),
    }));
  }

  return (
    <main className="min-h-screen bg-[#F4F7FB] px-7 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#002B5C]">
              <FileSignature className="h-4 w-4" />
              WathiqCare Clinical Consent Platform
            </div>
            <h1 className="text-3xl font-bold text-[#101828]">
              Signature Field Mapping / تحديد مواضع التوقيع
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-[#667085]">
              Configure where electronic signatures, timestamps, patient identifiers, and verification evidence will be stamped on the approved hospital PDF consent forms.
            </p>
          </div>

          <Link
            href="/modules/informed-consents/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-[#D8DCE3] bg-white px-4 py-2.5 text-sm font-semibold text-[#002B5C] shadow-sm hover:bg-[#F8FAFC]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Settings
          </Link>
        </div>

        <section className="mb-5 rounded-2xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#101828]">
                <ShieldCheck className="h-5 w-5 text-[#002B5C]" />
                Approved PDF Form
              </h2>
              <p className="mt-1 text-sm text-[#667085]">
                Select the approved consent form before adding signature fields.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadTemplates()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D8DCE3] bg-white px-4 py-2 text-sm font-semibold text-[#002B5C] hover:bg-[#F8FAFC]"
            >
              {loadingTemplates ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#667085]">
                Consent Form
              </span>
              <select
                value={selectedFormId}
                onChange={(event) => setSelectedFormId(event.target.value)}
                className="w-full rounded-xl border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm font-semibold text-[#101828] outline-none focus:border-[#002B5C]"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.titleEn} — v{template.version || "1.0"}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] p-4">
              {selectedTemplate ? (
                <div className="grid gap-2 text-sm text-[#475467] md:grid-cols-2">
                  <div>
                    <span className="font-semibold text-[#101828]">English:</span> {selectedTemplate.titleEn}
                  </div>
                  <div dir="rtl">
                    <span className="font-semibold text-[#101828]">العربية:</span> {selectedTemplate.titleAr}
                  </div>
                  <div>
                    <span className="font-semibold text-[#101828]">Specialty:</span> {selectedTemplate.specialty || "—"}
                  </div>
                  <div>
                    <span className="font-semibold text-[#101828]">Procedure:</span> {selectedTemplate.procedure || "—"}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#667085]">No consent form selected.</p>
              )}
            </div>
          </div>
        </section>

        {(error || message) && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#101828]">PDF Preview</h2>
                <p className="text-sm text-[#667085]">
                  Current version shows the source PDF and the saved normalized mapping values.
                </p>
              </div>
              <span className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-bold text-[#002B5C]">
                Preview mode
              </span>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#D8DCE3] bg-[#F8FAFC]">
              {pdfUrl ? (
                <object
                  data={pdfUrl}
                  type="application/pdf"
                  className="h-[720px] w-full"
                  aria-label="Approved consent PDF preview"
                >
                  <embed src={pdfUrl} type="application/pdf" className="h-[720px] w-full" />
                  <div className="p-6 text-sm text-[#667085]">
                    Unable to render PDF inline. Open the PDF source directly from the browser.
                  </div>
                </object>
              ) : (
                <div className="flex h-[720px] items-center justify-center p-8 text-center text-sm text-[#667085]">
                  No PDF source is available for the selected consent form.
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-[#D8DCE3] bg-[#FCFCFD] p-4">
              <h3 className="mb-3 text-sm font-bold text-[#101828]">Saved fields</h3>
              {loadingMappings ? (
                <div className="flex items-center gap-2 text-sm text-[#667085]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading mappings...
                </div>
              ) : mappings.length ? (
                <div className="space-y-2">
                  {mappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="rounded-lg border border-[#E4E7EC] bg-white p-3 text-xs text-[#475467]"
                    >
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-[#101828]">{mapping.fieldType}</span>
                        <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 font-semibold">
                          Page {mapping.pageNumber}
                        </span>
                      </div>
                      <div className="grid gap-1 md:grid-cols-5">
                        <span>key: {mapping.fieldKey}</span>
                        <span>x: {mapping.x}</span>
                        <span>y: {mapping.y}</span>
                        <span>w: {mapping.width}</span>
                        <span>h: {mapping.height}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#667085]">No signature fields configured yet.</p>
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-[#D8DCE3] bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[#101828]">
              <Plus className="h-5 w-5 text-[#002B5C]" />
              Add Signature Field
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#667085]">
              Use normalized coordinates between 0 and 1. The next phase will replace manual entry with drag-and-drop boxes.
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#667085]">
                  Field Type
                </span>
                <select
                  value={draft.fieldType}
                  onChange={(event) => updateFieldType(event.target.value)}
                  className="w-full rounded-xl border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm font-semibold text-[#101828] outline-none focus:border-[#002B5C]"
                >
                  {FIELD_TYPES.map((fieldType) => (
                    <option key={fieldType} value={fieldType}>
                      {fieldType}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#667085]">
                  Field Key
                </span>
                <input
                  value={draft.fieldKey}
                  onChange={(event) => setDraft((current) => ({ ...current, fieldKey: event.target.value }))}
                  className="w-full rounded-xl border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm text-[#101828] outline-none focus:border-[#002B5C]"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#667085]">
                    Label EN
                  </span>
                  <input
                    value={draft.labelEn}
                    onChange={(event) => setDraft((current) => ({ ...current, labelEn: event.target.value }))}
                    className="w-full rounded-xl border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm text-[#101828] outline-none focus:border-[#002B5C]"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#667085]">
                    Label AR
                  </span>
                  <input
                    value={draft.labelAr}
                    dir="rtl"
                    onChange={(event) => setDraft((current) => ({ ...current, labelAr: event.target.value }))}
                    className="w-full rounded-xl border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm text-[#101828] outline-none focus:border-[#002B5C]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#667085]">
                  Role
                </span>
                <input
                  value={draft.role}
                  onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
                  className="w-full rounded-xl border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm text-[#101828] outline-none focus:border-[#002B5C]"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                {(["pageNumber", "x", "y", "width", "height"] as const).map((key) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-[#667085]">
                      {key}
                    </span>
                    <input
                      value={draft[key]}
                      onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                      onBlur={(event) => {
                        if (key !== "pageNumber") {
                          setDraft((current) => ({ ...current, [key]: normalizeNumberText(event.target.value) }));
                        }
                      }}
                      className="w-full rounded-xl border border-[#D8DCE3] bg-white px-3 py-2.5 text-sm text-[#101828] outline-none focus:border-[#002B5C]"
                    />
                  </label>
                ))}
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#475467]">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(event) => setDraft((current) => ({ ...current, required: event.target.checked }))}
                />
                Required field
              </label>

              <button
                type="button"
                onClick={saveMapping}
                disabled={saving || !selectedFormId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#002B5C] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#013A7A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Mapping
              </button>

              <div className="rounded-xl border border-[#E4E7EC] bg-[#FCFCFD] p-4 text-xs leading-5 text-[#667085]">
                <div className="mb-2 flex items-center gap-2 font-bold text-[#101828]">
                  <BadgeCheck className="h-4 w-4 text-[#002B5C]" />
                  Coordinate guide
                </div>
                <p>
                  x/y start from the top-left of the PDF page. width/height define the field box size. All values are normalized between 0 and 1.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
