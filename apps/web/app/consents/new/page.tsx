"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PlusCircle } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
};

export default function NewConsentPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [caseId, setCaseId] = useState("");

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases?limit=100")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCases(list);
        if (list.length > 0) {
          setCaseId(list[0].id);
        }
      })
      .catch(() => setCases([]));
  }, []);

  return (
    <AuthGuard>
      <AppShell
        title="Start Consent Flow"
        subtitle="Select a case to initiate informed consent and signature capture."
        actions={
          <Link
            href="/cases/new"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
          >
            <PlusCircle className="h-4 w-4" />
            Create New Case
          </Link>
        }
      >
        <div className="max-w-xl rounded-2xl border border-slate-200 p-5">
          <label className="block text-sm font-medium text-slate-700">Case</label>
          <select
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {cases.map((item) => (
              <option key={item.id} value={item.id}>
                {(item.caseNumber || item.id) + " - " + (item.patientName || "-")}
              </option>
            ))}
          </select>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={!caseId}
              onClick={() => {
                if (!caseId) {
                  return;
                }
                router.push(`/cases/${caseId}/informed-consent`);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Open Informed Consent
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              disabled={!caseId}
              onClick={() => {
                if (!caseId) {
                  return;
                }
                router.push(`/cases/${caseId}/refusal-form`);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Open Refusal Form
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
