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
      title="Settings & Support"
      activeHref="/modules/informed-consents/settings"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Workspace Controls"
        title="Settings & Support"
        description="Access support, legal consultation, technical tickets, and workspace configuration."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="Legal Support"
          description="Request legal guidance on consent wording."
          icon={WorkspaceIcons.ShieldCheck}
        />
        <WorkspaceCard
          title="Technical Ticket"
          description="Report a platform issue."
          icon={WorkspaceIcons.Settings}
        />
        <WorkspaceCard
          title="Workspace Settings"
          description="Manage preferences and access."
          icon={WorkspaceIcons.UserCircle}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



