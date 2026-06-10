import Link from "next/link";

export const dynamic = "force-dynamic";

const workflow = [
  { step: "01", title: "Patient & Encounter", text: "Start from verified patient and encounter context." },
  { step: "02", title: "Category & Template", text: "Select the approved clinical consent template." },
  { step: "03", title: "Procedure Details", text: "Document procedure-specific medical disclosure." },
  { step: "04", title: "Anesthesia Review", text: "Route anesthesia section within the same consent case." },
  { step: "05", title: "Education", text: "Attach patient education and confirmation evidence." },
  { step: "06", title: "Review & Send", text: "Physician review, secure link, OTP, and patient signing." }
];

const cards = [
  {
    title: "Approved Forms Library",
    href: "/modules/informed-consents/forms",
    label: "Open Library",
    description: "Smart search, governed templates, PDF preview, and controlled approved consent forms.",
    metric: "API Active"
  },
  {
    title: "Create Consent",
    href: "/modules/informed-consents/create",
    label: "Start Workflow",
    description: "Begin physician consent creation using the enterprise journey.",
    metric: "Doctor Flow"
  },
  {
    title: "Consent Records",
    href: "/modules/informed-consents/records",
    label: "View Records",
    description: "Search and review existing consent transactions and case status.",
    metric: "Audit Ready"
  },
  {
    title: "Settings & Support",
    href: "/modules/informed-consents/settings",
    label: "Open Support",
    description: "Legal support, technical support, configuration, and governance requests.",
    metric: "Governance"
  }
];

export default function InformedConsentsPage() {
  return (
    <main className="min-h-screen bg-[#f4fafc] text-[#102a43]">
      <section className="relative overflow-hidden bg-[#002b5c]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(75,156,211,0.36),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(201,161,59,0.22),transparent_28%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div>
            <Link href="/modules" className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 backdrop-blur">
              ← Back to Modules
            </Link>

            <h1 className="mt-6 max-w-4xl text-4xl font-bold tracking-tight text-white md:text-6xl">
              Informed Consent Enterprise Workspace
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/75">
              A Figma-grade physician workspace for approved consent forms, anesthesia collaboration, patient education, secure signing, and medico-legal audit readiness.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/modules/informed-consents/forms" className="rounded-2xl bg-white px-6 py-4 text-base font-bold text-[#002b5c] shadow-xl transition hover:bg-slate-50">
                Open Approved Forms
              </Link>
              <Link href="/modules/informed-consents/create" className="rounded-2xl border border-white/25 bg-white/10 px-6 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/15">
                Create New Consent
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
            <div className="rounded-[1.5rem] bg-white p-5">
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#1976d2]">Production Snapshot</div>
              <div className="mt-5 grid gap-3">
                {[
                  ["Forms API", "Active"],
                  ["Doctor Workspace", "Ready"],
                  ["PDF Viewer", "Enabled"],
                  ["Audit Trail", "Governed"]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl bg-[#f4fafc] px-4 py-3">
                    <span className="text-sm font-semibold text-slate-600">{label}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-5 lg:grid-cols-4">
          {cards.map((card) => (
            <Link key={card.title} href={card.href} className="group rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#eaf4fb] px-3 py-1 text-xs font-bold text-[#1976d2]">
                  {card.metric}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#002b5c] text-white transition group-hover:translate-x-1">
                  →
                </span>
              </div>
              <h2 className="mt-5 text-xl font-bold text-[#002b5c]">{card.title}</h2>
              <p className="mt-3 min-h-[88px] text-sm leading-7 text-slate-600">{card.description}</p>
              <div className="mt-5 text-sm font-bold text-[#c9a13b]">{card.label}</div>
            </Link>
          ))}
        </div>

        <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.2em] text-[#1976d2]">Clinical Journey</div>
              <h2 className="mt-2 text-3xl font-bold text-[#002b5c]">Consent workflow designed for physicians</h2>
            </div>
            <div className="rounded-full border border-[#c9a13b]/40 bg-[#fffaf0] px-4 py-2 text-sm font-bold text-[#6b5520]">
              Same-case anesthesia collaboration
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflow.map((item) => (
              <div key={item.step} className="rounded-3xl border border-slate-200 bg-[#f8fbfd] p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#002b5c] text-sm font-bold text-white">
                    {item.step}
                  </span>
                  <h3 className="text-lg font-bold text-[#002b5c]">{item.title}</h3>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto max-w-7xl px-6 pb-10 text-sm text-slate-500">
        Secured by WathiqCare
      </footer>
    </main>
  );
}
