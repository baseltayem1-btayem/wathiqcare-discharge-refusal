import { notFound, redirect } from "next/navigation";
import { canAccessModule } from "@/lib/modules/catalog";
import { isInformedConsentsEnabled } from "@/lib/modules/informed-consents-release";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsPage() {
  if (!isInformedConsentsEnabled()) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/create");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  redirect("/modules/informed-consents/create");
}
