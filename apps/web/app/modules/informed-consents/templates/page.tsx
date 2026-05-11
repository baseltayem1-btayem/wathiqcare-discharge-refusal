import { notFound, redirect } from "next/navigation";
import InformedConsentsModulePage from "@/components/modules/InformedConsentsModulePage";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsTemplatesPage() {
  if (!isInformedConsentsEnabled()) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/templates");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return <InformedConsentsModulePage auth={auth} view="templates" />;
}
