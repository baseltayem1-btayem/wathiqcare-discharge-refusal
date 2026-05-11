import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InformedConsentIssuancePage from "@/components/modules/informed-consent-issuance/InformedConsentIssuancePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const metadata: Metadata = {
  title: "Informed Consents | WathiqCare",
  description: "Informed consent issuance, legal readiness, and audit-ready archival workflow.",
  icons: {
    icon: "/images/imc-logo.png",
  },
};

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentIssuancePage auth={auth} />;
}
