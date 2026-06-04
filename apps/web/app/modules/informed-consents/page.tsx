import { redirect } from "next/navigation";
import FinalInformedConsentsModule from "@/components/informed-consents/FinalInformedConsentsModule";
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
      data-release-surface="wathiqcare-clinical-consent-builder"
      aria-label="WathiqCare clinical consent builder"
    >
      <h1 className="sr-only">WathiqCare Clinical Consent Builder</h1>
      <FinalInformedConsentsModule auth={auth} />
    </section>
  );
}
