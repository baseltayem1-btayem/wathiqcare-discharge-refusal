"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import { apiFetch } from "@/utils/api";

type SubscriptionItem = {
    id: string;
    tenantId: string;
    tenantName?: string;
    planCode: string;
    billingInterval: string;
    status: string;
    seatLimit: number;
    currentSeats: number;
};

export default function SubscriptionsPage() {
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);

    const loadSubscriptions = useCallback(async () => {
        setRefreshing(true);
        setError("");

        try {
            const result = await apiFetch<SubscriptionItem[]>("/api/subscriptions", { cache: "no-store" });
            const list = Array.isArray(result) ? result : [];
            setSubscriptions(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load subscriptions");
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadSubscriptions();
    }, [loadSubscriptions]);

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Subscription Management</h2>
                    <p className="mt-1 text-sm text-gray-500">Manage tenant subscription plans and seat licenses</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadSubscriptions()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-4 w-4" />
                    <h3 className="text-base font-semibold text-slate-900">Subscriptions ({subscriptions.length})</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Tenant</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Plan</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Billing</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Seats</th>
                            </tr>
                        </thead>
                        <tbody>
                            {subscriptions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-4 text-center text-slate-500">No subscriptions found</td>
                                </tr>
                            ) : (
                                subscriptions.map((sub) => (
                                    <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-3">{sub.tenantName || "Unknown"}</td>
                                        <td className="px-3 py-3 font-medium">{sub.planCode}</td>
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${sub.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
                                                    sub.status === "TRIALING" ? "bg-blue-100 text-blue-700" :
                                                        sub.status === "PAST_DUE" ? "bg-amber-100 text-amber-700" :
                                                            "bg-slate-100 text-slate-700"
                                                }`}>
                                                {sub.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">{sub.billingInterval}</td>
                                        <td className="px-3 py-3">{sub.currentSeats}/{sub.seatLimit}</td>
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
