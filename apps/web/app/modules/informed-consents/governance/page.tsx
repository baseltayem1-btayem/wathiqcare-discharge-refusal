import { notFound, redirect } from "next/navigation";
import InformedConsentsGovernanceDashboard from "@/components/modules/InformedConsentsGovernanceDashboard";
import { canAccessModule } from "@/lib/modules/catalog";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsGovernancePage() {
  if (!isInformedConsentsEnabled()) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/governance");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentsGovernanceDashboard auth={auth} />;
}
