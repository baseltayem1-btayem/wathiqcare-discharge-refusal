import AccessDenied from "@/components/AccessDenied";
import FinalInformedConsentsModule from "@/components/informed-consents/FinalInformedConsentsModule";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export const dynamic = "force-dynamic";

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return (
      <AccessDenied
        resource="Informed Consents Module"
        backHref="/modules"
        backLabel="العودة إلى الوحدات"
      />
    );
  }

  return (
    <section
      data-testid="approved-informed-consents-module"
      data-release-surface="approved-informed-consents"
      aria-label="Approved informed consents module"
    >
      <h1 className="sr-only">Approved Informed Consents Module</h1>
      <FinalInformedConsentsModule auth={auth} />
    </section>
  );
}
