import ModulePortalPage from "@/components/ModulePortalPage";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function ModulesPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules");

  return <ModulePortalPage auth={auth} />;
}