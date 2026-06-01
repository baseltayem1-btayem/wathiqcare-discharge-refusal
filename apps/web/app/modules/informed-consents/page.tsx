import { redirect } from "next/navigation";
import InformedConsentsModulePageNew from "@/components/modules/InformedConsentsModulePageNew";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

// Approved developed informed-consents pilot interface should render at the
// module root route to match release acceptance criteria.
export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentsModulePageNew auth={auth} />;
}
