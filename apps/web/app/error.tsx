"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AppErrorProps = {
  error: Error & { digest?: string; componentStack?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  const pathname = usePathname();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-slate-900">This page is temporarily unavailable</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          The request failed safely. You can retry or return to a stable section without reloading the entire app.
        </p>

        {/* Diagnostic details */}
        <div className="mt-4 space-y-1 rounded-lg border border-rose-100 bg-rose-50 p-3 text-left font-mono text-xs text-rose-800">
          {error?.message ? (
            <div><span className="font-semibold">message:</span> {error.message}</div>
          ) : null}
          {error?.digest ? (
            <div><span className="font-semibold">digest:</span> {error.digest}</div>
          ) : null}
          {pathname ? (
            <div><span className="font-semibold">route:</span> {pathname}</div>
          ) : null}
          {error?.componentStack ? (
            <details className="mt-1">
              <summary className="cursor-pointer font-semibold">component stack</summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-all text-[10px]">
                {error.componentStack}
              </pre>
            </details>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
