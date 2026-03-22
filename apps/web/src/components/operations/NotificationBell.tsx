"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
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

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [unread, setUnread] = useState(0);

    async function loadNotifications() {
        const data = await apiFetch<{ notifications: NotificationItem[]; unread: number }>("/api/operations/notifications?limit=20");
        setItems(data.notifications || []);
        setUnread(data.unread || 0);
    }

    useEffect(() => {
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
    }, []);

    const unreadIds = useMemo(() => items.filter((item) => !item.readAt).map((item) => item.id), [items]);

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
                {unread > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                        {unread > 9 ? "9+" : unread}
                    </span>
                ) : null}
            </button>

            {open ? (
                <div className="absolute right-0 z-40 mt-2 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">Notification Center</p>
                            <p className="text-xs text-slate-500">Operational alerts and assignment updates</p>
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
