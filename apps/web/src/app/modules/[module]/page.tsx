import { notFound } from "next/navigation";

import AccessDenied from "@/components/AccessDenied";
import EnterpriseModuleWorkspacePage from "@/components/modules/EnterpriseModuleWorkspacePage";
import { canAccessModule, isModuleKey } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function EnterpriseModulePage({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;

  if (!isModuleKey(module)) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect(`/modules/${module}`);

  if (!canAccessModule(module, { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Enterprise Module Workspace" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return <EnterpriseModuleWorkspacePage auth={auth} moduleKey={module} />;
}
