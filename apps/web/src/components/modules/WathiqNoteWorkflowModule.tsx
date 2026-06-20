import AccessDenied from "@/components/AccessDenied";
import PromissoryNotesModulePage from "@/components/modules/PromissoryNotesModulePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const dynamic = "force-dynamic";

export default async function WathiqNoteWorkflowModule() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/promissory-notes/enterprise");

  if (!canAccessModule("promissory-notes", { role: auth.role, platformRole: auth.platform_role })) {
    return (
      <AccessDenied
        resource="Electronic Promissory Notes Module"
        backHref="/modules"
        backLabel="العودة إلى الوحدات"
      />
    );
  }

  return (
    <PromissoryNotesModulePage
      auth={{
        role: auth.role,
        platform_role: auth.platform_role,
        email: auth.email,
      }}
      view="overview"
    />
  );
}
