import { redirect } from "next/navigation";
import DoctorWorkspaceSafe from "@/components/wathiqcare-figma-uiux/DoctorWorkspaceSafe";
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
      data-release-surface="doctor-workspace-only-safe"
      aria-label="WathiqCare Doctor Workspace"
    >
      <DoctorWorkspaceSafe />
    </section>
  );
}
