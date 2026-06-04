import { redirect } from "next/navigation";
import { ApprovedPhysicianDashboard } from "@/components/approved-design/physician/ApprovedPhysicianDashboard";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    redirect("/dashboard");
  }

  const currentUser = auth as {
    name?: string | null;
    fullName?: string | null;
    email?: string | null;
    role?: string | null;
  };

  return (
    <section
      data-testid="approved-informed-consents-module"
      data-release-surface="approved-informed-consents"
      aria-label="Approved informed consents physician dashboard"
    >
      <h1 className="sr-only">Approved Informed Consents Physician Dashboard</h1>
      <ApprovedPhysicianDashboard
        initialLang="ar"
        currentUser={{
          name:
            currentUser.fullName ||
            currentUser.name ||
            currentUser.email ||
            "Physician",
          role: currentUser.role || auth.role,
        }}
      />
    </section>
  );
}
