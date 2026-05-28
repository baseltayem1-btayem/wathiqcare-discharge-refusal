import { redirect } from "next/navigation";
import InformedConsentsModulePageNew from "@/components/modules/InformedConsentsModulePageNew";
import ExperimentalDynamicConsentPreview from "@/components/modules/ExperimentalDynamicConsentPreview";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { isDynamicConsentEngineEnabled } from "@/modules/consent-engine";
import { isPilotUser } from "@/modules/consent-engine/pilot/pilot-users";

function isPhysicianPreviewRouteAvailable(): boolean {
  const previewEnabled =
    process.env.FEATURE_PHYSICIAN_UX_PREVIEW === "true" ||
    process.env.NEXT_PUBLIC_FEATURE_PHYSICIAN_UX_PREVIEW === "true";

  const internalPilotEnabled =
    process.env.FEATURE_PHYSICIAN_INTERNAL_PILOT === "true" ||
    process.env.NEXT_PUBLIC_FEATURE_PHYSICIAN_INTERNAL_PILOT === "true";

  const environmentSafeForPilot =
    process.env.NODE_ENV !== "production" ||
    process.env.FEATURE_PHYSICIAN_INTERNAL_PILOT_ALLOW_PRODUCTION === "true";

  return previewEnabled && internalPilotEnabled && environmentSafeForPilot;
}

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");
  const showExperimentalPreview = isDynamicConsentEngineEnabled();
  const showControlledPilotEntry =
    isPhysicianPreviewRouteAvailable() &&
    isPilotUser(auth.email ?? null);

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return (
    <>
      <InformedConsentsModulePageNew auth={auth} showControlledPilotEntry={showControlledPilotEntry} />
      {showExperimentalPreview ? <ExperimentalDynamicConsentPreview /> : null}
    </>
  );
}
