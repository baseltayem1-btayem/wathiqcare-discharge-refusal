import { redirect } from "next/navigation";
import { ApprovedPhysicianDashboard } from "@/components/approved-design/physician/ApprovedPhysicianDashboard";
import ExperimentalDynamicConsentPreview from "@/components/modules/ExperimentalDynamicConsentPreview";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { isDynamicConsentEngineEnabled } from "@/modules/consent-engine";

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");
  const showExperimentalPreview = isDynamicConsentEngineEnabled();

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  const claims = auth as unknown as {
    name?: string;
    sub?: string;
    role?: string;
    specialty?: string;
  };
  const displayName = (claims.name || claims.sub || "Physician").toString().trim();
  const role = (claims.role || claims.specialty || "Physician")
    .toString()
    .replace(/_/g, " ");

  return (
    <>
      <ApprovedPhysicianDashboard currentUser={{ name: displayName, role }} />
      {showExperimentalPreview ? <ExperimentalDynamicConsentPreview /> : null}
    </>
  );
}