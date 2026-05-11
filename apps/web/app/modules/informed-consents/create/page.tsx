import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InformedConsentIssuancePage from "@/components/modules/informed-consent-issuance/InformedConsentIssuancePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const metadata: Metadata = {
  title: "Create Informed Consent | WathiqCare",
  description: "Create and issue informed consents with bilingual legal controls.",
};

export default async function InformedConsentsCreatePage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/create");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentIssuancePage auth={auth} />;
}
