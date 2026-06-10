"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function Page() {
  return (
    <main className="min-h-screen bg-[#F6FAFB] px-6 py-8 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/modules/informed-consents"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#0E6E9E]"
        >
          <ArrowLeft size={16} />
          Back to Doctor Workspace
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-widest text-[#0E6E9E]">
            WathiqCare Platform
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#123047]">
            Patient Education
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600">
            This production page is now wired from the Doctor Workspace navigation and ready for API and Neon database integration.
          </p>
        </section>
      </div>
    </main>
  );
}
