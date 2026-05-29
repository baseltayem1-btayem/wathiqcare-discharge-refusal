import { redirect } from "next/navigation";
import PhysicianWorkflowPreview from "@/components/preview/physician-workflow/PhysicianWorkflowPreview";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const dynamic = "force-dynamic";

// Validated v1.1 Physician Workflow promoted to default (Executive UI Promotion 2026-05-29).
// Pilot/preview gates removed; access governed solely by informed-consents RBAC.
export default async function PhysicianWorkflowPreviewPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/preview/physician-workflow");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <PhysicianWorkflowPreview />;
}
