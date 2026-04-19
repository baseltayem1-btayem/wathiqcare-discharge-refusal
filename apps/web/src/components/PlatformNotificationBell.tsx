"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

type PlatformNotification = {
    id: string;
    type: "system" | "alert" | "info";
    title: string;
    message: string;
    createdAt: string;
};

export default function PlatformNotificationBell() {
    const { lang } = useI18n();
    const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);
    const [open, setOpen] = useState(false);
    // Stub until platform event feed is connected.
    const items: PlatformNotification[] = [];
    const unread = 0;

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label={txt("Open platform notifications", "فتح إشعارات المنصة")}
            >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white">
                        {unread > 9 ? "9+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    data-dropdown-menu
                    className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="border-b border-slate-200 px-4 py-3">
                        <h3 className="text-sm font-semibold text-slate-900">{txt("Platform Notifications", "إشعارات المنصة")}</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">{txt("No notifications", "لا توجد إشعارات")}</div>
                        ) : (
                            items.map((item) => (
                                <div key={item.id} className="border-b border-slate-100 px-4 py-3 hover:bg-slate-50">
                                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                                    <p className="text-xs text-slate-500">{item.message}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(item.createdAt).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {open && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setOpen(false)}
                />
            )}
        </div>
    );
}
