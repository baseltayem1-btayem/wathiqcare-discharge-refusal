import Link from "next/link";
import {
  legalDemoAuditTimeline,
  legalDemoCase,
  legalDemoFindings,
  legalDemoRiskBreakdown,
} from "@/lib/demo/legalDemoData";

export default function LegalReportDemoPage() {
  return (
    <main className="min-h-screen bg-[#eef2f6] px-6 py-10 text-slate-900 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-[30px] border border-slate-200 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.1)] print:rounded-none print:border-0 print:shadow-none">
        <header className="rounded-t-[30px] border-b border-slate-200 bg-[linear-gradient(135deg,#0f2038_0%,#153156_65%,#1b406b_100%)] px-10 py-10 text-white print:rounded-none">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1">International Medical Center</span>
                <span className="rounded-full border border-[#c7a960] bg-[#c7a960]/15 px-3 py-1 text-[#f2ddaa]">Legal Affairs Department</span>
              </div>
              <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight">Formal Legal Readiness Memorandum</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                Prepared for enterprise review, executive presentation, and print-grade legal circulation.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 text-sm leading-7 text-slate-100">
              <div><span className="font-semibold">Case reference:</span> {legalDemoCase.caseReference}</div>
              <div><span className="font-semibold">Prepared:</span> 23 Apr 2026</div>
              <div><span className="font-semibold">Facility:</span> {legalDemoCase.facility}</div>
            </div>
          </div>
        </header>

        <div className="space-y-10 px-10 py-10 print:px-8 print:py-8">
          <section className="grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Executive Legal Summary</div>
              <dl className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                <div>
                  <dt className="font-semibold text-slate-900">Patient</dt>
                  <dd>{legalDemoCase.patientLabel}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">MRN</dt>
                  <dd>{legalDemoCase.mrn}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Attending consultant</dt>
                  <dd>{legalDemoCase.attendingConsultant}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-900">Clinical narrative summary</dt>
                  <dd>{legalDemoCase.clinicalSummary}</dd>
                </div>
              </dl>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legal eligibility determination</div>
              <div className="mt-4 text-3xl font-semibold text-slate-900">{legalDemoCase.readinessDecision.percentage}%</div>
              <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                {legalDemoCase.readinessDecision.label}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-700">{legalDemoCase.readinessDecision.opinion}</p>
              <div className="mt-4 text-sm leading-7 text-slate-700">
                <span className="font-semibold text-slate-900">Recommended Legal Action:</span> {legalDemoCase.nextAction}
              </div>
            </article>
          </section>

          <section>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Risk breakdown</div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">Category</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">Exposure</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {legalDemoRiskBreakdown.map((risk) => (
                    <tr key={risk.category} className="border-t border-slate-200">
                      <td className="px-4 py-4 font-semibold text-slate-900">{risk.category}</td>
                      <td className="px-4 py-4 text-slate-700">{risk.level}</td>
                      <td className="px-4 py-4 leading-7 text-slate-700">{risk.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legal findings</div>
            <div className="mt-4 space-y-4">
              {legalDemoFindings.map((finding) => (
                <article key={finding.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{finding.id} · {finding.category}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{finding.title}</div>
                    </div>
                    <div className={`rounded-full border px-3 py-1 text-xs font-semibold ${finding.outcome === "Satisfied" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {finding.outcome}
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700">{finding.reasoning}</p>
                  <p className="mt-3 text-sm leading-7 text-slate-700"><span className="font-semibold text-slate-900">Recommended Legal Action:</span> {finding.remediation}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit timeline</div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">When</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">By whom</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">Event</th>
                    <th className="px-4 py-3 font-semibold uppercase tracking-[0.12em]">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {legalDemoAuditTimeline.map((event) => (
                    <tr key={`${event.when}-${event.action}`} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-4 text-slate-700">{event.when}</td>
                      <td className="px-4 py-4 font-medium text-slate-900">{event.actor}</td>
                      <td className="px-4 py-4 text-slate-900">{event.action}</td>
                      <td className="px-4 py-4 leading-7 text-slate-700">{event.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-600 print:hidden">
            <div>Designed for enterprise legal presentation and PDF export.</div>
            <div className="flex gap-3">
              <Link href="/demo/enterprise-legal-review" className="inline-flex rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800">
                Back to Command Center
              </Link>
              <Link href="/demo" className="inline-flex rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white transition hover:bg-slate-800">
                Demo Hub
              </Link>
            </div>
          </footer>
        </div>
      </div>
    </main>
  );
}