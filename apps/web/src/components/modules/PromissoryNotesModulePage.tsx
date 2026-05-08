"use client";

import { useEffect, useMemo, useState } from "react";
import { FileWarning, Landmark, RefreshCw } from "lucide-react";
import ModuleShell from "@/components/ModuleShell";
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

type PromissoryItem = {
  id: string;
  noteNumber: string;
  caseId: string;
  debtorName: string;
  debtorIdNumber?: string | null;
  issuerName?: string | null;
  amount: string;
  currency: string;
  dueDate: string;
  status: string;
  createdAt: string;
  case?: {
    caseNumber?: string | null;
    patientName?: string | null;
  };
};

type PromissoryFormState = {
  caseId: string;
  debtorName: string;
  debtorIdNumber: string;
  issuerName: string;
  amount: string;
  currency: string;
  dueDate: string;
  documentVersion: string;
};

type PromissoryNotesView = "overview" | "list" | "create" | "archive";

function defaultDueDate(): string {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth.toISOString().slice(0, 10);
}

function defaultForm(caseId = ""): PromissoryFormState {
  return {
    caseId,
    debtorName: "",
    debtorIdNumber: "",
    issuerName: "",
    amount: "",
    currency: "SAR",
    dueDate: defaultDueDate(),
    documentVersion: "1.0",
  };
}

export default function PromissoryNotesModulePage({
  auth,
  view = "overview",
}: {
  auth: ModuleAuth;
  view?: PromissoryNotesView;
}) {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [records, setRecords] = useState<PromissoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState<PromissoryFormState>(defaultForm());

  const showCreatePane = view === "overview" || view === "create";
  const showRecordsPane = view === "overview" || view === "list" || view === "archive";

  const menuItems = useMemo(
    () => [
      { href: "/modules/promissory-notes", label: { ar: "وحدة السندات", en: "Promissory Console" } },
      { href: "/modules/promissory-notes/list", label: { ar: "قائمة السندات", en: "Notes List" } },
      { href: "/modules/promissory-notes/create", label: { ar: "إنشاء سند", en: "Create Note" } },
      { href: "/modules/promissory-notes/archive", label: { ar: "أرشيف السندات", en: "Archive" } },
      { href: "/modules/discharge-refusal", label: { ar: "منصة رفض الخروج", en: "Discharge Refusal" } },
    ],
    [],
  );

  async function loadInitialData() {
    setLoading(true);
    setError("");

    try {
      const [caseList, promissoryList] = await Promise.all([
        apiFetch<CaseItem[]>("/api/cases?limit=100"),
        apiFetch<PromissoryItem[]>("/api/modules/promissory-notes?limit=100"),
      ]);

      const normalizedCases = Array.isArray(caseList) ? caseList : [];
      const normalizedNotes = Array.isArray(promissoryList) ? promissoryList : [];

      setCases(normalizedCases);
      setRecords(normalizedNotes);
      setForm((current) => {
        const selectedCaseId = current.caseId || normalizedCases[0]?.id || "";
        return { ...current, caseId: selectedCaseId };
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load promissory data");
    } finally {
      setLoading(false);
    }
  }

  async function refreshRecords() {
    setRefreshing(true);
    setError("");
    try {
      const notes = await apiFetch<PromissoryItem[]>("/api/modules/promissory-notes?limit=100");
      setRecords(Array.isArray(notes) ? notes : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to refresh promissory notes");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function handleCreateNote() {
    if (!form.caseId) {
      setError("Please select a case.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await apiFetch<PromissoryItem>("/api/modules/promissory-notes", {
        method: "POST",
        body: JSON.stringify({
          caseId: form.caseId,
          debtorName: form.debtorName,
          debtorIdNumber: form.debtorIdNumber || undefined,
          issuerName: form.issuerName || undefined,
          amount: form.amount,
          currency: form.currency,
          dueDate: form.dueDate,
          documentVersion: form.documentVersion,
          metadata: {
            source: "modules.promissory-notes",
          },
        }),
      });

      await refreshRecords();
      setForm(defaultForm(form.caseId));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create promissory note");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModuleShell
      auth={auth}
      moduleKey="promissory-notes"
      title={{ ar: "تطبيق السندات لأمر الإلكترونية", en: "Electronic Promissory Notes" }}
      subtitle={{
        ar: "وحدة إنتاجية لإدارة السندات الرقمية والتعهدات المالية المرتبطة بالحالات.",
        en: "Production-grade module for electronic promissory notes and financial undertakings.",
      }}
      menuItems={menuItems}
      nextAction={{ href: "/cases", label: "Open Case Registry", variant: "secondary" }}
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
        {error ? (
          <div className="wc-panel border-rose-200 bg-rose-50 text-sm text-rose-800">{error}</div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(360px,0.95fr)_minmax(0,1.25fr)]">
          {showCreatePane ? (
          <div className="wc-panel space-y-3">
            <div className="wc-panel-heading">Create Promissory Note</div>

            <label htmlFor="promissory-case" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Case</label>
            <select
              id="promissory-case"
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="promissory-debtor-name" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Debtor Name</label>
                <input
                  id="promissory-debtor-name"
                  value={form.debtorName}
                  onChange={(event) => setForm((current) => ({ ...current, debtorName: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="promissory-debtor-id" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Debtor ID Number</label>
                <input
                  id="promissory-debtor-id"
                  value={form.debtorIdNumber}
                  onChange={(event) => setForm((current) => ({ ...current, debtorIdNumber: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="promissory-amount" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Amount</label>
                <input
                  id="promissory-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="promissory-currency" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Currency</label>
                <input
                  id="promissory-currency"
                  value={form.currency}
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label htmlFor="promissory-due-date" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Due Date</label>
                <input
                  id="promissory-due-date"
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="promissory-issuer-name" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Issuer Name</label>
                <input
                  id="promissory-issuer-name"
                  value={form.issuerName}
                  onChange={(event) => setForm((current) => ({ ...current, issuerName: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="promissory-document-version" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Document Version</label>
              <input
                id="promissory-document-version"
                value={form.documentVersion}
                onChange={(event) => setForm((current) => ({ ...current, documentVersion: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                void handleCreateNote();
              }}
              disabled={saving || loading || !form.caseId || !form.debtorName || !form.amount}
              className="toolbar-btn toolbar-btn-primary"
            >
              <Landmark className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Issue Promissory Note"}</span>
            </button>
          </div>
          ) : null}

          {showRecordsPane ? (
          <div className="wc-panel space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="wc-panel-heading">{view === "archive" ? "Promissory Notes Archive" : "Promissory Notes Register"}</div>
              <span className="wc-module-pill">{records.length} records</span>
            </div>

            {loading ? <p className="text-sm text-slate-600">Loading promissory records...</p> : null}

            {!loading ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Note Number</th>
                      <th className="px-3 py-2 text-left">Case</th>
                      <th className="px-3 py-2 text-left">Debtor</th>
                      <th className="px-3 py-2 text-left">Amount</th>
                      <th className="px-3 py-2 text-left">Due Date</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(view === "archive"
                      ? records.filter((record) => {
                          const status = (record.status || "").toUpperCase();
                          return status === "CANCELED" || status === "REPAID" || status === "DEFAULTED";
                        })
                      : records
                    ).map((record) => (
                      <tr key={record.id} className="border-t border-slate-200">
                        <td className="px-3 py-2">{record.noteNumber}</td>
                        <td className="px-3 py-2">{record.case?.caseNumber || record.caseId}</td>
                        <td className="px-3 py-2">{record.debtorName}</td>
                        <td className="px-3 py-2">{record.amount + " " + record.currency}</td>
                        <td className="px-3 py-2">{new Date(record.dueDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2">{record.status}</td>
                      </tr>
                    ))}

                    {(view === "archive"
                      ? records.filter((record) => {
                          const status = (record.status || "").toUpperCase();
                          return status === "CANCELED" || status === "REPAID" || status === "DEFAULTED";
                        }).length === 0
                      : records.length === 0) ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                          <span className="inline-flex items-center gap-1.5">
                            <FileWarning className="h-4 w-4" />
                            {view === "archive"
                              ? "No archived promissory notes yet."
                              : "No promissory notes recorded yet."}
                          </span>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
          ) : null}
        </section>
      </div>
    </ModuleShell>
  );
}
