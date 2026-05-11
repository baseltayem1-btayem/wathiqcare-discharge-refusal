import { notFound, redirect } from "next/navigation";
import InformedConsentsGovernanceReportsDashboard from "@/components/modules/InformedConsentsGovernanceReportsDashboard";
import { canAccessModule } from "@/lib/modules/catalog";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsGovernanceReportsPage() {
  if (!isInformedConsentsEnabled()) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/governance-reports");
  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentsGovernanceReportsDashboard auth={auth} />;
}
