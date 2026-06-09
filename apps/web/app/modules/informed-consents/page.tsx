import { redirect } from "next/navigation";
import FunctionalConsentIssuanceWorkflow from "@/components/informed-consents/enterprise-workflow/FunctionalConsentIssuanceWorkflow";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return (
    <section
      data-testid="functional-informed-consents-module"
      data-release-surface="functional-informed-consents"
      aria-label="Functional informed consents module"
    >
      <h1 className="sr-only">Functional Informed Consents Module</h1>
      <FunctionalConsentIssuanceWorkflow />
    </section>
  );
}
