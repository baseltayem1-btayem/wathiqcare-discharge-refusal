"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { saveLegalArtifactScreen, signLegalArtifact } from "@/lib/services/legalArtifact.service";

export default function RefusalConfirmationScreen() {
    const { caseId } = useParams<{ caseId: string }>();
    const [refusalReason, setRefusalReason] = useState("");
    const [alternativePlanOffered, setAlternativePlanOffered] = useState(true);
    const [witnessPresent, setWitnessPresent] = useState(true);

    const [patientName, setPatientName] = useState("");
    const [patientSignature, setPatientSignature] = useState("");
    const [physicianName, setPhysicianName] = useState("");
    const [physicianSignature, setPhysicianSignature] = useState("");
    const [witnessName, setWitnessName] = useState("");
    const [witnessSignature, setWitnessSignature] = useState("");
    const [guardianName, setGuardianName] = useState("");
    const [guardianSignature, setGuardianSignature] = useState("");
    const [captureGuardian, setCaptureGuardian] = useState(false);

    const [message, setMessage] = useState("");

    async function saveAndSign() {
        setMessage("");
        try {
            await saveLegalArtifactScreen(caseId, "refusal_confirmation", {
                refusal_reason: refusalReason,
                alternative_plan_offered: alternativePlanOffered,
                witness_present: witnessPresent,
            });

            await signLegalArtifact(caseId, {
                role: "patient",
                signature_value: patientSignature,
                signer_name: patientName,
                signer_role: "patient",
            });
            await signLegalArtifact(caseId, {
                role: "physician",
                signature_value: physicianSignature,
                signer_name: physicianName,
                signer_role: "physician",
            });
            await signLegalArtifact(caseId, {
                role: "witness",
                signature_value: witnessSignature,
                signer_name: witnessName,
                signer_role: "witness",
            });

            if (captureGuardian) {
                await signLegalArtifact(caseId, {
                    role: "guardian",
                    signature_value: guardianSignature,
                    signer_name: guardianName,
                    signer_role: "guardian",
                });
            }

            setMessage("Refusal confirmation and signatures recorded.");
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Operation failed");
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="Refusal Confirmation"
                subtitle="Screen 6/7 - signatures required"
                workflowCaseNav={{ caseId, currentStage: "official_notification", escalationRequired: false }}
                actions={<Link href={`/workflow/medical-discharge-refusal/case/${caseId}`} className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white">Back</Link>}
            >
                <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm text-slate-700">Refusal Reason
                        <textarea value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={alternativePlanOffered} onChange={(e) => setAlternativePlanOffered(e.target.checked)} />
                        Alternative plan offered
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={witnessPresent} onChange={(e) => setWitnessPresent(e.target.checked)} />
                        Witness present
                    </label>

                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm text-slate-700">Patient Name
                            <input value={patientName} onChange={(e) => setPatientName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700">Patient Signature
                            <input value={patientSignature} onChange={(e) => setPatientSignature(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700">Physician Name
                            <input value={physicianName} onChange={(e) => setPhysicianName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700">Physician Signature
                            <input value={physicianSignature} onChange={(e) => setPhysicianSignature(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700">Witness Name
                            <input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700">Witness Signature
                            <input value={witnessSignature} onChange={(e) => setWitnessSignature(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={captureGuardian} onChange={(e) => setCaptureGuardian(e.target.checked)} />
                        Add guardian signature (required if capacity is lacking)
                    </label>

                    {captureGuardian ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-sm text-slate-700">Guardian Name
                                <input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                            </label>
                            <label className="text-sm text-slate-700">Guardian Signature
                                <input value={guardianSignature} onChange={(e) => setGuardianSignature(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                            </label>
                        </div>
                    ) : null}

                    <button type="button" onClick={() => void saveAndSign()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">Save and Capture Signatures</button>
                    {message ? <p className="text-sm text-slate-700">{message}</p> : null}
                    <Link href={`/workflow/medical-discharge-refusal/case/${caseId}/final-review`} className="inline-block text-sm font-medium text-blue-700 hover:underline">Next: Final Review</Link>
                </section>
            </AppShell>
        </AuthGuard>
    );
}
