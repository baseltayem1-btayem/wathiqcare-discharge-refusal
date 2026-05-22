import { notFound, redirect } from "next/navigation";
import ExperimentalDynamicConsentPreview from "@/components/modules/ExperimentalDynamicConsentPreview";
import InformedConsentsModulePageNew from "@/components/modules/InformedConsentsModulePageNew";
import { canAccessModule } from "@/lib/modules/catalog";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { isDynamicConsentEngineEnabled } from "@/modules/consent-engine";

export default async function LegacyInformedConsentsPage() {
  if (!isInformedConsentsEnabled()) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect("/legacy/informed-consents");
  const showExperimentalPreview = isDynamicConsentEngineEnabled();

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return (
    <>
      <InformedConsentsModulePageNew auth={auth} />
      {showExperimentalPreview ? <ExperimentalDynamicConsentPreview /> : null}
    </>
  );
}
