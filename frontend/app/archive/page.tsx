"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import WorkflowProgress from "@/components/ui/WorkflowProgress";
import { buildMetadataWorkflowProgress } from "@/lib/workflowProgress";
import { apiFetch } from "@/utils/api";

type CaseItem = {
    id: string;
    patientName?: string | null;
    patient_name?: string;
    medicalRecordNo?: string | null;
    patient_mrn?: string;
    patientIdNumber?: string | null;
    patient_id_number?: string;
    status?: string | null;
    createdAt?: string | null;
    created_at?: string;
    signer_name?: string | null;
    signer_role?: string | null;
    signed_at?: string | null;
    pdf_file?: string | null;
    metadata?: Record<string, unknown> | null;
};

export default function ArchivePage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<CaseItem[]>([]);
    const [searched, setSearched] = useState(false);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) {
            return items;
        }

        return items.filter((item) => {
            const text = [
                item.patientName,
                item.patient_name,
                item.medicalRecordNo,
                item.patient_mrn,
                item.patientIdNumber,
                item.patient_id_number,
                item.id,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(q);
        });
    }, [items, query]);

    const rows = useMemo(
        () =>
            filtered.map((item) => ({
                item,
                workflow: buildMetadataWorkflowProgress({
                    status: item.status,
                    patientName: item.patientName,
                    patient_name: item.patient_name,
                    signer_name: item.signer_name,
                    signer_role: item.signer_role,
                    signed_at: item.signed_at,
                    pdf_file: item.pdf_file,
                    metadata: item.metadata,
                }),
            })),
        [filtered]
    );

    async function handleSearch() {
        setLoading(true);
        try {
            const data = await apiFetch<CaseItem[]>("/api/cases?limit=500");
            setItems(Array.isArray(data) ? data : []);
            setSearched(true);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AuthGuard>
            <AppShell
                title="الأرشيف"
                subtitle="البحث في الحالات السابقة بالاسم أو رقم الهوية أو رقم الملف"
                actions={
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        العودة للوحة التحكم
                    </Link>
                }
            >
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-2 md:flex-row">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ابحث بالاسم / الهوية / الملف الطبي / رقم القضية"
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => void handleSearch()}
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                            <Search className="h-4 w-4" />
                            {loading ? "جارٍ البحث..." : "بحث"}
                        </button>
                    </div>

                    {searched ? (
                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th className="px-3 py-2 text-start">رقم الملف</th>
                                        <th className="px-3 py-2 text-start">اسم المريض</th>
                                        <th className="px-3 py-2 text-start">تقدم المراحل</th>
                                        <th className="px-3 py-2 text-start">الحالة</th>
                                        <th className="px-3 py-2 text-start">التاريخ</th>
                                        <th className="px-3 py-2 text-start">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(({ item, workflow }) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-3 py-2">{item.medicalRecordNo || item.patient_mrn || "-"}</td>
                                            <td className="px-3 py-2">{item.patientName || item.patient_name || "-"}</td>
                                            <td className="px-3 py-2">
                                                {workflow.steps.length > 0 ? (
                                                    <WorkflowProgress
                                                        layout="scroll"
                                                        steps={workflow.steps}
                                                        language="ar"
                                                        direction="rtl"
                                                        currentStepId={workflow.currentStepId}
                                                        className="max-w-[34rem] border-0 bg-transparent p-0"
                                                    />
                                                ) : (
                                                    <span className="text-xs text-slate-500">لا توجد مراحل محفوظة</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">{item.status || "-"}</td>
                                            <td className="px-3 py-2">{item.createdAt || item.created_at || "-"}</td>
                                            <td className="px-3 py-2">
                                                <Link href={`/cases/${item.id}`} className="text-sm font-medium text-blue-700 hover:text-blue-900">
                                                    فتح
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}

                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                                                لا توجد نتائج مطابقة.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                    ) : null}
                </section>
            </AppShell>
        </AuthGuard>
    );
}
