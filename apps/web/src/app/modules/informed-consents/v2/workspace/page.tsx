import AccessDenied from "@/components/AccessDenied";
import DoctorWorkspaceV2 from "@/components/clinical-content/doctor-workspace/DoctorWorkspaceV2";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const dynamic = "force-dynamic";

export default async function DoctorWorkspaceV2Page() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents/v2/workspace");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return (
      <AccessDenied
        resource="Doctor Workspace V2"
        backHref="/modules/informed-consents"
        backLabel="العودة إلى الموافقات المستنيرة"
      />
    );
  }

  return (
    <section
      data-testid="doctor-workspace-v2"
      data-release-surface="clinical-content-platform-v2"
      aria-label="Doctor Workspace V2"
    >
      <h1 className="sr-only">Doctor Workspace V2 — Clinical Content Platform</h1>
      <DoctorWorkspaceV2 auth={{ ...auth, tenantId: auth.tenant_id, userId: auth.sub }} />
    </section>
  );
}
