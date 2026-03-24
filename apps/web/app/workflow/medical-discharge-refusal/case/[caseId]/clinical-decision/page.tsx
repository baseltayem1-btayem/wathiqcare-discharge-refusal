"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { saveLegalArtifactScreen } from "@/lib/services/legalArtifact.service";

export default function ClinicalDecisionScreen() {
    const { caseId } = useParams<{ caseId: string }>();
    const [decisionAt, setDecisionAt] = useState("");
    const [clinicalRationale, setClinicalRationale] = useState("");
    const [capacityOutcome, setCapacityOutcome] = useState<"has_capacity" | "lacks_capacity">("has_capacity");
    const [capacityNotes, setCapacityNotes] = useState("");
    const [assessedBy, setAssessedBy] = useState("");
    const [message, setMessage] = useState("");

    async function save() {
        setMessage("");
        try {
            await saveLegalArtifactScreen(caseId, "clinical_decision", {
                discharge_decision_at: decisionAt,
                clinical_rationale: clinicalRationale,
                capacity_assessment: {
                    outcome: capacityOutcome,
                    notes: capacityNotes,
                    assessed_by: assessedBy,
                },
            });
            setMessage("Saved. Continue to mandatory risk disclosure.");
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Save failed");
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="Clinical Decision"
                subtitle="Screen 3/7"
                workflowCaseNav={{ caseId, currentStage: "medical_discharge_decision", escalationRequired: false }}
                actions={<Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">Back</Link>}
            >
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm text-slate-700">Decision Date/Time
                        <input type="datetime-local" value={decisionAt} onChange={(e) => setDecisionAt(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm text-slate-700">Clinical Rationale
                        <textarea value={clinicalRationale} onChange={(e) => setClinicalRationale(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm text-slate-700">Capacity Outcome
                        <select value={capacityOutcome} onChange={(e) => setCapacityOutcome(e.target.value as "has_capacity" | "lacks_capacity")} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                            <option value="has_capacity">Has Capacity</option>
                            <option value="lacks_capacity">Lacks Capacity (Guardian Required)</option>
                        </select>
                    </label>
                    <label className="block text-sm text-slate-700">Capacity Notes
                        <textarea value={capacityNotes} onChange={(e) => setCapacityNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm text-slate-700">Assessed By
                        <input value={assessedBy} onChange={(e) => setAssessedBy(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <button type="button" onClick={() => void save()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Save Clinical Decision</button>
                    {message ? <p className="text-sm text-slate-700">{message}</p> : null}
                    <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/risk-disclosure`} className="inline-block text-sm font-medium text-blue-700 hover:underline">Next: Risk Disclosure</Link>
                </section>
            </AppShell>
        </AuthGuard>
    );
}
