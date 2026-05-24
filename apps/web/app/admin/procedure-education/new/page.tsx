export const dynamic = "force-dynamic";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import { PROCEDURE_EDUCATION_SAMPLE_LIBRARY } from "@/lib/procedure-education/sample-library";

export default function NewProcedureEducationPage() {
  return (
    <AppShell
      title="New Procedure Education"
      subtitle="Create procedure education entries with bilingual sections and multimedia assets"
      actions={
        <Link href="/admin/procedure-education" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
          Back To Library
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Foundation Form</h2>
          <p className="mt-1 text-sm text-slate-600">
            This phase establishes the schema and admin surface only. Write APIs are intentionally deferred.
          </p>
          <form className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Procedure code (e.g. appendectomy)" disabled />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="English title" disabled />
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2 text-right text-sm" dir="rtl" placeholder="العنوان العربي" disabled />
            <textarea className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="English summary" disabled />
            <textarea className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-right text-sm" dir="rtl" placeholder="الملخص العربي" disabled />
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-600">
              Structured templates: overview, benefits, risks, alternatives, recovery, doctor advice. Media architecture: images, infographics, videos. Localization: ar, en.
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-900">Seed Catalog</h2>
          <p className="mt-1 text-sm text-slate-600">Phase 23A sample procedures included in seed script.</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {PROCEDURE_EDUCATION_SAMPLE_LIBRARY.map((item) => (
              <li key={item.procedureCode} className="rounded-xl border border-slate-200 px-3 py-2">
                <div className="font-medium">{item.titleEn}</div>
                <div className="text-right text-slate-600" dir="rtl">{item.titleAr}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
