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
      title="Audit Trail"
      activeHref="/modules/informed-consents/audit"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Legal Evidence Log"
        title="Audit Trail"
        description="Track user activity, consent events, signatures, OTP, and evidence logs."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="Activity Timeline"
          description="Chronological audit events."
          icon={WorkspaceIcons.History}
        />
        <WorkspaceCard
          title="Signature Evidence"
          description="Patient and witness signing events."
          icon={WorkspaceIcons.FileCheck}
        />
        <WorkspaceCard
          title="Export Audit"
          description="Legal evidence package export."
          icon={WorkspaceIcons.Archive}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



