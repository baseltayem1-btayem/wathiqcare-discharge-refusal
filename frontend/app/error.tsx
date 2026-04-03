"use client";

import { useEffect } from "react";

export default function GlobalRouteError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Keep logs generic and avoid exposing internals in UI.
        console.error("route_error", {
            message: error?.message || "Unknown error",
            digest: error?.digest || null,
        });
    }, [error]);

    return (
        <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-16 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Something went wrong</h2>
            <p className="mt-3 text-sm text-slate-600">
                The page could not be loaded right now. Please try again.
            </p>
            <button
                type="button"
                onClick={() => reset()}
                className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
                Try again
            </button>
        </main>
    );
}
