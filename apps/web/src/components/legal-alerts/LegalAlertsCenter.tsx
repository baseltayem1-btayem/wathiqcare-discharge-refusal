"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, CheckCheck, ExternalLink, Filter, RefreshCw, ShieldAlert, TriangleAlert } from "lucide-react";
import {
    acknowledgeLegalAlert,
    fetchLegalAlerts,
    fetchNotificationSettings,
    updateNotificationSettings,
    type LegalAlert,
    type LegalAlertSeverity,
    type NotificationSettings,
    type RecipientEmail,
    type RecipientPhone,
} from "@/lib/services/legalAlerts.service";

const EMPTY_SETTINGS: NotificationSettings = {
    id: "",
    tenant_id: "",
    email_enabled: true,
    dashboard_enabled: true,
    whatsapp_enabled: false,
    whatsapp_sender_number: null,
    legal_recipient_phones: [],
    legal_recipient_emails: [],
    compliance_recipient_emails: [],
    notification_threshold_minutes: 1440,
    escalation_threshold_minutes: 2880,
};

const severityBadge: Record<LegalAlertSeverity, string> = {
    info: "border-sky-200 bg-sky-50 text-sky-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    critical: "border-rose-200 bg-rose-50 text-rose-700",
};

function severityLabel(value: LegalAlertSeverity) {
    if (value === "critical") return "Critical";
    if (value === "warning") return "Warning";
    return "Info";
}

export default function LegalAlertsCenter() {
    const [alerts, setAlerts] = useState<LegalAlert[]>([]);
    const [unread, setUnread] = useState(0);
    const [severity, setSeverity] = useState<LegalAlertSeverity | "all">("all");
    const [unackOnly, setUnackOnly] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [settings, setSettings] = useState<NotificationSettings>(EMPTY_SETTINGS);
    const [legalEmailsText, setLegalEmailsText] = useState("");
    const [complianceEmailsText, setComplianceEmailsText] = useState("");
    const [legalPhonesText, setLegalPhonesText] = useState("");

    const loadAlerts = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [alertsData, settingsData] = await Promise.all([
                fetchLegalAlerts({ severity, unacknowledgedOnly: unackOnly, limit: 100 }),
                fetchNotificationSettings(),
            ]);
            setAlerts(alertsData.alerts || []);
            setUnread(alertsData.unread || 0);
            setSettings(settingsData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load legal alerts.");
        } finally {
            setLoading(false);
        }
    }, [severity, unackOnly]);

    useEffect(() => {
        void loadAlerts();
    }, [loadAlerts]);

    useEffect(() => {
        setLegalEmailsText((settings.legal_recipient_emails || []).map((item) => `${item.name}|${item.email}`).join("\n"));
        setComplianceEmailsText((settings.compliance_recipient_emails || []).map((item) => `${item.name}|${item.email}`).join("\n"));
        setLegalPhonesText((settings.legal_recipient_phones || []).map((item) => `${item.name}|${item.phone}`).join("\n"));
    }, [settings]);

    const summary = useMemo(() => {
        return {
            critical: alerts.filter((item) => item.severity === "critical").length,
            warning: alerts.filter((item) => item.severity === "warning").length,
            info: alerts.filter((item) => item.severity === "info").length,
        };
    }, [alerts]);

    async function handleAcknowledge(alertId: string) {
        try {
            await acknowledgeLegalAlert(alertId);
            await loadAlerts();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to acknowledge alert.");
        }
    }

    async function handleToggle(key: "email_enabled" | "dashboard_enabled" | "whatsapp_enabled", value: boolean) {
        setSaving(true);
        setError("");
        try {
            const next = await updateNotificationSettings({ [key]: value });
            setSettings(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update settings.");
        } finally {
            setSaving(false);
        }
    }

    async function handleThresholdChange(key: "notification_threshold_minutes" | "escalation_threshold_minutes", value: number) {
        if (!Number.isFinite(value)) return;
        setSaving(true);
        setError("");
        try {
            const next = await updateNotificationSettings({ [key]: value });
            setSettings(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update thresholds.");
        } finally {
            setSaving(false);
        }
    }

    function parseNamedLines(value: string, key: "email"): RecipientEmail[];
    function parseNamedLines(value: string, key: "phone"): RecipientPhone[];
    function parseNamedLines(value: string, key: "email" | "phone"): RecipientEmail[] | RecipientPhone[] {
        const lines = value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

        if (key === "email") {
            return lines
                .map((line) => {
                    const [namePart, emailPart] = line.split("|").map((part) => part.trim());
                    const email = emailPart || namePart || "";
                    if (!email) {
                        return null;
                    }

                    return {
                        name: namePart || email,
                        email,
                    } satisfies RecipientEmail;
                })
                .filter((item): item is RecipientEmail => item !== null);
        }

        return lines
            .map((line) => {
                const [namePart, phonePart] = line.split("|").map((part) => part.trim());
                const phone = phonePart || namePart || "";
                if (!phone) {
                    return null;
                }

                return {
                    name: namePart || phone,
                    phone,
                } satisfies RecipientPhone;
            })
            .filter((item): item is RecipientPhone => item !== null);
    }

    async function handleSaveRecipients() {
        setSaving(true);
        setError("");
        try {
            const next = await updateNotificationSettings({
                legal_recipient_emails: parseNamedLines(legalEmailsText, "email"),
                compliance_recipient_emails: parseNamedLines(complianceEmailsText, "email"),
                legal_recipient_phones: parseNamedLines(legalPhonesText, "phone"),
            });
            setSettings(next);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save recipient groups.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-6">
            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <section className="grid gap-3 md:grid-cols-4">
                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Unread</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-950">{loading ? "-" : unread}</p>
                </article>
                <article className="rounded-2xl border border-rose-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-rose-500">Critical</p>
                    <p className="mt-2 text-3xl font-semibold text-rose-700">{loading ? "-" : summary.critical}</p>
                </article>
                <article className="rounded-2xl border border-amber-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-amber-500">Warning</p>
                    <p className="mt-2 text-3xl font-semibold text-amber-700">{loading ? "-" : summary.warning}</p>
                </article>
                <article className="rounded-2xl border border-sky-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-sky-500">Info</p>
                    <p className="mt-2 text-3xl font-semibold text-sky-700">{loading ? "-" : summary.info}</p>
                </article>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-950">Alert Center</h2>
                            <p className="text-sm text-slate-500">Persistent legal and compliance alerts with case deep links.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void loadAlerts()}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <Filter className="h-4 w-4" />
                            Filters
                        </div>
                        {(["all", "critical", "warning", "info"] as const).map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setSeverity(item)}
                                className={`rounded-xl px-3 py-2 text-sm font-medium ${severity === item ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                                {item === "all" ? "All severities" : severityLabel(item)}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setUnackOnly((value) => !value)}
                            className={`rounded-xl px-3 py-2 text-sm font-medium ${unackOnly ? "bg-cyan-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                        >
                            Unacknowledged only
                        </button>
                    </div>

                    <div className="mt-4 space-y-3">
                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">Loading alerts...</div>
                        ) : null}
                        {!loading && alerts.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No legal alerts matched the current filters.</div>
                        ) : null}
                        {!loading ? alerts.map((alert) => (
                            <article key={alert.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${severityBadge[alert.severity]}`}>
                                                {severityLabel(alert.severity)}
                                            </span>
                                            <span className="text-xs uppercase tracking-wide text-slate-400">{alert.alert_type.replaceAll("_", " ")}</span>
                                            {!alert.is_acknowledged ? (
                                                <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-700">Unread</span>
                                            ) : null}
                                        </div>
                                        <h3 className="mt-2 text-base font-semibold text-slate-950">{alert.title}</h3>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">{alert.message}</p>
                                        <p className="mt-2 text-xs text-slate-400">{new Date(alert.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {alert.case_deep_link ? (
                                            <Link
                                                href={alert.case_deep_link}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                Open case
                                            </Link>
                                        ) : null}
                                        <button
                                            type="button"
                                            disabled={alert.is_acknowledged}
                                            onClick={() => void handleAcknowledge(alert.id)}
                                            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${alert.is_acknowledged ? "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400" : "bg-slate-900 text-white hover:bg-slate-800"}`}
                                        >
                                            <CheckCheck className="h-4 w-4" />
                                            {alert.is_acknowledged ? "Acknowledged" : "Acknowledge"}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        )) : null}
                    </div>
                </div>

                <aside className="space-y-4">
                    <section className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-slate-700" />
                            <h2 className="text-lg font-semibold text-slate-950">Fallback Settings</h2>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-500">Tenant-level controls for email, dashboard persistence, WhatsApp critical fallback, and escalation thresholds.</p>

                        <div className="mt-4 space-y-3">
                            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Microsoft Graph email</p>
                                    <p className="text-xs text-slate-500">Primary notification channel.</p>
                                </div>
                                <input type="checkbox" checked={settings.email_enabled} onChange={(e) => void handleToggle("email_enabled", e.target.checked)} disabled={saving} />
                            </label>
                            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Dashboard fallback</p>
                                    <p className="text-xs text-slate-500">Persistent internal alert center entries.</p>
                                </div>
                                <input type="checkbox" checked={settings.dashboard_enabled} onChange={(e) => void handleToggle("dashboard_enabled", e.target.checked)} disabled={saving} />
                            </label>
                            <label className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">WhatsApp critical fallback</p>
                                    <p className="text-xs text-slate-500">Critical alerts only. Message body stays PDPL-safe.</p>
                                </div>
                                <input type="checkbox" checked={settings.whatsapp_enabled} onChange={(e) => void handleToggle("whatsapp_enabled", e.target.checked)} disabled={saving} />
                            </label>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="rounded-2xl border border-slate-200 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-500">24h threshold (minutes)</p>
                                <input
                                    type="number"
                                    min={60}
                                    step={60}
                                    defaultValue={settings.notification_threshold_minutes}
                                    onBlur={(e) => void handleThresholdChange("notification_threshold_minutes", Number(e.target.value))}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                />
                            </label>
                            <label className="rounded-2xl border border-slate-200 px-4 py-3">
                                <p className="text-xs uppercase tracking-wide text-slate-500">48h threshold (minutes)</p>
                                <input
                                    type="number"
                                    min={120}
                                    step={60}
                                    defaultValue={settings.escalation_threshold_minutes}
                                    onBlur={(e) => void handleThresholdChange("escalation_threshold_minutes", Number(e.target.value))}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                />
                            </label>
                        </div>

                        <div className="mt-4 space-y-3">
                            <label className="block rounded-2xl border border-slate-200 px-4 py-3">
                                <p className="text-sm font-medium text-slate-900">Legal recipient emails</p>
                                <p className="mt-1 text-xs text-slate-500">One per line using Name|email@example.com</p>
                                <textarea
                                    value={legalEmailsText}
                                    onChange={(e) => setLegalEmailsText(e.target.value)}
                                    rows={4}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                />
                            </label>
                            <label className="block rounded-2xl border border-slate-200 px-4 py-3">
                                <p className="text-sm font-medium text-slate-900">Compliance recipient emails</p>
                                <p className="mt-1 text-xs text-slate-500">One per line using Name|email@example.com</p>
                                <textarea
                                    value={complianceEmailsText}
                                    onChange={(e) => setComplianceEmailsText(e.target.value)}
                                    rows={4}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                />
                            </label>
                            <label className="block rounded-2xl border border-slate-200 px-4 py-3">
                                <p className="text-sm font-medium text-slate-900">WhatsApp legal phones</p>
                                <p className="mt-1 text-xs text-slate-500">One per line using Name|+9665XXXXXXX</p>
                                <textarea
                                    value={legalPhonesText}
                                    onChange={(e) => setLegalPhonesText(e.target.value)}
                                    rows={4}
                                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => void handleSaveRecipients()}
                                disabled={saving}
                                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                            >
                                Save recipient groups
                            </button>
                        </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white">
                        <div className="flex items-center gap-2">
                            <TriangleAlert className="h-5 w-5 text-amber-300" />
                            <h2 className="text-lg font-semibold">PDPL-safe WhatsApp policy</h2>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                            <li>WhatsApp contains only reference ID, urgency, and secure link.</li>
                            <li>No diagnosis, no patient name, and no sensitive PHI is included.</li>
                            <li>Every send attempt is recorded immutably for audit review.</li>
                        </ul>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center gap-2">
                            <BellRing className="h-5 w-5 text-cyan-700" />
                            <h2 className="text-lg font-semibold text-slate-950">Trigger Rules</h2>
                        </div>
                        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                            <li>24h unresolved legal notification</li>
                            <li>48h legal/compliance escalation</li>
                            <li>Blocked finalization attempts</li>
                            <li>Missing mandatory signatures</li>
                            <li>Urgent compliance/legal review</li>
                        </ul>
                    </section>
                </aside>
            </section>
        </div>
    );
}
