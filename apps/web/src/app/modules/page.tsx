import Link from "next/link";

export const dynamic = "force-dynamic";

const modules = [
  {
    title: "Informed Consents",
    subtitle: "Enterprise physician workspace",
    description:
      "Approved consent library, patient journey, procedure selection, anesthesia review, education, physician approval, and secure patient signing.",
    href: "/modules/informed-consents",
    status: "Production Active",
    accent: "from-[#002b5c] to-[#1976d2]",
    stats: ["Approved Forms", "Doctor Workflow", "Audit Trail"]
  },
  {
    title: "Discharge Refusal",
    subtitle: "Patient refusal documentation",
    description:
      "Structured medico-legal documentation for discharge against medical advice, patient acknowledgement, and evidence trail.",
    href: "/modules/discharge-refusal",
    status: "Active",
    accent: "from-[#12355b] to-[#4b9cd3]",
    stats: ["Case File", "Patient Signature", "Legal Record"]
  },
  {
    title: "Promissory Notes",
    subtitle: "Financial undertaking workflow",
    description:
      "Controlled legal workflow for undertakings, case tracking, approvals, and supporting documents.",
    href: "/modules/promissory-notes/enterprise",
    status: "Active",
    accent: "from-[#2f2f2f] to-[#c9a13b]",
    stats: ["Legal Review", "Finance", "Approval"]
  }
];

export default function ModulesPage() {
  return (
    <main className="min-h-screen bg-[#f4fafc] text-[#102a43]">
      <section className="relative overflow-hidden border-b border-white/70 bg-[#002b5c]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(75,156,211,0.38),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(201,161,59,0.22),transparent_30%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
                WathiqCare Enterprise Workspace
              </div>
              <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white md:text-6xl">
                Modules Command Center
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">
                Unified healthcare legal modules designed for clinical governance, traceability, speed, and controlled production workflows.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">3</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Modules</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">24/7</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Access</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">IMC</div>
                <div className="text-xs font-semibold uppercase tracking-wide text-white/60">Governance</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="group overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              <div className={`h-2 bg-gradient-to-r ${module.accent}`} />
              <div className="p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#1976d2]">
                      {module.subtitle}
                    </div>
                    <h2 className="mt-3 text-2xl font-bold text-[#002b5c]">
                      {module.title}
                    </h2>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {module.status}
                  </span>
                </div>

                <p className="mt-5 min-h-[96px] text-sm leading-7 text-slate-600">
                  {module.description}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  {module.stats.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between rounded-2xl bg-[#f4fafc] px-4 py-3">
                  <span className="text-sm font-bold text-[#002b5c]">Open Workspace</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#002b5c] text-white transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 pb-10 text-sm text-slate-500">
        Secured by WathiqCare
      </footer>
    </main>
  );
}

