import AccessDenied from "@/components/AccessDenied";
import EnterpriseModuleWorkspacePage from "@/components/modules/EnterpriseModuleWorkspacePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { notFound } from "next/navigation";

const SECTION_MAP = new Set(["workflow", "documents", "audit-trail", "signatures", "timeline", "risk-analysis"]);

export default async function InformedConsentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;

  if (!SECTION_MAP.has(section)) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect(`/modules/informed-consents/${section}`);

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Informed Consents Module" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return <EnterpriseModuleWorkspacePage auth={auth} moduleKey="informed-consents" section={section} />;
}
