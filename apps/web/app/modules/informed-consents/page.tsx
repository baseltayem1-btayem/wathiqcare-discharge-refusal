import { redirect } from "next/navigation";
import StableFigmaInformedConsentsFrame from "@/components/informed-consents/enterprise-workflow/StableFigmaInformedConsentsFrame";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

// Informed consents module entry point. Legacy prototype has been quarantined;
// production physician issuance is routed through the enterprise workflow.
export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return (
    <section
      data-testid="approved-informed-consents-module"
      data-release-surface="approved-informed-consents"
      aria-label="Approved informed consents module"
    >
      <h1 className="sr-only">Approved Informed Consents Module</h1>
      <StableFigmaInformedConsentsFrame auth={auth} lang="en" />
    </section>
  );
}







