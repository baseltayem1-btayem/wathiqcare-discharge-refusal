"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

type ApiErrorEventDetail = {
    message: string;
    status: number;
};

const AUTO_HIDE_MS = 8000;

export default function GlobalApiErrorBanner() {
    const [error, setError] = useState<ApiErrorEventDetail | null>(null);

    useEffect(() => {
        function handleError(event: Event) {
            const customEvent = event as CustomEvent<ApiErrorEventDetail>;
            if (!customEvent.detail?.message) {
                return;
            }
            setError(customEvent.detail);
        }

        window.addEventListener("wathiqcare:api-error", handleError);
        return () => window.removeEventListener("wathiqcare:api-error", handleError);
    }, []);

    useEffect(() => {
        if (!error) {
            return;
        }

        const timer = window.setTimeout(() => setError(null), AUTO_HIDE_MS);
        return () => window.clearTimeout(timer);
    }, [error]);

    if (!error) {
        return null;
    }

    return (
        <div className="fixed inset-x-0 top-0 z-[100] px-3 pt-3 sm:px-6">
            <div className="mx-auto flex max-w-6xl items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-md">
                <div className="inline-flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 text-red-700" />
                    <div>
                        <p className="text-sm font-semibold text-red-800">Backend service warning</p>
                        <p className="mt-0.5 text-xs text-red-700">{error.message}</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setError(null)}
                    className="rounded-md p-1 text-red-700 hover:bg-red-100"
                    aria-label="Dismiss backend error"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
