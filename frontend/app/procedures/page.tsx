"use client";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import GovernanceDisabledNotice from "@/components/governance/GovernanceDisabledNotice";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";

export default function ProceduresPage() {
  const enabled = isGovernanceModuleEnabledClient();

  return (
    <AuthGuard>
      <AppShell title="Procedures" subtitle="Procedure catalog and consent mapping workspace">
        {!enabled ? <GovernanceDisabledNotice /> : null}
        {enabled ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <p>This page is ready for tenant-specific procedure catalog management and IMC consent mapping maintenance.</p>
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}
