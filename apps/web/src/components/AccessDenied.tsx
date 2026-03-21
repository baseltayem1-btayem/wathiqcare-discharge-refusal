"use client";

import { ShieldOff } from "lucide-react";
import Link from "next/link";

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
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <ShieldOff className="h-8 w-8 text-amber-600" />
            </div>
            <div className="max-w-md space-y-2">
                <h2 className="text-xl font-semibold text-slate-900">
                    {resource ? `لا تملك صلاحية الوصول إلى ${resource}` : "الوصول مرفوض"}
                </h2>
                <p className="text-sm text-slate-600">
                    دورك الحالي غير مخوّل للوصول إلى هذه الصفحة. تواصل مع مسؤول النظام لطلب الصلاحيات المناسبة.
                </p>
                <p className="text-xs text-slate-400">HTTP 403 — Insufficient Permissions</p>
            </div>
            <Link
                href={backHref}
                className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
                {backLabel}
            </Link>
        </div>
    );
}
