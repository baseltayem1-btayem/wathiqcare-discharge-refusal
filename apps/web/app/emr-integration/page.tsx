"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    CheckCircle2,
    XCircle,
    RefreshCw,
    Server,
    Database,
    AlertCircle,
    Clock,
    Zap,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import AccessDenied from "@/components/AccessDenied";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";
import { apiFetch, isAuthenticationError, isForbiddenError } from "@/utils/api";

const INLINE_AUTH_REQUEST = { authFailureMode: "inline" as const };
const INLINE_NO_STORE_AUTH_REQUEST = { cache: "no-store" as const, authFailureMode: "inline" as const };

type IntegrationStatus = "queued" | "running" | "success" | "failed" | "partial_success" | "disabled";

type IntegrationRun = {
    id: string;
    connector_key: string;
    connector_name: string;
    run_type: "scheduled" | "manual";
    status: IntegrationStatus;
    started_at: string | null;
    completed_at: string | null;
    records_processed: number;
    records_created: number;
    records_updated: number;
    records_failed: number;
    error_summary: string | null;
    triggered_by: string | null;
    details?: Record<string, unknown>;
};

type IntegrationConnector = {
    connector_key: string;
    connector_name: string;
    enabled: boolean;
    status: IntegrationStatus;
    live_mode: boolean;
    connection_url: string | null;
    sync_interval_minutes: number;
    timeout_seconds: number;
    retry_count: number;
    retry_backoff_seconds: number;
    resource_set: string[];
    last_health_status: string | null;
    last_health_checked_at: string | null;
    last_success_at: string | null;
    last_error: string | null;
    active_run: IntegrationRun | null;
    latest_run: IntegrationRun | null;
};

type StatusResponse = {
    summary: {
        total: number;
        enabled: number;
        running: number;
        failed: number;
        disabled: number;
        live: number;
    };
    connectors: IntegrationConnector[];
};

type RunsResponse = {
    runs: IntegrationRun[];
};

type IntegrationAlert = {
    alert_type: string;
    severity: "info" | "warning" | "error" | "critical";
    connector_key: string | null;
    status: "pending" | "sent" | "failed" | "suppressed" | "skipped";
    message: string;
    is_suppressed: boolean;
    triggered_at: string | null;
    notified_at: string | null;
};

type AlertsResponse = {
    total: number;
    limit: number;
    offset: number;
    alerts: IntegrationAlert[];
};

function mapBadgeVariant(status: IntegrationStatus): "success" | "error" | "info" | "warning" {
    if (status === "success") return "success";
    if (status === "failed") return "error";
    if (status === "partial_success") return "warning";
    if (status === "disabled") return "warning";
    return "info";
}

function toDisplayStatus(status: IntegrationStatus): string {
    return status.replace(/_/g, " ").toUpperCase();
}

function formatDateTime(value: string | null): string {
    if (!value) return "Never";
    return new Date(value).toLocaleString();
}

export default function EMRIntegrationPage() {
    const [connectors, setConnectors] = useState<IntegrationConnector[]>([]);
    const [runs, setRuns] = useState<IntegrationRun[]>([]);
    const [summary, setSummary] = useState<StatusResponse["summary"] | null>(null);
    const [alerts, setAlerts] = useState<IntegrationAlert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [forbidden, setForbidden] = useState(false);
    const [syncingKeys, setSyncingKeys] = useState<Record<string, boolean>>({});

    const hasActiveRuns = useMemo(
        () => connectors.some((item) => item.status === "queued" || item.status === "running"),
        [connectors],
    );

    const connectedCount = useMemo(
        () => connectors.filter((item) => item.enabled && item.status !== "failed" && item.status !== "disabled").length,
        [connectors],
    );

    const errorCount = useMemo(
        () => connectors.filter((item) => item.status === "failed").length,
        [connectors],
    );

    const totalRecords = useMemo(
        () => connectors.reduce((sum, item) => sum + (item.latest_run?.records_processed || 0), 0),
        [connectors],
    );

    async function loadDashboardData() {
        try {
            const [statusJson, runsJson, alertsJson] = await Promise.all([
                apiFetch<StatusResponse>("/api/integrations/status", INLINE_NO_STORE_AUTH_REQUEST),
                apiFetch<RunsResponse>("/api/integrations/runs?limit=20", INLINE_NO_STORE_AUTH_REQUEST),
                apiFetch<AlertsResponse>("/api/integrations/alerts?limit=20&offset=0", INLINE_NO_STORE_AUTH_REQUEST),
            ]);

            setSummary(statusJson.summary);
            setConnectors(statusJson.connectors || []);
            setRuns(runsJson.runs || []);
            setAlerts(alertsJson.alerts || []);
            setError(null);
            setForbidden(false);
        } catch (err) {
            if (isForbiddenError(err)) {
                setForbidden(true);
                setError(null);
            } else if (isAuthenticationError(err)) {
                setForbidden(false);
                setError("Your current session could not be validated. The page stayed open so you can review the issue without being redirected to login.");
            } else {
                setError(err instanceof Error ? err.message : "Failed to load integration data");
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleSync(connectorKey: string) {
        setSyncingKeys((prev) => ({ ...prev, [connectorKey]: true }));

        try {
            await apiFetch(`/api/integrations/${encodeURIComponent(connectorKey)}/sync`, {
                method: "POST",
                ...INLINE_AUTH_REQUEST,
            });

            await loadDashboardData();
        } catch (err) {
            if (isAuthenticationError(err)) {
                setError("Manual sync could not start because the current session is no longer valid.");
            } else {
                setError(err instanceof Error ? err.message : "Manual sync failed");
            }
        } finally {
            setSyncingKeys((prev) => ({ ...prev, [connectorKey]: false }));
        }
    }

    useEffect(() => {
        void loadDashboardData();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            void loadDashboardData();
        }, hasActiveRuns ? 5000 : 30000);

        return () => clearInterval(timer);
    }, [hasActiveRuns]);

    return (
        <AuthGuard authFailureMode="inline">
            <AppShell
                title="EMR Integration"
                subtitle="Monitor and manage Electronic Medical Record system connections and data synchronization."
            >
                {forbidden ? (
                    <AccessDenied resource="EMR Integration" backHref="/dashboard" backLabel="Back to Dashboard" />
                ) : (
                    <>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <StatCard
                                title="Total Integrations"
                                value={connectors.length}
                                icon={<Server className="h-5 w-5" />}
                                variant="default"
                            />
                            <StatCard
                                title="Connected Systems"
                                value={connectedCount}
                                icon={<CheckCircle2 className="h-5 w-5" />}
                                variant="success"
                            />
                            <StatCard
                                title="System Errors"
                                value={errorCount}
                                icon={<XCircle className="h-5 w-5" />}
                                variant="error"
                            />
                            <StatCard
                                title="Total Records"
                                value={totalRecords.toLocaleString()}
                                icon={<Database className="h-5 w-5" />}
                                variant="primary"
                            />
                        </div>

                        {summary && (
                            <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                                <span className="font-medium text-slate-800">Live monitoring:</span>{" "}
                                {summary.live} live connector(s), {summary.running} running/queued, {summary.failed} failed, {summary.disabled} disabled.
                            </div>
                        )}

                        {error && (
                            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                {error}
                            </div>
                        )}

                        {loading && (
                            <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                                Loading live integration telemetry...
                            </div>
                        )}

                        <div className="mt-6">
                            <h2 className="mb-3 text-lg font-semibold text-slate-900">EMR System Connections</h2>

                            <div className="space-y-3">
                                {connectors.map((connector) => (
                                    <article
                                        key={connector.connector_key}
                                        className="rounded-2xl border border-slate-200 bg-white p-4"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-semibold text-slate-900">{connector.connector_name}</h3>
                                                    <StatusBadge
                                                        variant={mapBadgeVariant(connector.status)}
                                                        label={toDisplayStatus(connector.status)}
                                                    />
                                                    {!connector.live_mode && (
                                                        <StatusBadge variant="warning" label="MOCK ADAPTER" />
                                                    )}
                                                </div>

                                                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                                    <div>
                                                        <p className="text-xs text-slate-500">Connector Key</p>
                                                        <p className="mt-0.5 text-sm font-medium text-slate-700">{connector.connector_key}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500">Last Run Records</p>
                                                        <p className="mt-0.5 text-sm font-medium text-slate-700">
                                                            {(connector.latest_run?.records_processed || 0).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500">Last Sync</p>
                                                        <p className="mt-0.5 text-sm font-medium text-slate-700">
                                                            {formatDateTime(connector.latest_run?.completed_at || connector.last_success_at)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-500">Config</p>
                                                        <p className="mt-0.5 text-sm font-medium text-slate-700">
                                                            Every {connector.sync_interval_minutes}m, timeout {connector.timeout_seconds}s, retry {connector.retry_count}
                                                        </p>
                                                    </div>
                                                </div>

                                                {connector.latest_run?.error_summary && (
                                                    <p className="mt-2 text-xs text-rose-700">
                                                        Failure reason: {connector.latest_run.error_summary}
                                                    </p>
                                                )}

                                                {connector.last_error && !connector.latest_run?.error_summary && (
                                                    <p className="mt-2 text-xs text-rose-700">
                                                        Last error: {connector.last_error}
                                                    </p>
                                                )}

                                                {connector.active_run?.triggered_by && (
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        Triggered by: {connector.active_run.triggered_by}
                                                    </p>
                                                )}

                                                {!!connector.resource_set?.length && (
                                                    <p className="mt-2 text-xs text-slate-500">
                                                        Resource set: {connector.resource_set.join(", ")}
                                                    </p>
                                                )}
                                            </div>

                                            <ActionButton
                                                onClick={() => handleSync(connector.connector_key)}
                                                disabled={
                                                    syncingKeys[connector.connector_key] ||
                                                    connector.status === "queued" ||
                                                    connector.status === "running"
                                                }
                                                size="sm"
                                                variant="outline"
                                                icon={<RefreshCw className={`h-3.5 w-3.5 ${syncingKeys[connector.connector_key] ? "animate-spin" : ""}`} />}
                                            >
                                                {syncingKeys[connector.connector_key]
                                                    ? "Queueing..."
                                                    : connector.status === "queued" || connector.status === "running"
                                                        ? "In Progress"
                                                        : "Sync Now"}
                                            </ActionButton>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>

                        <div className="mt-6">
                            <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Synchronization Activity</h2>

                            <div className="space-y-2">
                                {runs.map((run) => (
                                    <div
                                        key={run.id}
                                        className={`rounded-xl border p-3 ${run.status === "success"
                                            ? "border-emerald-200 bg-emerald-50"
                                            : run.status === "failed"
                                                ? "border-rose-200 bg-rose-50"
                                                : run.status === "partial_success"
                                                    ? "border-amber-200 bg-amber-50"
                                                    : "border-blue-200 bg-blue-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium text-slate-900">{run.connector_name}</p>
                                                    <StatusBadge
                                                        variant={mapBadgeVariant(run.status)}
                                                        label={toDisplayStatus(run.status)}
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {run.run_type.toUpperCase()} sync {run.triggered_by ? `by ${run.triggered_by}` : ""}
                                                </p>
                                                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDateTime(run.completed_at || run.started_at)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Database className="h-3 w-3" />
                                                        {run.records_processed} processed ({run.records_failed} failed)
                                                    </span>
                                                </div>
                                                {run.error_summary && (
                                                    <p className="mt-2 text-xs text-rose-700">{run.error_summary}</p>
                                                )}
                                            </div>
                                            {run.status === "success" ? (
                                                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                                            ) : run.status === "failed" ? (
                                                <XCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
                                            ) : (
                                                <Activity className="h-5 w-5 flex-shrink-0 animate-pulse text-blue-600" />
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {!runs.length && !loading && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                        No synchronization runs recorded yet.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6">
                            <h2 className="mb-3 text-lg font-semibold text-slate-900">Operations Alerts</h2>

                            <div className="space-y-2">
                                {alerts.map((alert, index) => (
                                    <div
                                        key={`${alert.alert_type}-${alert.triggered_at || index}`}
                                        className={`rounded-xl border p-3 ${alert.status === "sent"
                                            ? "border-emerald-200 bg-emerald-50"
                                            : alert.status === "failed"
                                                ? "border-rose-200 bg-rose-50"
                                                : alert.status === "suppressed"
                                                    ? "border-amber-200 bg-amber-50"
                                                    : "border-slate-200 bg-slate-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{alert.alert_type}</p>
                                                <p className="mt-1 text-xs text-slate-600">
                                                    {alert.connector_key ? `connector=${alert.connector_key} ` : ""}
                                                    severity={alert.severity} status={alert.status}
                                                </p>
                                                <p className="mt-1 text-xs text-slate-700">{alert.message}</p>
                                            </div>
                                            <div className="text-right text-xs text-slate-500">
                                                <p>Triggered: {formatDateTime(alert.triggered_at)}</p>
                                                <p>Notified: {formatDateTime(alert.notified_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {!alerts.length && !loading && (
                                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                        No operations alerts recorded.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-lg bg-blue-600 p-2">
                                        <Zap className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">FHIR R4 Compliance</h3>
                                        <p className="mt-1 text-sm text-slate-600">
                                            FHIR connector sync payloads and health checks are now backed by live operational telemetry.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-lg bg-emerald-600 p-2">
                                        <CheckCircle2 className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">Data Security</h3>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Connector credentials and endpoints are loaded from environment configuration per connector.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex gap-3">
                                <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
                                <div>
                                    <h3 className="text-sm font-semibold text-amber-900">Integration Notes</h3>
                                    <p className="mt-1 text-sm text-amber-700">
                                        Live connector status, run telemetry, and failures are now sourced from backend operational data.
                                        Use Sync Now to queue manual runs and track progress in real time.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </AppShell>
        </AuthGuard>
    );
}
