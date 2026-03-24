"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { saveLegalArtifactScreen } from "@/lib/services/legalArtifact.service";

export default function PatientInteractionTabletScreen() {
    const { caseId } = useParams<{ caseId: string }>();
    const [language, setLanguage] = useState<"ar" | "en" | "bilingual">("bilingual");
    const [method, setMethod] = useState("tablet_signature");
    const [summary, setSummary] = useState("");
    const [questionsAnswered, setQuestionsAnswered] = useState(false);
    const [message, setMessage] = useState("");

    async function save() {
        setMessage("");
        try {
            await saveLegalArtifactScreen(caseId, "patient_interaction", {
                language,
                communication_method: method,
                interaction_summary: summary,
                questions_answered: questionsAnswered,
            });
            setMessage("Patient interaction saved.");
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Save failed");
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="Patient Interaction (Tablet Bilingual)"
                subtitle="Screen 5/7"
                workflowCaseNav={{ caseId, currentStage: "support_and_intervention", escalationRequired: false }}
                actions={<Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">Back</Link>}
            >
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm text-slate-700">Language / اللغة
                        <select value={language} onChange={(e) => setLanguage(e.target.value as "ar" | "en" | "bilingual")} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                            <option value="bilingual">Bilingual</option>
                            <option value="ar">Arabic</option>
                            <option value="en">English</option>
                        </select>
                    </label>
                    <label className="block text-sm text-slate-700">Interaction Method
                        <input value={method} onChange={(e) => setMethod(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm text-slate-700">Interaction Summary
                        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={questionsAnswered} onChange={(e) => setQuestionsAnswered(e.target.checked)} />
                        Questions answered and rights explained in selected language.
                    </label>
                    <button type="button" onClick={() => void save()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Save Interaction</button>
                    {message ? <p className="text-sm text-slate-700">{message}</p> : null}
                    <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/refusal-confirmation`} className="inline-block text-sm font-medium text-blue-700 hover:underline">Next: Refusal Confirmation</Link>
                </section>
            </AppShell>
        </AuthGuard>
    );
}
