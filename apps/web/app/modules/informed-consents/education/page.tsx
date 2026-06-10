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
      title="Patient Education"
      activeHref="/modules/informed-consents/education"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Education Resources"
        title="Patient Education"
        description="Attach bilingual patient education resources before sending the consent for signature."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="Education Library"
          description="Approved procedure education packages."
          icon={WorkspaceIcons.BookOpen}
        />
        <WorkspaceCard
          title="Patient Materials"
          description="Bilingual explainers and guidance."
          icon={WorkspaceIcons.FileText}
        />
        <WorkspaceCard
          title="Completion Status"
          description="Track education acknowledgement."
          icon={WorkspaceIcons.CheckSquare}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



