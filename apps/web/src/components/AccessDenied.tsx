"use client";

import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

type AccessDeniedProps = {
    /** Optional resource name to show in the message, e.g. "Admin Dashboard" */
    resource?: string;
    /** Optional back-link href. Defaults to "/dashboard". */
    backHref?: string;
    /** Optional back-link label. Defaults to "Back to Dashboard". */
    backLabel?: string;
};

/**
 * Shown when the server returns HTTP 403 (Forbidden / Insufficient Permissions).
 * This component deliberately does NOT redirect to /login — a 403 means the
 * session is valid but the user lacks the required role.
 */
export default function AccessDenied({
    resource,
    backHref = "/dashboard",
    backLabel = "العودة إلى لوحة التحكم",
}: AccessDeniedProps) {
    const { lang } = useI18n();
    const title = resource
        ? (lang === "ar" ? `لا تملك صلاحية الوصول إلى ${resource}` : `You do not have access to ${resource}`)
        : (lang === "ar" ? "الوصول مرفوض" : "Access Denied");
    const description = lang === "ar"
        ? "دورك الحالي غير مخوّل للوصول إلى هذه الصفحة. تواصل مع مسؤول النظام لطلب الصلاحيات المناسبة."
        : "Your current role is not authorized to access this page. Contact your system administrator to request the required permissions.";
    const fallbackBackLabel = lang === "ar" ? backLabel : "Back to Dashboard";

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[var(--shadow-sm)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                <ShieldOff className="h-8 w-8 text-blue-700" />
            </div>
            <div className="max-w-md space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">
                    {title}
                </h2>
                <p className="text-sm text-slate-600">
                    {description}
                </p>
                <p className="text-xs text-slate-400">{lang === "ar" ? "HTTP 403 — صلاحيات غير كافية" : "HTTP 403 — Insufficient Permissions"}</p>
            </div>
            <Link
                href={backHref}
                className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                {fallbackBackLabel}
            </Link>
        </div>
    );
}
