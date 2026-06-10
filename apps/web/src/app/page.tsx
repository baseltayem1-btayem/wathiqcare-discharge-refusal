import Link from "next/link";

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4fafc] text-[#102a43]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-6 inline-flex rounded-full border border-[#c9a13b]/40 bg-white px-4 py-2 text-sm font-semibold text-[#002b5c] shadow-sm">
          WathiqCare Enterprise Healthcare Legal Platform
        </div>

        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-[#002b5c] md:text-6xl">
          WathiqCare
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          Secure digital consent, healthcare legal workflow, and approved clinical documentation workspace.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/modules/informed-consents/forms"
            className="rounded-2xl bg-[#002b5c] px-6 py-4 text-base font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            Open Approved Consent Forms
          </Link>

          <Link
            href="/modules/informed-consents"
            className="rounded-2xl border border-[#002b5c]/20 bg-white px-6 py-4 text-base font-semibold text-[#002b5c] shadow-sm transition hover:bg-slate-50"
          >
            Open Doctor Workspace
          </Link>

          <Link
            href="/modules"
            className="rounded-2xl border border-[#c9a13b]/50 bg-white px-6 py-4 text-base font-semibold text-[#6b5520] shadow-sm transition hover:bg-slate-50"
          >
            View Modules
          </Link>
        </div>

        <div className="mt-12 grid w-full max-w-4xl gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
            <div className="text-sm font-semibold text-[#1976d2]">Consent Library</div>
            <div className="mt-2 text-2xl font-bold text-[#002b5c]">Approved Forms</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Smart search and governed template preview for approved IMC consent documents.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
            <div className="text-sm font-semibold text-[#1976d2]">Clinical Workflow</div>
            <div className="mt-2 text-2xl font-bold text-[#002b5c]">Doctor Workspace</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Physician journey for patient, procedure, anesthesia, education, review, and sending.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
            <div className="text-sm font-semibold text-[#1976d2]">Governance</div>
            <div className="mt-2 text-2xl font-bold text-[#002b5c]">Audit Ready</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Structured documentation aligned with healthcare legal governance and traceability.
            </p>
          </div>
        </div>

        <footer className="mt-12 text-sm text-slate-500">
          Secured by WathiqCare
        </footer>
      </section>
    </main>
  );
}
