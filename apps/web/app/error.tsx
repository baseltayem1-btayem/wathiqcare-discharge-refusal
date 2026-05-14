"use client";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-slate-900">This page is temporarily unavailable</h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          The request failed safely. You can retry or return to a stable section without reloading the entire app.
        </p>
        <p className="mt-2 text-center text-xs text-slate-500">{error?.digest ? `Ref: ${error.digest}` : ""}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Retry
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Open dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
