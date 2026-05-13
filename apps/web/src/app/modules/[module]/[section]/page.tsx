import { notFound } from "next/navigation";

import AccessDenied from "@/components/AccessDenied";
import EnterpriseModuleWorkspacePage from "@/components/modules/EnterpriseModuleWorkspacePage";
import { normalizeEnterpriseSectionKey } from "@/lib/enterprise/workspace";
import { canAccessModule, isModuleKey } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function EnterpriseModuleSectionPage({
  params,
}: {
  params: Promise<{ module: string; section: string }>;
}) {
  const { module, section } = await params;

  if (!isModuleKey(module) || normalizeEnterpriseSectionKey(section) !== section) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect(`/modules/${module}/${section}`);

  if (!canAccessModule(module, { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Enterprise Module Workspace" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return <EnterpriseModuleWorkspacePage auth={auth} moduleKey={module} section={section} />;
}
