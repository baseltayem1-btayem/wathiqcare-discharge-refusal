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
      title="Approved Forms"
      activeHref="/modules/informed-consents/forms"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Approved IMC Library"
        title="Approved Consent Forms"
        description="Browse and select approved IMC consent templates using the unified Doctor Workspace design."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="General Surgery Forms"
          description="Approved surgical consent templates."
          icon={WorkspaceIcons.FileCheck}
        />
        <WorkspaceCard
          title="Anesthesia Forms"
          description="Approved anesthesia consent references."
          icon={WorkspaceIcons.Activity}
        />
        <WorkspaceCard
          title="Template Governance"
          description="Controlled library and approved versioning."
          icon={WorkspaceIcons.ShieldCheck}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



