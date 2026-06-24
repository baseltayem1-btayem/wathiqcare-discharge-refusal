import AccessDenied from "@/components/AccessDenied";
import WathiqNoteWorkflowModule from "@/components/modules/WathiqNoteWorkflowModule";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const dynamic = "force-dynamic";

export default async function WathiqNoteEnterpriseModule() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/promissory-notes/enterprise");

  if (!canAccessModule("promissory-notes", { role: auth.role, platformRole: auth.platform_role })) {
    return (
      <AccessDenied
        resource="WathiqNote Enterprise Workspace"
        backHref="/modules"
        backLabel="العودة إلى الوحدات"
      />
    );
  }

  return <WathiqNoteWorkflowModule />;
}
