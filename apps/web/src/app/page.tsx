import Link from "next/link";

export const dynamic = "force-static";

const features = [
  {
    title: "Approved Forms",
    eyebrow: "Consent Library",
    description: "Smart governed template search with approved IMC consent forms and in-page PDF preview.",
    href: "/modules/informed-consents/forms"
  },
  {
    title: "Doctor Workspace",
    eyebrow: "Clinical Workflow",
    description: "Physician journey for patient, procedure, anesthesia, education, review, and secure sending.",
    href: "/modules/informed-consents"
  },
  {
    title: "Audit Ready",
    eyebrow: "Governance",
    description: "Structured traceability aligned with healthcare legal governance and production controls.",
    href: "/modules"
  }
];

const metrics = [
  ["Production", "Ready"],
  ["Consent API", "Active"],
  ["PDF Viewer", "Enabled"],
  ["Governance", "Controlled"]
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#eef7fa] text-[#102a43]">
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(75,156,211,0.22),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(20,184,166,0.22),transparent_26%),radial-gradient(circle_at_50%_95%,rgba(201,161,59,0.16),transparent_32%)]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
          <header className="flex items-center justify-between rounded-[2rem] border border-white/80 bg-white/70 px-5 py-4 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#002b5c] text-lg font-black text-white shadow-lg">
                W
              </div>
              <div>
                <div className="text-lg font-black tracking-tight text-[#002b5c]">WathiqCare</div>
                <div className="text-xs font-semibold text-slate-500">Enterprise Healthcare Legal Platform</div>
              </div>
            </div>

            <nav className="hidden items-center gap-2 md:flex">
              <Link href="/modules" className="rounded-full px-4 py-2 text-sm font-bold text-[#002b5c] transition hover:bg-[#eaf4fb]">
                Modules
              </Link>
              <Link href="/modules/informed-consents" className="rounded-full px-4 py-2 text-sm font-bold text-[#002b5c] transition hover:bg-[#eaf4fb]">
                Doctor Workspace
              </Link>
              <Link href="/modules/informed-consents/forms" className="rounded-full bg-[#002b5c] px-5 py-2 text-sm font-bold text-white shadow-lg transition hover:opacity-90">
                Approved Forms
              </Link>
            </nav>
          </header>

          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.1fr_0.9fr]">
            <section>
              <div className="inline-flex rounded-full border border-[#c9a13b]/40 bg-white/80 px-4 py-2 text-sm font-bold text-[#002b5c] shadow-sm backdrop-blur">
                Approved IMC Digital Consent Workspace
              </div>

              <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-[#002b5c] md:text-7xl">
                Healthcare consent, governed from request to signature.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                WathiqCare provides a secure clinical-legal workspace for approved consent templates, physician workflow, anesthesia collaboration, patient education, and audit-ready signing records.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/modules/informed-consents"
                  className="rounded-2xl bg-[#002b5c] px-7 py-4 text-center text-base font-black text-white shadow-xl shadow-[#002b5c]/20 transition hover:-translate-y-0.5 hover:opacity-95"
                >
                  Open Doctor Workspace
                </Link>

                <Link
                  href="/modules/informed-consents/forms"
                  className="rounded-2xl border border-[#c9a13b]/50 bg-white px-7 py-4 text-center text-base font-black text-[#6b5520] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fffaf0]"
                >
                  Open Approved Forms
                </Link>

                <Link
                  href="/modules"
                  className="rounded-2xl border border-slate-200 bg-white/80 px-7 py-4 text-center text-base font-black text-[#002b5c] shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                >
                  View Modules
                </Link>
              </div>

              <div className="mt-9 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
                {metrics.map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                    <div className="text-2xl font-black text-[#002b5c]">{value}</div>
                    <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="relative">
              <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-[#1976d2]/20 via-[#14b8a6]/20 to-[#c9a13b]/20 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/85 p-5 shadow-2xl backdrop-blur-xl">
                <div className="rounded-[2rem] bg-gradient-to-br from-[#002b5c] via-[#1976d2] to-[#14b8a6] p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.28em] text-white/65">Live Workspace</div>
                      <h2 className="mt-2 text-3xl font-black">Informed Consent</h2>
                    </div>
                    <div className="rounded-2xl bg-white/15 px-4 py-2 text-sm font-black backdrop-blur">
                      Production
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-3 gap-3">
                    {["Patient", "Procedure", "Sign"].map((item, index) => (
                      <div key={item} className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                        <div className="text-2xl font-black">0{index + 1}</div>
                        <div className="mt-1 text-xs font-bold text-white/70">{item}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid gap-4">
                  {[
                    ["Approved Template Selected", "General Anesthesia Consent Form", "APPROVED"],
                    ["Anesthesia Review", "Same consent case collaboration", "READY"],
                    ["Patient Signing", "Secure link and audit trail", "SECURE"]
                  ].map(([title, text, status]) => (
                    <div key={title} className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-[#f8fbfd] p-4">
                      <div>
                        <div className="text-sm font-black text-[#002b5c]">{title}</div>
                        <div className="mt-1 text-xs font-semibold text-slate-500">{text}</div>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="grid gap-5 pb-10 lg:grid-cols-3">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="group rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="text-sm font-black uppercase tracking-[0.18em] text-[#1976d2]">{feature.eyebrow}</div>
                <h3 className="mt-3 text-2xl font-black text-[#002b5c]">{feature.title}</h3>
                <p className="mt-3 min-h-[78px] text-sm leading-7 text-slate-600">{feature.description}</p>
                <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#f4fafc] px-4 py-3">
                  <span className="text-sm font-black text-[#002b5c]">Open</span>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#002b5c] text-white transition group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </section>

          <footer className="pb-4 text-center text-sm font-semibold text-slate-500">
            Secured by WathiqCare
          </footer>
        </div>
      </section>
    </main>
  );
}
