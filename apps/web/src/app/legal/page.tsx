"use client";
import React, { useEffect, useState } from "react";
import { Badge } from "../../components/design-system/badge";
import { Button } from "../../components/design-system/button";
import StepUpVerificationPanel from "../../components/security/StepUpVerificationPanel";
import AuthGuard from "../../components/AuthGuard";
import AccessDenied from "../../components/AccessDenied";

interface LegalCase {
    case_id: string;
    mrn: string;
    patient_name: string;
    physician: string;
    status: string;
    legal_package_generated: boolean;
    legal_package_version: number;
    last_generated_at: string | null;
    pushed_to_trakcare: boolean;
    workflow_stage: string;
}

const STATUS_LABELS: Record<string, string> = {
    draft: "Draft",
    ready_for_legal: "Ready for Legal",
    package_generated: "Package Generated",
    pushed_to_trakcare: "Pushed to TrakCare",
};

const FILTERS = [
    { label: "All", value: "all" },
    { label: "Ready for Legal", value: "ready_for_legal" },
    { label: "Package Generated", value: "package_generated" },
];

export default function LegalQueuePage() {
    const [cases, setCases] = useState<LegalCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState("all");
    const [roleChecked, setRoleChecked] = useState(false);
    const [hasRole, setHasRole] = useState(false);

    // Get user roles from /api/auth/me
    useEffect(() => {
        async function checkRole() {
            try {
                const res = await fetch("/api/auth/me", { credentials: "include" });
                if (!res.ok) throw new Error("Session invalid");
                const data = await res.json();
                // Accepts: { roles: ["legal", ...] }
                setHasRole(Array.isArray(data.roles) && (data.roles.includes("legal") || data.roles.includes("admin")));
            } catch {
                setHasRole(false);
            } finally {
                setRoleChecked(true);
            }
        }
        checkRole();
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);
        let url = "/api/legal/cases";
        if (filter === "ready_for_legal") {
            url += "?workflow_stage=ready_for_legal";
        } else if (filter === "package_generated") {
            url += "?package_generated=true";
        }
        fetch(url, {
            credentials: "include",
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load data");
                return res.json();
            })
            .then((data) => setCases(data))
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false));
    }, [filter]);

    const handleDownload = async (caseId: string) => {
        const res = await fetch(`/api/cases/${caseId}/legal-package/download`, {
            credentials: "include",
        });
        if (!res.ok) return alert("Failed to download legal package");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${caseId}_legal_package.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <AuthGuard authFailureMode="redirect">
            {!roleChecked ? (
                <div>Checking permissions...</div>
            ) : !hasRole ? (
                <AccessDenied resource="Legal Queue" />
            ) : (
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-4">Legal Queue</h1>
                    <div className="mb-4 max-w-2xl">
                        <StepUpVerificationPanel
                            actionKey="legal_package_export"
                            title="Legal evidence export verification"
                            description="Saudi medico-legal package downloads now require a short-lived verified step-up session."
                        />
                    </div>
                    <div className="mb-4 flex gap-2">
                        {FILTERS.map((f) => (
                            <Button
                                key={f.value}
                                variant={filter === f.value ? "default" : "outline"}
                                onClick={() => setFilter(f.value)}
                            >
                                {f.label}
                            </Button>
                        ))}
                    </div>
                    {loading ? (
                        <div>Loading...</div>
                    ) : error ? (
                        <div className="text-red-600">{error}</div>
                    ) : cases.length === 0 ? (
                        <div>No cases found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-2 border">Case #</th>
                                        <th className="p-2 border">MRN</th>
                                        <th className="p-2 border">Patient Name</th>
                                        <th className="p-2 border">Physician</th>
                                        <th className="p-2 border">Status</th>
                                        <th className="p-2 border">Legal Package</th>
                                        <th className="p-2 border">Version</th>
                                        <th className="p-2 border">Last Generated</th>
                                        <th className="p-2 border">Pushed to TrakCare</th>
                                        <th className="p-2 border">Workflow Stage</th>
                                        <th className="p-2 border">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cases.map((c) => (
                                        <tr key={c.case_id}>
                                            <td className="p-2 border">{c.case_id}</td>
                                            <td className="p-2 border">{c.mrn}</td>
                                            <td className="p-2 border">{c.patient_name}</td>
                                            <td className="p-2 border">{c.physician}</td>
                                            <td className="p-2 border">
                                                <Badge variant="outline">
                                                    {STATUS_LABELS[c.status] || c.status}
                                                </Badge>
                                            </td>
                                            <td className="p-2 border">
                                                {c.legal_package_generated ? (
                                                    <Badge variant="success">Yes</Badge>
                                                ) : (
                                                    <Badge variant="secondary">No</Badge>
                                                )}
                                            </td>
                                            <td className="p-2 border">{c.legal_package_version ?? "-"}</td>
                                            <td className="p-2 border">{c.last_generated_at ? new Date(c.last_generated_at).toLocaleString() : "-"}</td>
                                            <td className="p-2 border">
                                                {c.pushed_to_trakcare ? (
                                                    <Badge variant="success">Yes</Badge>
                                                ) : (
                                                    <Badge variant="secondary">No</Badge>
                                                )}
                                            </td>
                                            <td className="p-2 border">
                                                <Badge variant="outline">
                                                    {STATUS_LABELS[c.workflow_stage] || c.workflow_stage}
                                                </Badge>
                                            </td>
                                            <td className="p-2 border flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => window.location.href = `/cases/${c.case_id}`}>View Case</Button>
                                                {c.legal_package_generated && (
                                                    <Button size="sm" onClick={() => handleDownload(c.case_id)}>Download</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </AuthGuard>
    );
}
