import { redirect } from "next/navigation";
import DoctorWorkspaceOnlyApp from "@/components/wathiqcare-figma-uiux/DoctorWorkspaceOnlyApp";
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
      data-testid="doctor-workspace-route"
      data-release-surface="doctor-workspace-only"
      aria-label="WathiqCare Doctor Workspace"
    >
      <DoctorWorkspaceOnlyApp />
    </section>
  );
}
