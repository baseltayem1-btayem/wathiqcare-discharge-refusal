"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import {
    finalizeLegalArtifact,
    generateLegalArtifactPdf,
    getLegalArtifactStatus,
    saveLegalArtifactScreen,
    type LegalArtifactStatus,
} from "@/lib/services/legalArtifact.service";

export default function FinalReviewScreen() {
    const { caseId } = useParams<{ caseId: string }>();
    const [reviewerName, setReviewerName] = useState("");
    const [reviewerRole, setReviewerRole] = useState("legal_admin");
    const [reviewSummary, setReviewSummary] = useState("");
    const [status, setStatus] = useState<LegalArtifactStatus | null>(null);
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!caseId) return;
        void getLegalArtifactStatus(caseId).then(setStatus).catch(() => undefined);
    }, [caseId]);

    async function saveFinalReview() {
        setMessage("");
        try {
            const updated = await saveLegalArtifactScreen(caseId, "final_review", {
                reviewer_name: reviewerName,
                reviewer_role: reviewerRole,
                review_summary: reviewSummary,
            });
            setStatus(updated);
            setMessage("Final review saved.");
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Save failed");
        }
    }

    async function finalize() {
        setMessage("");
        try {
            const updated = await finalizeLegalArtifact(caseId);
            setStatus(updated);
            setMessage("Case finalized and immutable lock enabled.");
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Finalize failed");
        }
    }

    async function generatePdf() {
        setMessage("");
        try {
            const result = await generateLegalArtifactPdf(caseId);
            setMessage(`Bilingual PDF generated: ${result.file_name}`);
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "PDF generation failed");
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="Final Review"
                subtitle="Screen 7/7 - finalize legal artifact"
                workflowCaseNav={{ caseId, currentStage: "escalation", escalationRequired: true }}
                actions={<Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">Back</Link>}
            >
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm text-slate-700">Reviewer Name
                        <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm text-slate-700">Reviewer Role
                        <input value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="block text-sm text-slate-700">Review Summary
                        <textarea value={reviewSummary} onChange={(e) => setReviewSummary(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>

                    {status ? (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            <p>Status: {status.status}</p>
                            <p>Escalation State: {status.escalation_state}</p>
                            <p>Missing Requirements: {status.missing_requirements.length}</p>
                            <p>Immutable Lock: {String(status.immutable_lock)}</p>
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => void saveFinalReview()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Save Review</button>
                        <button type="button" onClick={() => void generatePdf()} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Generate Bilingual PDF</button>
                        <button type="button" onClick={() => void finalize()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Finalize (Lock Case)</button>
                    </div>

                    {message ? <p className="text-sm text-slate-700">{message}</p> : null}
                </section>
            </AppShell>
        </AuthGuard>
    );
}
