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
      data-testid="wathiqcare-figma-uiux-design-system"
      data-release-surface="figma-uiux-design-system"
      aria-label="WathiqCare Figma UI UX Design System"
    >
      <FigmaWathiqCareApp />
    </section>
  );
}
