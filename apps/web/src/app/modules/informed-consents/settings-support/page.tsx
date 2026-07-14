import AccessDenied from "@/components/AccessDenied";
import WathiqCareSettingsSupportScreen from "@/components/informed-consents/enterprise-workflow/WathiqCareSettingsSupportScreen";
import { requireInformedConsentsPageAccess } from "@/lib/server/informed-consents-page-auth";

export const dynamic = "force-dynamic";

export default async function InformedConsentSettingsSupportPage() {
  const access = await requireInformedConsentsPageAccess("/modules/informed-consents/settings-support");

  if (access.kind === "access_denied") {
    return (
      <AccessDenied
        resource="Informed Consents Module"
        backHref="/modules"
        backLabel="العودة إلى الوحدات"
      />
    );
  }

  return <WathiqCareSettingsSupportScreen />;
}
