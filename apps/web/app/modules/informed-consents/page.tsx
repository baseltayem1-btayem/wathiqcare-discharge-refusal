import { redirect } from "next/navigation";
import PhysicianWorkflowPreview from "@/components/preview/physician-workflow/PhysicianWorkflowPreview";
import ExperimentalDynamicConsentPreview from "@/components/modules/ExperimentalDynamicConsentPreview";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { isDynamicConsentEngineEnabled } from "@/modules/consent-engine";

// Validated v1.1 Physician Workflow promoted to default (Executive UI Promotion 2026-05-29).
// Legacy dashboard preserved at /legacy/informed-consents for rollback.
export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");
  const showExperimentalPreview = isDynamicConsentEngineEnabled();

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return (
    <>
      <PhysicianWorkflowPreview />
      {showExperimentalPreview ? <ExperimentalDynamicConsentPreview /> : null}
    </>
  );
}
