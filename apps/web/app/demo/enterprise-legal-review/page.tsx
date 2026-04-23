import Link from "next/link";
import {
  legalDemoAuditTimeline,
  legalDemoCase,
  legalDemoFindings,
  legalDemoRiskBreakdown,
} from "@/lib/demo/legalDemoData";

function toneForRisk(level: "Low" | "Medium" | "High") {
  if (level === "High") return "border-rose-200 bg-rose-50 text-rose-700";
  if (level === "Medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function EnterpriseLegalReviewDemoPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef3f8_0%,#f7f9fc_28%,#ffffff_100%)] px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f7fbff_42%,#f6f2e8_100%)] p-8 shadow-[0_28px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <span className="rounded-full border border-slate-300 bg-white px-3 py-1">IMC</span>
                <span className="rounded-full border border-[#d7c08e] bg-[#fbf5e7] px-3 py-1 text-[#8a6a1e]">Legal Affairs Department</span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">Demo Presentation Mode</span>
              </div>
              <h1 className="font-serif text-4xl font-semibold leading-tight text-slate-950 md:text-5xl">
                Enterprise Legal Readiness Command Center
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                Executive view for case sufficiency, defensibility, and finalization control before issuance of the formal
                medico-legal package.
              </p>
            </div>

            <div className="min-w-[18rem] rounded-[28px] border border-slate-200 bg-[#0f2038] p-6 text-white shadow-[0_24px_50px_rgba(15,23,42,0.22)]">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Legal eligibility determination</div>
              <div className="mt-3 text-4xl font-semibold">{legalDemoCase.readinessDecision.percentage}%</div>
              <div className="mt-3 inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-sm font-semibold text-emerald-200">
                {legalDemoCase.readinessDecision.label}
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-200">{legalDemoCase.readinessDecision.opinion}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Case reference</div><div className="mt-3 text-2xl font-semibold text-slate-900">{legalDemoCase.caseReference}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Outstanding legal deficiencies</div><div className="mt-3 text-2xl font-semibold text-slate-900">{legalDemoCase.readinessDecision.blockers}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Overall legal exposure</div><div className="mt-3 text-2xl font-semibold text-slate-900">{legalDemoCase.readinessDecision.riskLevel}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Legal Affairs Department</div><div className="mt-3 text-2xl font-semibold text-slate-900">IMC Legal Affairs</div></div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Legal reasoning</div>
                <h2 className="mt-2 font-serif text-3xl font-semibold text-slate-950">Why final issuance remains conditionally restricted</h2>
              </div>
              <Link href="/demo/legal-report" className="inline-flex rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
                Print View
              </Link>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-700">
              The sample matter is materially complete and suitable for enterprise legal review. Final issuance remains
              conditionally restricted solely because the final locked PDF control has not yet been appended to the formal
              bundle. No adverse consent, witness, or audit-integrity finding presently prevents completion.
            </p>

            <div className="mt-6 space-y-4">
              {legalDemoFindings.map((finding) => (
                <div key={finding.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{finding.id} · {finding.category}</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">{finding.title}</div>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${finding.outcome === "Satisfied" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                      {finding.outcome}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{finding.reasoning}</p>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Recommended Legal Action:</span> {finding.remediation}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="space-y-6">
            <article className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Executive Legal Summary</div>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-950">{legalDemoCase.patientLabel}</h2>
              <dl className="mt-5 space-y-3 text-sm text-slate-700">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3"><dt className="font-semibold text-slate-900">Reference</dt><dd>{legalDemoCase.caseReference}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3"><dt className="font-semibold text-slate-900">MRN</dt><dd>{legalDemoCase.mrn}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3"><dt className="font-semibold text-slate-900">Facility</dt><dd>{legalDemoCase.facility}</dd></div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3"><dt className="font-semibold text-slate-900">Attending consultant</dt><dd>{legalDemoCase.attendingConsultant}</dd></div>
                <div className="flex items-start justify-between gap-4"><dt className="font-semibold text-slate-900">Clinical narrative summary</dt><dd className="max-w-[15rem] text-right leading-7">{legalDemoCase.clinicalSummary}</dd></div>
              </dl>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Risk breakdown</div>
              <div className="mt-4 space-y-3">
                {legalDemoRiskBreakdown.map((risk) => (
                  <div key={risk.category} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-base font-semibold text-slate-900">{risk.category}</div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneForRisk(risk.level)}`}>{risk.level}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-slate-700">{risk.summary}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Audit timeline</div>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-slate-950">Printable chronology for legal and inspection review</h2>
            </div>
            <Link href="/demo/legal-report" className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              Open Print View
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {legalDemoAuditTimeline.map((event) => (
              <div key={`${event.when}-${event.action}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{event.when}</div>
                <div className="mt-2 text-base font-semibold text-slate-900">{event.action}</div>
                <div className="mt-1 text-sm font-medium text-slate-600">{event.actor}</div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{event.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}