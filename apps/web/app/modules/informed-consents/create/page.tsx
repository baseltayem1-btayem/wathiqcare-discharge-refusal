import { redirect } from "next/navigation";
import InformedConsentIssuancePage from "@/components/modules/informed-consent-issuance/InformedConsentIssuancePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsCreatePage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/create");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentIssuancePage auth={auth} />;
}
