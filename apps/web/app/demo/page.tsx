import Link from "next/link";

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#f7fbff_0%,#eef3f8_40%,#e9edf2_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#0f2038_0%,#183154_52%,#22436f_100%)] px-8 py-10 text-white shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
          <div className="max-w-3xl space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">IMC Enterprise Demo</span>
              <span className="rounded-full border border-[#b89546] bg-[#b89546]/15 px-3 py-1 text-[#f5df9a]">Legal Affairs Department</span>
            </div>
            <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight md:text-5xl">
              Enterprise legal review, packaged for boardroom and client presentation.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-200 md:text-lg">
              Phase 5 converts the legal intelligence system into a commercialization-ready experience with formal language,
              enterprise hierarchy, curated sample data, and a print-grade legal report.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/demo/enterprise-legal-review"
                className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.28)] transition hover:bg-slate-800"
              >
                Open Demo Command Center
              </Link>
              <Link
                href="/demo/legal-report"
                className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Print View
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legal language</div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              Legal reasoning, risk statements, and report language are rewritten in a more formal enterprise counsel tone.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Report formatting</div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              A presentation-grade legal report route is now available for export and PDF capture with executive legal summary, findings,
              risk analysis, and audit chronology.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Demo mode</div>
            <p className="mt-3 text-sm leading-7 text-slate-700">
              A curated enterprise sample case replaces operational noise so demonstrations can stay focused on value,
              defensibility, and executive polish.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
