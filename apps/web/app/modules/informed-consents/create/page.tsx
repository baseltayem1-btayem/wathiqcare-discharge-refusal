"use client";

import {
  DoctorWorkspaceLayout,
  WorkspaceCard,
  WorkspaceHero,
  WorkspaceIcons,
} from "../_components/doctor-workspace/DoctorWorkspaceLayout";

const steps = [
  "Patient & Encounter",
  "Consent Category",
  "Template Selection",
  "Procedure Details",
  "Anesthesia Decision",
  "Patient Education",
  "Physician Review",
  "Send to Patient",
];

export default function Page() {
  return (
    <DoctorWorkspaceLayout
      title="Create Consent"
      activeHref="/modules/informed-consents/create"
      subtitle="New procedure consent"
    >
      <WorkspaceHero
        label="Create Consent"
        title="New Informed Consent Journey"
        description="Start a structured IMC consent workflow using the approved Doctor Workspace interface."
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-extrabold text-[#123047]">
            Consent Creation Steps
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            The journey is now visually aligned with the production Doctor Workspace.
          </p>

          <div className="mt-6 grid gap-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 font-bold text-[#123047]">{step}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                  Ready
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <WorkspaceCard
            title="Approved IMC Template"
            description="Select controlled templates from the approved consent library."
            icon={WorkspaceIcons.FileCheck}
            href="/modules/informed-consents/forms"
          />
          <WorkspaceCard
            title="Anesthesia Pathway"
            description="Trigger anesthesia review inside the same consent case."
            icon={WorkspaceIcons.Activity}
            href="/modules/informed-consents/anesthesia"
          />
          <WorkspaceCard
            title="Patient Education"
            description="Attach bilingual education package before sending."
            icon={WorkspaceIcons.BookOpen}
            href="/modules/informed-consents/education"
          />
        </div>
      </section>
    </DoctorWorkspaceLayout>
  );
}



