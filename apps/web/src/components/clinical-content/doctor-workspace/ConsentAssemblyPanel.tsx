"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, BookOpen, AlertTriangle, BrainCircuit } from "lucide-react";
import type { ConsentAssembly } from "@/lib/clinical-content/types";

type AuthMe = {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  specialty?: string | null;
  department?: string | null;
  licenseNumber?: string | null;
};

export type ConsentAssemblyPanelProps = {
  tenantId: string;
  procedureName: string;
  initialAssembly?: ConsentAssembly | null;
};

export default function ConsentAssemblyPanel({ tenantId, procedureName, initialAssembly }: ConsentAssemblyPanelProps) {
  const [assembly, setAssembly] = useState<ConsentAssembly | null>(initialAssembly || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAssembly) {
      setAssembly(initialAssembly);
      return;
    }

    if (!procedureName.trim()) {
      setAssembly(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const mePayload = await meResponse.json().catch(() => null);
        const me: AuthMe = mePayload?.user || mePayload || {};

        const response = await fetch("/api/modules/clinical-content/assemble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenantId,
            procedureName,
            patientContext: {
              capacityStatus: "competent",
              languagePreference: "bilingual",
            },
            physicianContext: {
              physicianId: me.userId || "unknown",
              name: me.name || me.email || "Physician",
              licenseNumber: me.licenseNumber || "",
              specialty: me.specialty || "",
              department: me.department || "",
            },
            preferredLanguage: "bilingual",
            includeEducation: true,
            includeDecisionSupport: true,
          }),
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to assemble consent");
        }

        if (cancelled) return;
        setAssembly(payload.assembly);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Assembly failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [procedureName, tenantId, initialAssembly]);

  if (loading) return <div className="text-sm text-slate-500">Assembling consent package…</div>;
  if (error)
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertCircle className="mb-1 inline h-4 w-4" /> {error}
      </div>
    );
  if (!assembly) return <div className="text-sm text-slate-500">Select a procedure to assemble consent.</div>;

  const isBlocked = assembly.status === "blocked";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {isBlocked ? (
          <AlertCircle className="h-5 w-5 text-red-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        )}
        <span className={isBlocked ? "text-red-700" : "text-emerald-700"}>
          Consent Assembly — {assembly.procedureName} ({assembly.status.toUpperCase()})
        </span>
      </div>

      {assembly.blockers.length > 0 ? (
        <div className="space-y-2">
          {assembly.blockers.map((blocker) => (
            <div
              key={blocker.key}
              className={`rounded-md border p-3 text-sm ${
                blocker.severity === "blocking"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              <AlertTriangle className="mb-1 inline h-4 w-4" /> {blocker.messageEn}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileText className="h-4 w-4 text-sky-600" /> Consent Form
          </div>
          <p className="text-sm font-medium text-slate-700">{assembly.consentForm.titleEn}</p>
          <p className="text-xs text-slate-500">{assembly.consentForm.summaryEn}</p>
        </div>

        {assembly.educationMaterial ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <BookOpen className="h-4 w-4 text-sky-600" /> Patient Education
            </div>
            <p className="text-sm text-slate-700">{assembly.educationMaterial.titleEn}</p>
          </div>
        ) : null}
      </div>

      {assembly.suggestions.length > 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <BrainCircuit className="h-4 w-4 text-sky-600" /> Clinical Decision Support
          </div>
          <ul className="space-y-2">
            {assembly.suggestions.map((s) => (
              <li
                key={s.id}
                className={`rounded border p-2 text-xs ${
                  s.severity === "critical"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : s.severity === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                <span className="font-semibold uppercase">{s.type.replace(/-/g, " ")}:</span>{" "}
                {s.messageEn}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
