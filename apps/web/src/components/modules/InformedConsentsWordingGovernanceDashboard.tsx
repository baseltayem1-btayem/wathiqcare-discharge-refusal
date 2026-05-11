"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type ModuleAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

type Row = {
  wordingId: string;
  wordingType: string;
  language: string;
  title: string;
  bodyAr: string;
  bodyEn: string;
  status: string;
  version: string;
  effectiveFrom: string | null;
  retiredAt: string | null;
  createdBy: string | null;
  approvedByLegal: string | null;
  approvedByMedical: string | null;
  approvedByCompliance: string | null;
  immutableSnapshotHash: string;
  comments: Array<{ reviewerId: string; stage: string; comment: string; timestamp: string }>;
  createdAt: string;
  updatedAt: string;
};

export default function InformedConsentsWordingGovernanceDashboard({ auth }: { auth: ModuleAuth }) {
  const { locale } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [compareWithId, setCompareWithId] = useState("");
  const [compareResult, setCompareResult] = useState<{ highlights: { arChanged: boolean; enChanged: boolean }; previous: Row; next: Row } | null>(null);

  const [draft, setDraft] = useState({ wordingType: "PATIENT_ACKNOWLEDGMENT", title: "", bodyAr: "", bodyEn: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await apiFetch<{ rows: Row[] }>("/api/modules/informed-consents/wording-governance");
      const nextRows = Array.isArray(result?.rows) ? result.rows : [];
      setRows(nextRows);
      setSelectedId((prev) => prev || nextRows[0]?.wordingId || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wording governance");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(() => rows.find((item) => item.wordingId === selectedId) || null, [rows, selectedId]);

  const queue = useMemo(() => {
    const items = {
      active: 0,
      draft: 0,
      pendingLegal: 0,
      pendingMedical: 0,
      pendingCompliance: 0,
      approved: 0,
      retired: 0,
    };

    for (const row of rows) {
      const status = row.status.toUpperCase();
      if (status === "ACTIVE") items.active += 1;
      if (status === "DRAFT") items.draft += 1;
      if (status === "PENDING_LEGAL_REVIEW") items.pendingLegal += 1;
      if (status === "PENDING_MEDICAL_REVIEW") items.pendingMedical += 1;
      if (status === "PENDING_COMPLIANCE_REVIEW") items.pendingCompliance += 1;
      if (status === "APPROVED") items.approved += 1;
      if (status === "RETIRED") items.retired += 1;
    }

    return items;
  }, [rows]);

  const runAction = useCallback(async (action: string, payload: Record<string, unknown>) => {
    setError("");
    setSuccess("");
    try {
      await apiFetch("/api/modules/informed-consents/wording-governance", {
        method: "POST",
        body: JSON.stringify({ action, payload }),
      });
      setSuccess(locale === "ar" ? "تم تنفيذ الإجراء" : "Action completed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    }
  }, [load, locale]);

  const runCompare = useCallback(async () => {
    if (!selectedId || !compareWithId) return;
    setError("");
    try {
      const result = await apiFetch<{ highlights: { arChanged: boolean; enChanged: boolean }; previous: Row; next: Row }>(
        "/api/modules/informed-consents/wording-governance",
        {
          method: "POST",
          body: JSON.stringify({
            action: "compare",
            payload: { previousWordingId: compareWithId, nextWordingId: selectedId },
          }),
        },
      );
      setCompareResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Compare failed");
    }
  }, [compareWithId, selectedId]);

  return (
    <ModuleShell
      auth={auth}
      moduleKey="informed-consents"
      title={{ ar: "حوكمة نصوص الموافقات", en: "Wording Governance" }}
      subtitle={{
        ar: "إدارة النصوص القانونية الثابتة والموافقات متعددة المراحل مع حماية عدم القابلية للتعديل.",
        en: "Manage immutable legal wording lifecycle with staged multi-committee approvals.",
      }}
    >
      <div className="space-y-4">
        {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
        {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div> : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Active</div><div className="text-xl font-semibold">{queue.active}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Draft</div><div className="text-xl font-semibold">{queue.draft}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Legal</div><div className="text-xl font-semibold">{queue.pendingLegal}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Medical</div><div className="text-xl font-semibold">{queue.pendingMedical}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Pending Compliance</div><div className="text-xl font-semibold">{queue.pendingCompliance}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Approved</div><div className="text-xl font-semibold">{queue.approved}</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-xs text-slate-500">Retired</div><div className="text-xl font-semibold">{queue.retired}</div></div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="text-sm font-semibold">Change History</div>
            <div className="max-h-[420px] overflow-y-auto space-y-2">
              {rows.map((row) => (
                <button
                  key={row.wordingId}
                  type="button"
                  onClick={() => setSelectedId(row.wordingId)}
                  className={`w-full rounded-lg border p-3 text-left ${selectedId === row.wordingId ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}
                >
                  <div className="font-medium">{row.title}</div>
                  <div className="text-xs text-slate-600">{row.wordingType} • {row.version} • {row.status}</div>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="text-sm font-semibold">Draft Wording Change</div>
              <input value={draft.wordingType} onChange={(e) => setDraft((p) => ({ ...p, wordingType: e.target.value }))} placeholder="Wording type" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              <input value={draft.title} onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              <textarea value={draft.bodyAr} onChange={(e) => setDraft((p) => ({ ...p, bodyAr: e.target.value }))} placeholder="Arabic wording" rows={4} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              <textarea value={draft.bodyEn} onChange={(e) => setDraft((p) => ({ ...p, bodyEn: e.target.value }))} placeholder="English wording" rows={4} className="w-full rounded border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" className="rounded border border-blue-300 px-3 py-2 text-sm text-blue-700" onClick={() => void runAction("create_draft", { wordingType: draft.wordingType, title: draft.title, bodyAr: draft.bodyAr, bodyEn: draft.bodyEn })}>Create Draft</button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
            <div className="text-sm font-semibold">Wording Details</div>
            {selected ? (
              <>
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <div><span className="text-slate-500">Wording ID:</span> {selected.wordingId}</div>
                  <div><span className="text-slate-500">Type:</span> {selected.wordingType}</div>
                  <div><span className="text-slate-500">Language:</span> {selected.language}</div>
                  <div><span className="text-slate-500">Version:</span> {selected.version}</div>
                  <div><span className="text-slate-500">Status:</span> {selected.status}</div>
                  <div><span className="text-slate-500">Immutable Hash:</span> <span className="text-xs">{selected.immutableSnapshotHash}</span></div>
                  <div><span className="text-slate-500">Legal:</span> {selected.approvedByLegal || "PENDING"}</div>
                  <div><span className="text-slate-500">Medical:</span> {selected.approvedByMedical || "PENDING"}</div>
                  <div><span className="text-slate-500">Compliance:</span> {selected.approvedByCompliance || "PENDING"}</div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 p-3 text-sm whitespace-pre-wrap">
                    <div className="mb-1 text-xs font-semibold text-slate-500">Arabic</div>
                    {selected.bodyAr}
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 text-sm whitespace-pre-wrap">
                    <div className="mb-1 text-xs font-semibold text-slate-500">English</div>
                    {selected.bodyEn}
                  </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => void runAction("review", { wordingId: selected.wordingId, stage: "LEGAL", decision: "APPROVED" })}>Legal Approve</button>
                  <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => void runAction("review", { wordingId: selected.wordingId, stage: "MEDICAL", decision: "APPROVED" })}>Medical Approve</button>
                  <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => void runAction("review", { wordingId: selected.wordingId, stage: "COMPLIANCE", decision: "APPROVED" })}>Compliance Approve</button>
                  <button type="button" className="rounded border border-amber-300 px-3 py-2 text-sm" onClick={() => void runAction("review", { wordingId: selected.wordingId, stage: "LEGAL", decision: "CHANGES_REQUESTED", comment: "Revision requested" })}>Request Revision</button>
                  <button type="button" className="rounded border border-blue-300 px-3 py-2 text-sm" onClick={() => void runAction("activate", { wordingId: selected.wordingId })}>Activate Version</button>
                  <button type="button" className="rounded border border-rose-300 px-3 py-2 text-sm" onClick={() => void runAction("retire", { wordingId: selected.wordingId })}>Retire Version</button>
                </div>

                <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                  <div className="text-sm font-semibold">Comparison View</div>
                  <div className="flex gap-2">
                    <select title="Select previous wording version" className="rounded border border-slate-300 px-3 py-2 text-sm" value={compareWithId} onChange={(e) => setCompareWithId(e.target.value)}>
                      <option value="">Select previous version</option>
                      {rows.filter((item) => item.wordingId !== selected.wordingId).map((item) => (
                        <option key={item.wordingId} value={item.wordingId}>{item.title} ({item.version})</option>
                      ))}
                    </select>
                    <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => void runCompare()}>Compare</button>
                  </div>

                  {compareResult ? (
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                      <div className="rounded border border-slate-200 p-2">
                        <div className="text-xs font-semibold text-slate-500">Previous</div>
                        <div className="whitespace-pre-wrap">{locale === "ar" ? compareResult.previous.bodyAr : compareResult.previous.bodyEn}</div>
                      </div>
                      <div className="rounded border border-slate-200 p-2">
                        <div className="text-xs font-semibold text-slate-500">New</div>
                        <div className="whitespace-pre-wrap">{locale === "ar" ? compareResult.next.bodyAr : compareResult.next.bodyEn}</div>
                      </div>
                      <div className="md:col-span-2 text-xs text-slate-600">
                        AR changed: {String(compareResult.highlights.arChanged)} | EN changed: {String(compareResult.highlights.enChanged)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-semibold mb-2">Reviewer Comments</div>
                  <div className="space-y-2 max-h-44 overflow-y-auto">
                    {selected.comments.map((comment, idx) => (
                      <div key={`${comment.timestamp}-${idx}`} className="rounded border border-slate-200 p-2 text-xs">
                        <div className="font-semibold">{comment.stage} • {comment.reviewerId}</div>
                        <div>{comment.comment}</div>
                        <div className="text-slate-500">{new Date(comment.timestamp).toLocaleString()}</div>
                      </div>
                    ))}
                    {selected.comments.length === 0 ? <div className="text-xs text-slate-500">No comments</div> : null}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500">Select wording entry.</div>
            )}
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}
