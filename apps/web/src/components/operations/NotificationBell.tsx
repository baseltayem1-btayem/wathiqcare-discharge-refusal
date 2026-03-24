"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ShieldAlert } from "lucide-react";
import { apiFetch } from "@/utils/api";

type NotificationItem = {
    id: string;
    eventType: string;
    title: string;
    message: string;
    readAt?: string | null;
    createdAt: string;
    caseId?: string | null;
};

type LegalAlertItem = {
    id: string;
    alert_type: string;
    title: string;
    message: string;
    severity: "info" | "warning" | "critical";
    is_acknowledged: boolean;
    created_at: string;
    case_deep_link?: string | null;
};

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);
    const [legalAlerts, setLegalAlerts] = useState<LegalAlertItem[]>([]);
    const [legalUnread, setLegalUnread] = useState(0);
    const [canLoad, setCanLoad] = useState(true);

    const loadNotifications = useCallback(async () => {
        if (!canLoad) return;
        try {
            const [data, legalData] = await Promise.all([
                apiFetch<{ notifications: NotificationItem[]; unread: number }>(
                    "/api/operations/notifications?limit=12",
                    { authFailureMode: "inline" }
                ),
                apiFetch<{ alerts: LegalAlertItem[]; unread: number }>(
                    "/api/legal/alerts?limit=6&unacknowledged_only=true",
                    { authFailureMode: "inline", cache: "no-store" }
                ).catch(() => ({ alerts: [], unread: 0 })),
            ]);
            if (data && typeof data === "object") {
                setItems(data.notifications || []);
                setUnread(data.unread || 0);
            }
            if (legalData && typeof legalData === "object") {
                setLegalAlerts(legalData.alerts || []);
                setLegalUnread(legalData.unread || 0);
            }
        } catch (error) {
            // If user is platform admin, tenant notifications won't work
            // This is expected and we silently skip
            if (error instanceof Error && error.message.includes("403")) {
                setCanLoad(false);
            }
        }
    }, [canLoad]);

    useEffect(() => {
        // Check if user can even access tenant operations
        const checkAccess = async () => {
            try {
                const me = await apiFetch<{ userType?: string }>("/api/auth/me", { cache: "no-store", authFailureMode: "inline" });
                if (me?.userType === "platform_admin") {
                    setCanLoad(false);
                    return;
                }
            } catch {
                // Continue anyway
            }
        };

        void checkAccess();
        const initial = setTimeout(() => {
            void loadNotifications();
        }, 0);
        const timer = setInterval(() => {
            void loadNotifications();
        }, 30000);
        return () => {
            clearTimeout(initial);
            clearInterval(timer);
        };
    }, [loadNotifications]);

    const unreadIds = useMemo(() => items.filter((item) => !item.readAt).map((item) => item.id), [items]);
    const totalUnread = unread + legalUnread;

    async function markAllRead() {
        if (!unreadIds.length) return;
        await apiFetch("/api/operations/notifications/read", {
            method: "POST",
            body: JSON.stringify({ all: true }),
            headers: { "Content-Type": "application/json" },
        });
        await loadNotifications();
    }

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Open notifications"
            >
                <Bell className="h-4 w-4" />
                {totalUnread > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                        {totalUnread > 9 ? "9+" : totalUnread}
                    </span>
                ) : null}
            </button>

            {open ? (
                <div className="absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Notification Center</p>
                            <p className="text-xs text-slate-500">Operational updates and legal fallback alerts</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void markAllRead()}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark all
                        </button>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {legalAlerts.length > 0 ? (
                            <div className="border-b border-slate-100 bg-rose-50/50 px-4 py-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-700">
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        Legal alerts
                                    </div>
                                    <Link href="/legal-alerts" className="text-xs font-medium text-cyan-700 hover:text-cyan-800">
                                        Open Alert Center
                                    </Link>
                                </div>
                                <div className="space-y-2">
                                    {legalAlerts.map((item) => (
                                        <div key={item.id} className="rounded-xl border border-rose-100 bg-white px-3 py-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">{item.alert_type.replaceAll("_", " ")}</p>
                                                <span className="text-[11px] text-slate-400">{new Date(item.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="mt-1 text-sm font-semibold text-slate-900">{item.title}</p>
                                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
                        ) : (
                            items.map((item) => (
                                <div
                                    key={item.id}
                                    className={`border-b border-slate-100 px-4 py-3 ${item.readAt ? "bg-white" : "bg-cyan-50/60"}`}
                                >
                                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700">{item.eventType.replaceAll("_", " ")}</p>
                                    <p className="mt-0.5 text-sm font-semibold text-slate-900">{item.title}</p>
                                    <p className="mt-1 text-xs text-slate-600">{item.message}</p>
                                    <p className="mt-1 text-[11px] text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
