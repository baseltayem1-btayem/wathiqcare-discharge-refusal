"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ reset }: AdminErrorProps) {
  return (
    <div className="mx-auto my-10 max-w-xl rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-rose-900">Admin section is temporarily unavailable</h2>
      <p className="mt-2 text-sm text-rose-800">
        A runtime issue occurred while loading this section. Retry without leaving the current session.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
        >
          Retry section
        </button>
        <Link
          href="/admin"
          className="rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-800 hover:bg-rose-100"
        >
          Open admin overview
        </Link>
      </div>
    </div>
  );
}
