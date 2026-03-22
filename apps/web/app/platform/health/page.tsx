"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiFetchJson } from "@/utils/api";

type HealthStatus = {
    status: "healthy" | "degraded" | "down";
    services: {
        name: string;
        status: "up" | "down" | "degraded";
        responseTime?: number;
        lastChecked?: string;
    }[];
    uptime?: number;
    timestamp: string;
};

export default function HealthPage() {
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [health, setHealth] = useState<HealthStatus | null>(null);

    const loadHealth = useCallback(async () => {
        setRefreshing(true);
        setError("");

        try {
            const result = await apiFetchJson<HealthStatus>("/api/health", { cache: "no-store" });
            setHealth(result || null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load system health");
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void loadHealth();
        // Poll every 30 seconds
        const interval = setInterval(() => void loadHealth(), 30000);
        return () => clearInterval(interval);
    }, [loadHealth]);

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">System Health Monitoring</h2>
                    <p className="mt-1 text-sm text-gray-500">Real-time service status and performance metrics</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadHealth()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    {refreshing ? "Checking..." : "Check Now"}
                </button>
            </div>

            {error ? (
                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-sm font-semibold text-rose-800">Unable to load system health</p>
                    <p className="mt-1 text-sm text-rose-700">The health feed did not return valid JSON. Please retry.</p>
                    <button
                        type="button"
                        onClick={() => void loadHealth()}
                        className="mt-2 inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            {/* Status Overview */}
            {health && (
                <>
                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`h-3 w-3 rounded-full ${health.status === "healthy" ? "bg-emerald-500" :
                                    health.status === "degraded" ? "bg-amber-500" :
                                        "bg-rose-500"
                                    }`} />
                                <div>
                                    <p className="font-semibold text-slate-900 capitalize">{health.status} Status</p>
                                    <p className="text-xs text-slate-500">{new Date(health.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                            {health.uptime && (
                                <div className="text-right">
                                    <p className="text-sm text-slate-500">Uptime</p>
                                    <p className="text-lg font-semibold text-slate-900">{(health.uptime * 100).toFixed(2)}%</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Services Grid */}
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {health.services.map((service) => (
                            <div key={service.name} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {service.status === "up" ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        ) : service.status === "degraded" ? (
                                            <AlertCircle className="h-4 w-4 text-amber-600" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-rose-600" />
                                        )}
                                        <p className="font-medium text-slate-900">{service.name}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded font-medium ${service.status === "up" ? "bg-emerald-100 text-emerald-700" :
                                        service.status === "degraded" ? "bg-amber-100 text-amber-700" :
                                            "bg-rose-100 text-rose-700"
                                        }`}>
                                        {service.status.toUpperCase()}
                                    </span>
                                </div>
                                {service.responseTime && (
                                    <p className="text-xs text-slate-500">Response: {service.responseTime}ms</p>
                                )}
                                {service.lastChecked && (
                                    <p className="text-xs text-slate-500 mt-1">{new Date(service.lastChecked).toLocaleTimeString()}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            {!health && !error && (
                <div className="flex justify-center py-12">
                    <div className="text-center text-gray-500">Loading system health...</div>
                </div>
            )}
        </>
    );
}
