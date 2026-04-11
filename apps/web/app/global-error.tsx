"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
          <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">Application recovered from a fatal error</h1>
            <p className="mt-2 text-sm text-slate-600">
              A safe fallback was rendered to prevent a blank screen. Reload the page to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Reload application
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}