import { redirect } from "next/navigation";
import WathiqSmartConsentExperience from "@/components/informed-consents/smart-experience/WathiqSmartConsentExperience";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return (
    <section
      data-testid="wathiq-smart-consent-experience"
      data-release-surface="wathiq-smart-consent-experience"
      aria-label="WathiqCare smart consent experience"
    >
      <h1 className="sr-only">WathiqCare Smart Consent Experience</h1>
      <WathiqSmartConsentExperience />
    </section>
  );
}
