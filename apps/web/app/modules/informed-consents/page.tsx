import { redirect } from "next/navigation";
import FigmaWathiqCareApp from "@/components/wathiqcare-figma-uiux/App";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  return (
    <section
      className="wathiqcare-figma-uiux-shell"
      data-testid="wathiqcare-modern-figma-doctor-workspace"
      data-release-surface="modern-figma-doctor-workspace"
      aria-label="WathiqCare Modern Doctor Workspace"
    >
      <FigmaWathiqCareApp />
    </section>
  );
}
