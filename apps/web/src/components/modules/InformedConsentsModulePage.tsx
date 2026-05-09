"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { FileCheck2, FileWarning, RefreshCw } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type ModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
};

type ConsentItem = {
  id: string;
  caseId: string;
  processingPurpose: string;
  lawfulBasis: string;
  consentType: string;
  consentMethod: "ELECTRONIC_SIGNATURE" | "OTP" | "WITNESS_ACKNOWLEDGMENT" | "WRITTEN" | string;
  documentVersion?: string | null;
  witnessName?: string | null;
  status: string;
  consentedAt: string;
  case?: {
    caseNumber?: string | null;
    patientName?: string | null;
  };
};

type ConsentFormState = {
  caseId: string;
  processingPurpose: string;
  lawfulBasis: string;
  consentType: string;
  consentMethod: string;
  documentVersion: string;
  witnessName: string;
};

type InformedConsentsView = "overview" | "list" | "create" | "archive" | "templates";

type FormTemplateItem = {
  id?: string;
  form_type?: string;
  formType?: string;
  name?: string;
  title?: string;
  language?: string;
  is_active?: boolean;
  isActive?: boolean;
  updated_at?: string;
  updatedAt?: string;
};

const DEFAULT_FORM: ConsentFormState = {
  caseId: "",
  processingPurpose: "Discharge refusal medico-legal processing",
  lawfulBasis: "PDPL healthcare and legal obligation basis",
  consentType: "informed_refusal_consent",
  consentMethod: "ELECTRONIC_SIGNATURE",
  documentVersion: "1.0",
  witnessName: "",
};

export default function InformedConsentsModulePage({
  auth,
  view = "overview",
}: {
  auth: ModuleAuth;
  view?: InformedConsentsView;
}) {
  const { isRtl } = useI18n();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [records, setRecords] = useState<ConsentItem[]>([]);
  const [templates, setTemplates] = useState<FormTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<ConsentFormState>(DEFAULT_FORM);

  const showCreatePane = view === "overview" || view === "create";
  const showRecordsPane = view === "overview" || view === "list" || view === "archive";
  const isTemplatesView = view === "templates";

  const menuItems = useMemo(
    () => [
      { href: "/modules/informed-consents", label: { ar: "لوحة الموافقات", en: "Consent Console" } },
      { href: "/modules/informed-consents/list", label: { ar: "قائمة الموافقات", en: "Consent List" } },
      { href: "/modules/informed-consents/create", label: { ar: "إنشاء موافقة", en: "Create Consent" } },
      { href: "/modules/informed-consents/archive", label: { ar: "الأرشيف", en: "Archive" } },
      { href: "/modules/informed-consents/templates", label: { ar: "القوالب", en: "Templates" } },
      { href: "/modules/discharge-refusal", label: { ar: "منصة رفض الخروج", en: "Discharge Refusal" } },
    ],
    [],
  );

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [caseList, consentList, templateList] = await Promise.all([
        apiFetch<CaseItem[]>("/api/cases?limit=100"),
        apiFetch<ConsentItem[]>("/api/modules/informed-consents?limit=100"),
        isTemplatesView
          ? apiFetch<FormTemplateItem[]>("/api/forms/templates").catch(() => [])
          : Promise.resolve([]),
      ]);

      const normalizedCases = Array.isArray(caseList) ? caseList : [];
      const normalizedRecords = Array.isArray(consentList) ? consentList : [];

      setCases(normalizedCases);
      setRecords(normalizedRecords);
      setTemplates(Array.isArray(templateList) ? templateList : []);
      setForm((current) => ({
        ...current,
        caseId: current.caseId || normalizedCases[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load informed consents data");
    } finally {
      setLoading(false);
    }
  }, [isTemplatesView]);

  async function refreshRecords() {
    setRefreshing(true);
    setError("");
    try {
      const consentList = await apiFetch<ConsentItem[]>("/api/modules/informed-consents?limit=100");
      setRecords(Array.isArray(consentList) ? consentList : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to refresh records");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  async function handleCreateConsent() {
    if (!form.caseId) {
      setError("Please select a case.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiFetch<ConsentItem>("/api/modules/informed-consents", {
        method: "POST",
        body: JSON.stringify({
          caseId: form.caseId,
          processingPurpose: form.processingPurpose,
          lawfulBasis: form.lawfulBasis,
          consentType: form.consentType,
          consentMethod: form.consentMethod,
          documentVersion: form.documentVersion,
          witnessName: form.witnessName || undefined,
          documentSnapshot: {
            processingPurpose: form.processingPurpose,
            lawfulBasis: form.lawfulBasis,
            consentType: form.consentType,
            consentMethod: form.consentMethod,
            documentVersion: form.documentVersion,
            witnessName: form.witnessName || null,
            createdFrom: "modules.informed-consents",
          },
        }),
      });

      await refreshRecords();
      setForm((current) => ({
        ...DEFAULT_FORM,
        caseId: current.caseId,
      }));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create consent record");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModuleShell
      auth={auth}
      moduleKey="informed-consents"
      title={{ ar: "تطبيق الموافقات المستنيرة", en: "Informed Consents" }}
      subtitle={{
        ar: "وحدة إنتاجية لإدارة موافقات المريض وإقراراته مع حفظ رقمي قابل للتدقيق.",
        en: "Production-grade module for patient consent capture and audit-ready legal records.",
      }}
      menuItems={menuItems}
      nextAction={{ href: "/cases", label: "Open Case Registry", variant: "secondary" }}
      quickActions={[
        { href: "/consents", label: "Legacy Consent Queue", variant: "secondary" },
      ]}
      toolbarExtras={
        <button
          type="button"
          onClick={() => {
            void refreshRecords();
          }}
          className="toolbar-btn toolbar-btn-secondary"
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Refreshing" : "Refresh"}</span>
        </button>
      }
    >
      <div className="space-y-4">
        <section className="wc-panel space-y-3">
          <div className="wc-panel-heading">{isRtl ? "ملخص الوحدة" : "Module Summary"}</div>
          <ul className="grid gap-2 text-sm text-slate-700 md:grid-cols-2">
            <li className="wc-panel wc-panel-inline">{isRtl ? "الغرض: إدارة الموافقات المستنيرة وإقرار المريض بشكل موثق." : "Purpose: manage informed consents and patient acknowledgment in a documented flow."}</li>
            <li className="wc-panel wc-panel-inline">{isRtl ? "سير العمل: إنشاء الموافقة، التوثيق، الأرشفة، والمتابعة." : "Workflow: create consent, record evidence, archive, and follow up."}</li>
            <li className="wc-panel wc-panel-inline">{isRtl ? "الوظائف الأساسية: القوالب، التسجيل، التوقيع، وسجل الموافقات." : "Key functions: templates, capture, signature method tracking, and consent register."}</li>
            <li className="wc-panel wc-panel-inline">{isRtl ? "الضوابط: امتثال PDPL، أدوار معتمدة، وتسلسل تدقيقي." : "Controls: PDPL-aware processing, role-based access, and audit sequence."}</li>
          </ul>
        </section>

        {error ? (
          <div className="wc-panel border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        ) : null}

        {isTemplatesView ? (
          <section className="wc-panel space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="wc-panel-heading">Consent Templates</div>
              <span className="wc-module-pill">{templates.length} templates</span>
            </div>
            {!loading ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Language</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => {
                      const templateType = template.form_type || template.formType || "-";
                      const templateName = template.name || template.title || "-";
                      const templateLanguage = template.language || "-";
                      const templateStatus = (template.is_active ?? template.isActive ?? true)
                        ? "active"
                        : "inactive";
                      const templateUpdated = template.updated_at || template.updatedAt;

                      return (
                        <tr key={template.id || `${templateType}-${templateName}`} className="border-t border-slate-200">
                          <td className="px-3 py-2">{templateType}</td>
                          <td className="px-3 py-2">{templateName}</td>
                          <td className="px-3 py-2">{templateLanguage}</td>
                          <td className="px-3 py-2">{templateStatus}</td>
                          <td className="px-3 py-2">{templateUpdated ? new Date(templateUpdated).toLocaleString() : "-"}</td>
                        </tr>
                      );
                    })}
                    {templates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <FileWarning className="h-4 w-4" />
                            No consent templates available.
                          </span>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="grid gap-4 xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.3fr)]">
          {showCreatePane ? (
            <div className="wc-panel space-y-3">
            <div className="wc-panel-heading">Create Consent Record</div>

            <label htmlFor="consent-case" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Case</label>
            <select
              id="consent-case"
              value={form.caseId}
              onChange={(event) => setForm((current) => ({ ...current, caseId: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {cases.map((item) => (
                <option key={item.id} value={item.id}>
                  {(item.caseNumber || item.id) + " - " + (item.patientName || "-")}
                </option>
              ))}
            </select>

            <label htmlFor="consent-purpose" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Processing Purpose</label>
            <input
              id="consent-purpose"
              value={form.processingPurpose}
              onChange={(event) => setForm((current) => ({ ...current, processingPurpose: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            <label htmlFor="consent-lawful-basis" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Lawful Basis</label>
            <input
              id="consent-lawful-basis"
              value={form.lawfulBasis}
              onChange={(event) => setForm((current) => ({ ...current, lawfulBasis: event.target.value }))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="consent-type" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Consent Type</label>
                <input
                  id="consent-type"
                  value={form.consentType}
                  onChange={(event) => setForm((current) => ({ ...current, consentType: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="consent-method" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Method</label>
                <select
                  id="consent-method"
                  value={form.consentMethod}
                  onChange={(event) => setForm((current) => ({ ...current, consentMethod: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="ELECTRONIC_SIGNATURE">Electronic Signature</option>
                  <option value="OTP">OTP</option>
                  <option value="WITNESS_ACKNOWLEDGMENT">Witness Acknowledgment</option>
                  <option value="WRITTEN">Written</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="consent-document-version" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Document Version</label>
                <input
                  id="consent-document-version"
                  value={form.documentVersion}
                  onChange={(event) => setForm((current) => ({ ...current, documentVersion: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="consent-witness-name" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Witness Name</label>
                <input
                  id="consent-witness-name"
                  value={form.witnessName}
                  onChange={(event) => setForm((current) => ({ ...current, witnessName: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                void handleCreateConsent();
              }}
              disabled={saving || loading || !form.caseId}
              className="toolbar-btn toolbar-btn-primary"
            >
              <FileCheck2 className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Record Consent"}</span>
            </button>
            </div>
          ) : null}

          {showRecordsPane ? (
          <div className="wc-panel space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="wc-panel-heading">{view === "archive" ? "Consent Archive" : "Recorded Consents"}</div>
              <span className="wc-module-pill">{records.length} records</span>
            </div>

            {loading ? <p className="text-sm text-slate-600">Loading informed consent records...</p> : null}

            {!loading ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Case</th>
                      <th className="px-3 py-2 text-left">Patient</th>
                      <th className="px-3 py-2 text-left">Method</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Recorded At</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(view === "archive"
                      ? records.filter((record) => (record.status || "").toLowerCase() !== "captured")
                      : records
                    ).map((record) => (
                      <tr key={record.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{record.case?.caseNumber || record.caseId}</td>
                        <td className="px-3 py-2">{record.case?.patientName || "-"}</td>
                        <td className="px-3 py-2">{record.consentMethod}</td>
                        <td className="px-3 py-2">{record.consentType}</td>
                        <td className="px-3 py-2">{new Date(record.consentedAt).toLocaleString()}</td>
                        <td className="px-3 py-2">{record.status}</td>
                      </tr>
                    ))}

                    {(view === "archive"
                      ? records.filter((record) => (record.status || "").toLowerCase() !== "captured").length === 0
                      : records.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <FileWarning className="h-4 w-4" />
                            {view === "archive"
                              ? "No archived consent records yet."
                              : "No informed consent records yet."}
                          </span>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}

            <div className="text-xs text-slate-500">
              Need case-level consent drafting? Continue using{" "}
              <Link href="/consents/new" className="font-medium text-cyan-700 hover:underline">
                legacy consent flow
              </Link>
              , while all captured records remain available in this module.
            </div>
          </div>
          ) : null}
        </section>
        )}
      </div>
    </ModuleShell>
  );
}
