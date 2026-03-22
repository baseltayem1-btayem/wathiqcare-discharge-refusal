"use client";

import { useState } from "react";
import { Search, AlertCircle } from "lucide-react";
import { apiFetchJson } from "@/utils/api";

type TenantInspection = {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    userCount: number;
    caseCount: number;
    subscriptions: {
        planCode: string;
        status: string;
        seatLimit: number;
    }[];
    recentActivity?: string;
};

export default function SupportPage() {
    const [searchTenantId, setSearchTenantId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [tenantInfo, setTenantInfo] = useState<TenantInspection | null>(null);

    async function handleInspectTenant() {
        if (!searchTenantId.trim()) {
            setError("Enter a tenant ID or code");
            return;
        }

        setLoading(true);
        setError("");
        setTenantInfo(null);

        try {
            const result = await apiFetchJson<TenantInspection>(
                `/api/tenants/${searchTenantId}`,
                { cache: "no-store", authFailureMode: "inline" }
            );
            setTenantInfo(result || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to inspect tenant");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Support Tools</h2>
                <p className="mt-1 text-sm text-gray-500">Read-only inspection of tenant data for support purposes</p>
            </div>

            {/* Tenant Inspector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <Search className="h-4 w-4" />
                    <h3 className="text-base font-semibold text-slate-900">Tenant Inspector</h3>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter tenant ID or code..."
                        value={searchTenantId}
                        onChange={(e) => setSearchTenantId(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                void handleInspectTenant();
                            }
                        }}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                        type="button"
                        onClick={() => void handleInspectTenant()}
                        disabled={loading}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                        {loading ? "Inspecting..." : "Inspect"}
                    </button>
                </div>

                {error ? (
                    <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                    </div>
                ) : null}
            </div>

            {/* Tenant Details */}
            {tenantInfo && (
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h3 className="text-base font-semibold text-slate-900 mb-3">Tenant Information</h3>
                        <div className="space-y-2 text-sm">
                            <div><span className="text-slate-600">Name:</span> <span className="font-medium">{tenantInfo.name}</span></div>
                            <div><span className="text-slate-600">Code:</span> <span className="font-mono text-xs">{tenantInfo.code}</span></div>
                            <div><span className="text-slate-600">ID:</span> <span className="font-mono text-xs">{tenantInfo.id}</span></div>
                            <div>
                                <span className="text-slate-600">Status:</span>{" "}
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${tenantInfo.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                                    }`}>
                                    {tenantInfo.isActive ? "Active" : "Inactive"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h3 className="text-base font-semibold text-slate-900 mb-3">Metrics</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <p className="text-xs text-slate-500">Users</p>
                                <p className="text-2xl font-bold text-slate-900">{tenantInfo.userCount}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Cases</p>
                                <p className="text-2xl font-bold text-slate-900">{tenantInfo.caseCount}</p>
                            </div>
                        </div>
                    </div>

                    {tenantInfo.subscriptions && tenantInfo.subscriptions.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
                            <h3 className="text-base font-semibold text-slate-900 mb-3">Subscriptions</h3>
                            <div className="space-y-2">
                                {tenantInfo.subscriptions.map((sub, idx) => (
                                    <div key={idx} className="flex items-center justify-between rounded-lg border border-slate-100 p-3">
                                        <div>
                                            <p className="font-medium text-slate-900">{sub.planCode}</p>
                                            <p className="text-xs text-slate-500">Seats: {sub.seatLimit}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${sub.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" :
                                            sub.status === "TRIALING" ? "bg-blue-100 text-blue-700" :
                                                "bg-slate-100 text-slate-700"
                                            }`}>
                                            {sub.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Info */}
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                    <p className="font-medium">Read-Only Access</p>
                    <p className="mt-1">Use the tenant inspector to view detailed information about any tenant for support and troubleshooting purposes. All access is logged.</p>
                </div>
            </div>
        </>
    );
}
