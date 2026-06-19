import { redirect } from "next/navigation";
import FinalInformedConsentsModule from "@/components/informed-consents/FinalInformedConsentsModule";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

// Phase 40 route wiring safeguard: keep src/app and app entry points aligned
// to the controlled-port OneDrive/Figma UI surface (visual-only, mock-backed).

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