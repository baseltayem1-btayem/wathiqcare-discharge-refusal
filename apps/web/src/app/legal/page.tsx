"use client";
import React, { useEffect, useState } from "react";
import { Badge } from "../../components/design-system/badge";
import { Button } from "../../components/design-system/button";
import StepUpVerificationPanel from "../../components/security/StepUpVerificationPanel";
import AuthGuard from "../../components/AuthGuard";
import AccessDenied from "../../components/AccessDenied";
import { useI18n } from "@/i18n/I18nProvider";

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
    const { lang } = useI18n();
    const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);
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
                if (!res.ok) throw new Error(txt("Session invalid", "الجلسة غير صالحة"));
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
                if (!res.ok) throw new Error(txt("Failed to load data", "تعذر تحميل البيانات"));
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
        if (!res.ok) return alert(txt("Failed to download legal package", "تعذر تنزيل الحزمة القانونية"));
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
                <div>{txt("Checking permissions...", "جارٍ التحقق من الصلاحيات...")}</div>
            ) : !hasRole ? (
                <AccessDenied resource={txt("Legal Queue", "الطابور القانوني")} />
            ) : (
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-4">{txt("Legal Queue", "الطابور القانوني")}</h1>
                    <div className="mb-4 max-w-2xl">
                        <StepUpVerificationPanel
                            actionKey="legal_package_export"
                            title={txt("Legal evidence export verification", "التحقق من تصدير الأدلة القانونية")}
                            description={txt("Saudi medico-legal package downloads now require a short-lived verified step-up session.", "تنزيل الحزم الطبية القانونية السعودية يتطلب الآن جلسة تحقق متقدم قصيرة المدة.")}
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
                        <div>{txt("Loading...", "جارٍ التحميل...")}</div>
                    ) : error ? (
                        <div className="text-red-600">{error}</div>
                    ) : cases.length === 0 ? (
                        <div>{txt("No cases found.", "لم يتم العثور على حالات.")}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-2 border">{txt("Case #", "رقم الحالة")}</th>
                                        <th className="p-2 border">MRN</th>
                                        <th className="p-2 border">{txt("Patient Name", "اسم المريض")}</th>
                                        <th className="p-2 border">{txt("Physician", "الطبيب")}</th>
                                        <th className="p-2 border">{txt("Status", "الحالة")}</th>
                                        <th className="p-2 border">{txt("Legal Package", "الحزمة القانونية")}</th>
                                        <th className="p-2 border">{txt("Version", "الإصدار")}</th>
                                        <th className="p-2 border">{txt("Last Generated", "آخر إنشاء")}</th>
                                        <th className="p-2 border">{txt("Pushed to TrakCare", "تم الإرسال إلى TrakCare")}</th>
                                        <th className="p-2 border">{txt("Workflow Stage", "مرحلة سير العمل")}</th>
                                        <th className="p-2 border">{txt("Actions", "الإجراءات")}</th>
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
                                                    <Badge variant="success">{txt("Yes", "نعم")}</Badge>
                                                ) : (
                                                    <Badge variant="secondary">{txt("No", "لا")}</Badge>
                                                )}
                                            </td>
                                            <td className="p-2 border">{c.legal_package_version ?? "-"}</td>
                                            <td className="p-2 border">{c.last_generated_at ? new Date(c.last_generated_at).toLocaleString() : "-"}</td>
                                            <td className="p-2 border">
                                                {c.pushed_to_trakcare ? (
                                                    <Badge variant="success">{txt("Yes", "نعم")}</Badge>
                                                ) : (
                                                    <Badge variant="secondary">{txt("No", "لا")}</Badge>
                                                )}
                                            </td>
                                            <td className="p-2 border">
                                                <Badge variant="outline">
                                                    {STATUS_LABELS[c.workflow_stage] || c.workflow_stage}
                                                </Badge>
                                            </td>
                                            <td className="p-2 border flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => window.location.href = `/cases/${c.case_id}`}>{txt("View Case", "عرض الحالة")}</Button>
                                                {c.legal_package_generated && (
                                                    <Button size="sm" onClick={() => handleDownload(c.case_id)}>{txt("Download", "تنزيل")}</Button>
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
