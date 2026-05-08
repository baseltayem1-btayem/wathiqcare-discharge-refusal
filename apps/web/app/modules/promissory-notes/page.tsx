import { redirect } from "next/navigation";
import PromissoryNotesModulePage from "@/components/modules/PromissoryNotesModulePage";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function PromissoryNotesPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/promissory-notes");

  if (!canAccessModule("promissory-notes", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <PromissoryNotesModulePage auth={auth} />;
}
