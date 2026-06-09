import { redirect } from "next/navigation";
import WathiqConsentModeSurface from "@/components/informed-consents/enterprise-workflow/WathiqConsentModeSurface";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

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
      <WathiqConsentModeSurface />
    </section>
  );
}

