import AccessDenied from "@/components/AccessDenied";
import EnterpriseModuleWorkspacePage from "@/components/modules/EnterpriseModuleWorkspacePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Informed Consents Module" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return <EnterpriseModuleWorkspacePage auth={auth} moduleKey="informed-consents" />;
}
