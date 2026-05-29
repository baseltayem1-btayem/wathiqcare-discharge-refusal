import { redirect } from "next/navigation";
import InformedConsentsModulePageNew from "@/components/modules/InformedConsentsModulePageNew";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const dynamic = "force-dynamic";

// Legacy Informed Consents dashboard, preserved for rollback after the
// validated v1.1 Healthcare Consent Platform Design was promoted to default
// at /modules/informed-consents (Executive UI Promotion 2026-05-29).
// Unchanged behavior. All APIs, OTP, audit, signature, and evidence flows untouched.
export default async function LegacyInformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/legacy/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentsModulePageNew auth={auth} showControlledPilotEntry={false} />;
}
