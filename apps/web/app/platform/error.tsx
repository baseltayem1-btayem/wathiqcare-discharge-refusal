"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

type PlatformErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function PlatformError({ reset }: PlatformErrorProps) {
  return (
    <div className="mx-auto my-10 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="text-lg font-semibold text-amber-900">Platform section is temporarily unavailable</h2>
      <p className="mt-2 text-sm text-amber-800">
        A temporary issue occurred while loading this page. You can retry safely without leaving the portal.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Retry section
        </button>
        <Link
          href="/platform"
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
        >
          Open platform overview
        </Link>
      </div>
    </div>
  );
}
