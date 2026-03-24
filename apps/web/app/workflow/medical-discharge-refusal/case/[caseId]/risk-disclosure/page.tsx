"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { saveLegalArtifactScreen } from "@/lib/services/legalArtifact.service";

function toLines(value: string): string[] {
    return value
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
}

export default function RiskDisclosureScreen() {
    const { caseId } = useParams<{ caseId: string }>();
    const [riskEn, setRiskEn] = useState("");
    const [riskAr, setRiskAr] = useState("");
    const [disclosed, setDisclosed] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);
    const [message, setMessage] = useState("");

    async function save() {
        setMessage("");
        try {
            await saveLegalArtifactScreen(caseId, "risk_disclosure", {
                disclosed,
                patient_acknowledged: acknowledged,
                risk_items_en: toLines(riskEn),
                risk_items_ar: toLines(riskAr),
            });
            setMessage("Risk disclosure saved.");
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Save failed");
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="Mandatory Risk Disclosure"
                subtitle="Screen 4/7 - cannot be skipped"
                workflowCaseNav={{ caseId, currentStage: "initial_communication", escalationRequired: false }}
                actions={<Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">Back</Link>}
            >
                <section className="space-y-3 rounded-2xl border border-red-200 bg-white p-4">
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        Legal rule: submission is blocked unless risk disclosure is completed in both Arabic and English.
                    </p>
                    <label className="block text-sm text-slate-700">Risks (English), one item per line
                        <textarea value={riskEn} onChange={(e) => setRiskEn(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm text-slate-700">المخاطر (عربي)، عنصر لكل سطر
                        <textarea value={riskAr} onChange={(e) => setRiskAr(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" dir="rtl" />
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={disclosed} onChange={(e) => setDisclosed(e.target.checked)} />
                        I confirm risk disclosure was completed.
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
                        Patient acknowledged the disclosed risks.
                    </label>
                    <button type="button" onClick={() => void save()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Save Risk Disclosure</button>
                    {message ? <p className="text-sm text-slate-700">{message}</p> : null}
                    <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/patient-interaction`} className="inline-block text-sm font-medium text-blue-700 hover:underline">Next: Patient Interaction</Link>
                </section>
            </AppShell>
        </AuthGuard>
    );
}
