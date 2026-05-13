import AccessDenied from "@/components/AccessDenied";
import EnterpriseModuleWorkspacePage from "@/components/modules/EnterpriseModuleWorkspacePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function DischargeRefusalModulePage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/discharge-refusal");

  if (!canAccessModule("discharge-refusal", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Discharge Refusal Platform" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return <EnterpriseModuleWorkspacePage auth={auth} moduleKey="discharge-refusal" />;
}
