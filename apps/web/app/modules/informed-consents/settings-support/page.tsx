import { redirect } from "next/navigation";
import WathiqCareSettingsSupportScreen from "@/components/informed-consents/enterprise-workflow/WathiqCareSettingsSupportScreen";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function SettingsSupportPage() {
  const auth = await requirePageAuthClaimsOrRedirect();

  if (!canAccessModule(auth, "informed-consents")) {
    redirect("/modules");
  }

  return <WathiqCareSettingsSupportScreen />;
}
