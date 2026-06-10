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
      title="Pending Consents"
      activeHref="/modules/informed-consents/pending"
      subtitle="Unified Doctor Workspace"
    >
      <WorkspaceHero
        label="Patient Signature Queue"
        title="Pending Consents"
        description="Monitor consents awaiting patient action, reminders, physician completion, or signature."
      />

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <WorkspaceCard
          title="Awaiting Patient Signature"
          description="Secure links pending patient completion."
          icon={WorkspaceIcons.Clock}
        />
        <WorkspaceCard
          title="Physician Review Pending"
          description="Clinical sections requiring review."
          icon={WorkspaceIcons.FileText}
        />
        <WorkspaceCard
          title="Send Reminder"
          description="Re-issue secure links and reminders."
          icon={WorkspaceIcons.CheckSquare}
        />
      </section>
    </DoctorWorkspaceLayout>
  );
}



