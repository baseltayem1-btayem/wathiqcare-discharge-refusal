import { notFound, redirect } from "next/navigation";
import InformedConsentsWordingGovernanceDashboard from "@/components/modules/InformedConsentsWordingGovernanceDashboard";
import { canAccessModule } from "@/lib/modules/catalog";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsWordingGovernancePage() {
  if (!isInformedConsentsEnabled()) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/wording-governance");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentsWordingGovernanceDashboard auth={auth} />;
}
