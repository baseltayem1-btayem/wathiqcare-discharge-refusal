import DischargeRefusalModuleScreen from "@/components/modules/DischargeRefusalModulePage";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

export default async function DischargeRefusalModulePage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/discharge-refusal");

  return <DischargeRefusalModuleScreen auth={auth} />;
}
