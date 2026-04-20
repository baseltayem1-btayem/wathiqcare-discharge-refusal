"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { apiFetchJson } from "@/utils/api";
import { useI18n } from "@/hooks/useI18n";

type InvoiceItem = {
    id: string;
    invoiceNumber: string;
    status: string;
    totalCents: number;
    amountDueCents: number;
    dueAt?: string | null;
    tenantName?: string;
};

export default function BillingPage() {
    const { language } = useI18n();
    const txt = useMemo(() => (en: string, ar: string) => (language === "ar" ? ar : en), [language]);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);

    const loadInvoices = useCallback(async () => {
        setRefreshing(true);
        setError("");

        try {
            const result = await apiFetchJson<InvoiceItem[]>("/api/billing/invoices?limit=50", { cache: "no-store" });
            const list = Array.isArray(result) ? result : [];
            setInvoices(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : txt("Failed to load invoices", "تعذر تحميل الفواتير"));
        } finally {
            setRefreshing(false);
        }
    }, [txt]);

    useEffect(() => {
        void loadInvoices();
    }, [loadInvoices]);

    const totals = invoices.reduce((acc, inv) => ({
        total: acc.total + inv.totalCents,
        due: acc.due + inv.amountDueCents,
    }), { total: 0, due: 0 });

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">{txt("Billing Dashboard", "لوحة الفوترة")}</h2>
                    <p className="mt-1 text-sm text-gray-500">{txt("View invoices and billing summary", "عرض الفواتير وملخص الفوترة")}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadInvoices()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    {refreshing ? txt("Refreshing...", "جارٍ التحديث...") : txt("Refresh", "تحديث")}
                </button>
            </div>

            {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            {/* Summary Cards */}
            <section className="grid gap-4 md:grid-cols-3 mb-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">{txt("Total Invoiced", "إجمالي الفوترة")}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">${(totals.total / 100).toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">{txt("Outstanding Due", "المستحق غير المسدد")}</p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">${(totals.due / 100).toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm text-slate-500">{txt("Invoices", "الفواتير")}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{invoices.length}</p>
                </div>
            </section>

            {/* Invoices Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-base font-semibold text-slate-900 mb-3">{txt("Recent Invoices", "أحدث الفواتير")}</h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 text-left font-medium text-slate-600">{txt("Invoice", "الفاتورة")}</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">{txt("Tenant", "الجهة")}</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">{txt("Amount", "المبلغ")}</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">{txt("Due", "المستحق")}</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">{txt("Status", "الحالة")}</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">{txt("Due Date", "تاريخ الاستحقاق")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-4 text-center text-slate-500">{txt("No invoices found", "لم يتم العثور على فواتير")}</td>
                                </tr>
                            ) : (
                                invoices.map((inv) => (
                                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                                        <td className="px-3 py-3">{inv.tenantName || txt("Unknown", "غير معروف")}</td>
                                        <td className="px-3 py-3">${(inv.totalCents / 100).toFixed(2)}</td>
                                        <td className="px-3 py-3">${(inv.amountDueCents / 100).toFixed(2)}</td>
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                                                inv.status === "open" ? "bg-amber-100 text-amber-700" :
                                                    "bg-slate-100 text-slate-700"
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 text-xs">{inv.dueAt ? new Date(inv.dueAt).toLocaleDateString() : "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
