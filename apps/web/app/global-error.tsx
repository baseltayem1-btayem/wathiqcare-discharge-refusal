"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="m-0 flex h-screen items-center justify-center bg-slate-50 font-sans text-center text-slate-700">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Application Error</h1>
          <p className="mt-2">Something went wrong. Please try again later.</p>
          {error?.digest ? <p className="mt-2 text-xs text-slate-500">Ref: {error.digest}</p> : null}
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
