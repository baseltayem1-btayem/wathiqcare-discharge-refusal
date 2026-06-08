"use client";

type ReadinessState = "ready" | "warning" | "pending";

type ReadinessItem = {
  label: string;
  value: string;
  state: ReadinessState;
};

const readinessItems: ReadinessItem[] = [
  { label: "Patient", value: "Selected", state: "ready" },
  { label: "Encounter", value: "Confirmed", state: "ready" },
  { label: "Consent Template", value: "IMC Approved", state: "ready" },
  { label: "Anesthesia", value: "Review required", state: "warning" },
  { label: "Draft PDF", value: "Not generated", state: "pending" },
  { label: "Secure Link", value: "Not sent", state: "pending" },
];

const riskGateItems = [
  {
    title: "General Anesthesia",
    subtitle: "Requires anesthesiologist review",
    tone: "warning",
  },
  {
    title: "Blood Transfusion",
    subtitle: "Not required for this case",
    tone: "ready",
  },
  {
    title: "Guardian / Representative",
    subtitle: "Not required",
    tone: "ready",
  },
  {
    title: "Patient Education",
    subtitle: "Auto-attached to patient link",
    tone: "ready",
  },
];

function StatusPill({
  state,
  children,
}: {
  state: ReadinessState | "gold" | "blue";
  children: React.ReactNode;
}) {
  const styles = {
    ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-amber-200",
    pending: "bg-slate-100 text-slate-600 ring-slate-200",
    gold: "bg-[#C9A13B]/10 text-[#8A6A18] ring-[#C9A13B]/30",
    blue: "bg-[#4B9CD3]/10 text-[#002B5C] ring-[#4B9CD3]/30",
  }[state];

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`}>
      {children}
    </span>
  );
}

function ReadinessIcon({ state }: { state: ReadinessState }) {
  if (state === "ready") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
        ✓
      </span>
    );
  }

  if (state === "warning") {
    return (
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
        !
      </span>
    );
  }

  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
      ○
    </span>
  );
}

export default function SmartConsentFastTrackPreview() {
  return (
    <section className="min-h-screen bg-[#F4F7FB] p-6 text-[#2F2F2F]">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200">
        <header className="bg-[#002B5C] px-7 py-6 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <span className="text-lg font-black text-[#C9A13B]">W</span>
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  WathiqCare Smart Consent
                </h1>
                <p className="text-sm text-blue-100">
                  آمنة. طبية. موثقة قانونيًا.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill state="gold">IMC Approved</StatusPill>
              <StatusPill state="blue">Fast Track Mode</StatusPill>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                Secure Clinical Workflow
              </span>
            </div>
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[280px_1fr_310px]">
          <aside className="border-b border-slate-200 bg-white p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B9CD3]">
              Patient Context
            </p>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-[#F8FAFD] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#002B5C] text-base font-bold text-white">
                  AA
                </div>
                <div>
                  <h2 className="font-bold text-[#002B5C]">Ahmed Ali</h2>
                  <p className="text-xs text-slate-500">MRN 102938</p>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Encounter</span>
                  <span className="font-semibold text-slate-800">ENC-2026-009</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-800">Endoscopy</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Physician</span>
                  <span className="font-semibold text-slate-800">Dr. Hani</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Language</span>
                  <span className="font-semibold text-slate-800">Bilingual</span>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-bold text-amber-900">Clinical Alert</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Anesthesia review is required before sending the unified patient link.
              </p>
            </div>
          </aside>

          <main className="bg-[#F4F7FB] p-6">
            <div className="mb-6 grid gap-3 md:grid-cols-4">
              {["Patient", "Encounter", "Package", "Risk Gate"].map((step, index) => (
                <div
                  key={step}
                  className={`rounded-2xl border p-4 ${
                    index < 3
                      ? "border-emerald-200 bg-white"
                      : "border-[#C9A13B]/40 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Step {index + 1}
                    </span>
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        index < 3
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-[#C9A13B]/15 text-[#8A6A18]"
                      }`}
                    >
                      {index < 3 ? "✓" : "!"}
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-[#002B5C]">{step}</p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B9CD3]">
                    Smart Recommendation
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-[#002B5C]">
                    Colonoscopy Consent Package
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    The system selected the approved bilingual IMC consent package based on the
                    encounter, department, planned procedure, and current template mapping.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusPill state="gold">IMC Approved</StatusPill>
                  <StatusPill state="ready">Active</StatusPill>
                  <StatusPill state="blue">Bilingual</StatusPill>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-[#F4F7FB] p-4">
                  <p className="text-xs text-slate-500">Template Version</p>
                  <p className="mt-1 font-bold text-slate-800">v1.0-saudi-2019</p>
                </div>
                <div className="rounded-2xl bg-[#F4F7FB] p-4">
                  <p className="text-xs text-slate-500">Estimated Patient Time</p>
                  <p className="mt-1 font-bold text-slate-800">3–5 minutes</p>
                </div>
                <div className="rounded-2xl bg-[#F4F7FB] p-4">
                  <p className="text-xs text-slate-500">Automation Value</p>
                  <p className="mt-1 font-bold text-slate-800">PDF + Audit + Evidence</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B9CD3]">
                    Risk Gate
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#002B5C]">
                    Show advanced steps only when clinically required
                  </h3>
                </div>
                <StatusPill state="warning">1 action required</StatusPill>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {riskGateItems.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-2xl border p-5 ${
                      item.tone === "warning"
                        ? "border-amber-200 bg-amber-50"
                        : "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p
                          className={`font-bold ${
                            item.tone === "warning" ? "text-amber-900" : "text-emerald-800"
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`mt-1 text-sm ${
                            item.tone === "warning" ? "text-amber-800" : "text-emerald-700"
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.tone === "warning"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {item.tone === "warning" ? "Review" : "Ready"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#002B5C] p-5 text-white md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold">Smart Primary Action</p>
                  <p className="mt-1 text-sm text-blue-100">
                    The next action changes automatically based on readiness.
                  </p>
                </div>
                <button className="rounded-xl bg-[#C9A13B] px-5 py-3 text-sm font-bold text-[#002B5C] shadow-lg transition hover:brightness-105">
                  Request Anesthesia Review
                </button>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B9CD3]">
                    Nursing Quick Panel
                  </p>
                  <h3 className="mt-2 text-xl font-bold text-[#002B5C]">
                    Minimal nursing burden
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Nursing confirms mobile, confirms language, sends or resends the unified link,
                    and tracks signature status.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <StatusPill state="ready">Mobile confirmed</StatusPill>
                  <StatusPill state="ready">Language confirmed</StatusPill>
                  <StatusPill state="pending">Link not sent</StatusPill>
                </div>
              </div>
            </div>
          </main>

          <aside className="border-t border-slate-200 bg-white p-6 lg:border-l lg:border-t-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4B9CD3]">
              Readiness
            </p>
            <h3 className="mt-2 text-lg font-bold text-[#002B5C]">
              Consent readiness
            </h3>

            <div className="mt-5 space-y-3">
              {readinessItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#F8FAFD] p-4"
                >
                  <ReadinessIcon state={item.state} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-[#C9A13B]/30 bg-[#C9A13B]/10 p-4">
              <p className="font-bold text-[#8A6A18]">Legal Value</p>
              <p className="mt-2 text-sm leading-6 text-[#8A6A18]">
                The digital flow keeps the speed of paper while adding PDF, audit trail, evidence
                package, and secure patient notification.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-bold text-[#002B5C]">Target time</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>• Nursing: 30–60 seconds</li>
                <li>• Simple physician case: 60–90 seconds</li>
                <li>• Patient signing: 2–5 minutes</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
