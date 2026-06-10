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
      title="Anesthesia Queue"
      activeHref="/modules/informed-consents/anesthesia"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Anesthesia Pathway"
        title="Anesthesia Queue"
        description="Manage anesthesia review requests within the same consent journey."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="Queued Reviews"
          description="Patients awaiting anesthesia pathway completion."
          icon={WorkspaceIcons.Activity}
        />
        <WorkspaceCard
          title="Completed Reviews"
          description="Anesthesia decisions documented and returned."
          icon={WorkspaceIcons.CheckSquare}
        />
        <WorkspaceCard
          title="Clinical Controls"
          description="Track blocked and released anesthesia steps."
          icon={WorkspaceIcons.ShieldCheck}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



