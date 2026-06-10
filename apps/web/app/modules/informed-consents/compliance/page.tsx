"use client";

import {
  DoctorWorkspaceLayout,
  WorkspaceCard,
  WorkspaceHero,
  WorkspaceIcons,
} from "../_components/doctor-workspace/DoctorWorkspaceLayout";

export default function Page() {
  return (
    <DoctorWorkspaceLayout
      title="Compliance Review"
      activeHref="/modules/informed-consents/compliance"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Smart Legal Controls"
        title="Compliance Review"
        description="Review consent readiness, missing fields, legal controls, and operational risks."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="Readiness Score"
          description="Case completion and blocking issues."
          icon={WorkspaceIcons.ShieldCheck}
        />
        <WorkspaceCard
          title="Missing Items"
          description="Required fields and documents."
          icon={WorkspaceIcons.Clock}
        />
        <WorkspaceCard
          title="Legal Controls"
          description="Audit and compliance validation."
          icon={WorkspaceIcons.HeartPulse}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



