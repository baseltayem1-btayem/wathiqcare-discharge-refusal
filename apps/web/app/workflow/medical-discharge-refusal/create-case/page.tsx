"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { createLegalArtifactCase } from "@/lib/services/legalArtifact.service";
import { apiFetch } from "@/utils/api";

type TenantIdentity = {
    displayName: string;
    legalName: string | null;
    licenseNumber: string | null;
    commercialRegistrationNumber: string | null;
    logoUrl: string | null;
    documentHeaderText: string | null;
    documentFooterText: string | null;
    legalDisclaimer: string | null;
};

type AuthMeResponse = {
    tenant: {
        name: string;
        logoUrl: string | null;
        identity: TenantIdentity;
    } | null;
};

export default function LegalArtifactCreateCasePage() {
    const router = useRouter();
    const [patientName, setPatientName] = useState("");
    const [patientMrn, setPatientMrn] = useState("");
    const [refusalReason, setRefusalReason] = useState("");
    const [attendingPhysicianName, setAttendingPhysicianName] = useState("");
    const [legalFooterText, setLegalFooterText] = useState(
        "This document is generated in alignment with Saudi MOH, CBAHI, JCI, PDPL, and Saudi E-Transactions Law.",
    );
    const [tenantBranding, setTenantBranding] = useState<AuthMeResponse["tenant"]>(null);
    const [brandingReady, setBrandingReady] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    useEffect(() => {
        let active = true;

        async function loadBranding() {
            try {
                const response = await apiFetch<AuthMeResponse>("/api/auth/me", {
                    method: "GET",
                    authFailureMode: "inline",
                });
                if (!active) {
                    return;
                }
                setTenantBranding(response.tenant);

                const footer = [
                    response.tenant?.identity.documentFooterText,
                    response.tenant?.identity.legalDisclaimer,
                ]
                    .filter((value): value is string => Boolean(value?.trim()))
                    .join("\n");

                if (footer) {
                    setLegalFooterText(footer);
                }
            } catch (err) {
                if (!active) {
                    return;
                }
                setMessage(err instanceof Error ? err.message : "Failed to load tenant branding");
            } finally {
                if (active) {
                    setBrandingReady(true);
                }
            }
        }

        void loadBranding();

        return () => {
            active = false;
        };
    }, []);

    async function submit() {
        if (!tenantBranding) {
            setMessage("Tenant branding is required before creating a legal artifact case.");
            return;
        }

        setSaving(true);
        setMessage("");
        try {
            const response = await createLegalArtifactCase({
                patient_mrn: patientMrn,
                patient_name: patientName,
                refusal_reason: refusalReason,
                attending_physician_name: attendingPhysicianName,
                tenant_header: {
                    logo_url: tenantBranding.logoUrl ?? tenantBranding.identity.logoUrl ?? "",
                    moh_license: tenantBranding.identity.licenseNumber ?? "",
                    commercial_registration: tenantBranding.identity.commercialRegistrationNumber ?? "",
                    hospital_name_ar: tenantBranding.identity.legalName ?? tenantBranding.identity.displayName,
                    hospital_name_en: tenantBranding.identity.displayName,
                    document_header_text: tenantBranding.identity.documentHeaderText ?? "",
                },
                legal_footer_text: legalFooterText,
            });
            router.push(`/workflow/medical-discharge-refusal/case/${response.case_id}/clinical-decision`);
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Failed to create legal artifact case");
        } finally {
            setSaving(false);
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="Create Legal Artifact Case"
                subtitle="Screen 2/7 - legally enforceable intake"
                actions={
                    <Link
                        href="/workflow/medical-discharge-refusal"
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-white"
                    >
                        Back to Dashboard
                    </Link>
                }
            >
                <section className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <label className="text-sm text-slate-700">
                            Patient Name
                            <input value={patientName} onChange={(e) => setPatientName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700">
                            MRN
                            <input value={patientMrn} onChange={(e) => setPatientMrn(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700 md:col-span-2">
                            Refusal Reason
                            <textarea value={refusalReason} onChange={(e) => setRefusalReason(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <label className="text-sm text-slate-700">
                            Attending Physician
                            <input value={attendingPhysicianName} onChange={(e) => setAttendingPhysicianName(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tenant Branding</p>
                            {!brandingReady ? (
                                <p className="mt-2 text-sm text-slate-600">Loading tenant legal identity...</p>
                            ) : tenantBranding ? (
                                <div className="mt-2 grid gap-2 md:grid-cols-2 text-sm text-slate-700">
                                    <p><span className="font-medium">Facility:</span> {tenantBranding.identity.displayName}</p>
                                    <p><span className="font-medium">Legal name:</span> {tenantBranding.identity.legalName || tenantBranding.identity.displayName}</p>
                                    <p><span className="font-medium">MOH license:</span> {tenantBranding.identity.licenseNumber || "Not configured"}</p>
                                    <p><span className="font-medium">CR:</span> {tenantBranding.identity.commercialRegistrationNumber || "Not configured"}</p>
                                    <p className="md:col-span-2"><span className="font-medium">Header text:</span> {tenantBranding.identity.documentHeaderText || "No tenant header text configured"}</p>
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-red-700">Unable to resolve tenant branding from the authenticated tenant profile.</p>
                            )}
                        </div>
                        <label className="text-sm text-slate-700 md:col-span-2">
                            Legal Footer
                            <textarea value={legalFooterText} onChange={(e) => setLegalFooterText(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
                        </label>
                    </div>

                    <button
                        type="button"
                        disabled={saving || !brandingReady || !tenantBranding}
                        onClick={() => void submit()}
                        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {saving ? "Creating..." : "Create Case"}
                    </button>
                    {message ? <p className="mt-2 text-sm text-red-700">{message}</p> : null}
                </section>
            </AppShell>
        </AuthGuard>
    );
}
