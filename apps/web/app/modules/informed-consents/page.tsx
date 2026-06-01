import { redirect } from "next/navigation";
import FinalInformedConsentsModule from "@/components/informed-consents/FinalInformedConsentsModule";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

// Phase 40 route wiring: mount the controlled-port OneDrive/Figma UI as the
// primary /modules/informed-consents surface. Visual-only — backed by mock
// fixtures isolated in components/informed-consents/final-ui/fixtures/.
export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
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
