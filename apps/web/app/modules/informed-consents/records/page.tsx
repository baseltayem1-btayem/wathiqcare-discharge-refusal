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
      title="Consent Records"
      activeHref="/modules/informed-consents/records"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Historical Archive"
        title="Consent Records"
        description="Access completed, signed, archived, and searchable consent records."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="Signed Records"
          description="Completed patient consent documents."
          icon={WorkspaceIcons.Archive}
        />
        <WorkspaceCard
          title="Evidence Package"
          description="Legal evidence and verification files."
          icon={WorkspaceIcons.ShieldCheck}
        />
        <WorkspaceCard
          title="Search Archive"
          description="Find historical records by patient or encounter."
          icon={WorkspaceIcons.FileText}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



