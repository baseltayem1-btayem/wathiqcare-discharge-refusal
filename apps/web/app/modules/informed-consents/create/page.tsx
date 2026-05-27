import type { Metadata } from "next";
import InformedConsentsModulePageNew from "@/components/modules/InformedConsentsModulePageNew";
import ModuleShell from "@/components/ModuleShell";
import UIRefreshBoundary from "@/components/ui-refresh/UIRefreshBoundary";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { getEnvironmentConfig } from "@/lib/environment/environment";

export const metadata: Metadata = {
  title: "Create Informed Consent | WathiqCare",
  description: "Create and issue informed consents with bilingual legal controls.",
};

export default async function InformedConsentsCreatePage() {
  const environment = getEnvironmentConfig();
  const canRenderPilotWorkflow = environment.isPilot || environment.isUAT;
  const informedConsentsEnabled = isInformedConsentsEnabled();
  const shouldShowPilotBanner = canRenderPilotWorkflow || !informedConsentsEnabled;

  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/create");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return (
      <ModuleShell
        auth={auth}
        moduleKey="informed-consents"
        title={{ ar: "الموافقات المستنيرة", en: "Informed Consents" }}
        subtitle={{ ar: "صلاحيات الوصول", en: "Access control" }}
      >
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          Access denied: You do not have permission to open the informed consent workflow.
        </div>
      </ModuleShell>
    );
  }

  return (
    <UIRefreshBoundary surface="issuance">
      <InformedConsentsModulePageNew auth={auth} showInternalPilotBanner={shouldShowPilotBanner} />
    </UIRefreshBoundary>
  );
}
