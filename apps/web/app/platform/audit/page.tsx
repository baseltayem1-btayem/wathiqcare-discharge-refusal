"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, RefreshCw } from "lucide-react";
import { apiFetch } from "@/utils/api";

type AuditLogEntry = {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    resource: string;
    resourceId?: string;
    status: "success" | "failure";
    details?: Record<string, unknown>;
};

export default function AuditPage() {
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [filter, setFilter] = useState("");

    const loadLogs = useCallback(async () => {
        setRefreshing(true);
        setError("");

        try {
            const query = filter ? `?search=${encodeURIComponent(filter)}` : "?limit=100";
            const result = await apiFetch<AuditLogEntry[]>(`/api/audit-log${query}`, { cache: "no-store" });
            const list = Array.isArray(result) ? result : [];
            setLogs(list);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load audit logs");
        } finally {
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        void loadLogs();
    }, [loadLogs]);

    return (
        <>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Platform Audit Logs</h2>
                    <p className="mt-1 text-sm text-gray-500">All administrative actions and system events</p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadLogs()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw className="h-4 w-4" />
                    {refreshing ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            {/* Filter */}
            <div className="mb-4 flex gap-2">
                <input
                    type="text"
                    placeholder="Search logs..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                    type="button"
                    onClick={() => void loadLogs()}
                    className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                    Search
                </button>
            </div>

            {/* Logs Table */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="text-base font-semibold text-slate-900 mb-3">Logs ({logs.length})</h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Timestamp</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Actor</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Action</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Resource</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-4 text-center text-slate-500">No audit logs found</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-3 py-3 text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="px-3 py-3 font-mono text-xs">{log.actor}</td>
                                        <td className="px-3 py-3 font-medium">{log.action}</td>
                                        <td className="px-3 py-3">{log.resource} {log.resourceId && `(${log.resourceId})`}</td>
                                        <td className="px-3 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${log.status === "success" ? "bg-emerald-100 text-emerald-700" :
                                                    "bg-rose-100 text-rose-700"
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
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
