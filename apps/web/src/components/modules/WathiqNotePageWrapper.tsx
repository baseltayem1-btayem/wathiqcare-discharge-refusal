import AccessDenied from "@/components/AccessDenied";
import WathiqNoteWorkflowModule from "@/components/modules/WathiqNoteWorkflowModule";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const dynamic = "force-dynamic";

export default async function WathiqNotePageWrapper() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/wathiqnote");

  if (!canAccessModule("wathiqnote", { role: auth.role, platformRole: auth.platform_role })) {
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
