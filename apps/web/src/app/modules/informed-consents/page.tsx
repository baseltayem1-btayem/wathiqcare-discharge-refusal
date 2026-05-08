import ModulePlaceholderPage from "@/components/ModulePlaceholderPage";
import AccessDenied from "@/components/AccessDenied";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

const MENU_ITEMS = [
  { href: "/modules/informed-consents", label: { ar: "لوحة الوحدة", en: "Module Dashboard" } },
  { href: "/modules/informed-consents/cases", label: { ar: "قائمة الموافقات", en: "Consent Cases" } },
  { href: "/modules/informed-consents/create", label: { ar: "إنشاء مسار موافقة", en: "Create Consent Workflow" } },
  { href: "/modules/informed-consents/templates", label: { ar: "قوالب الموافقات", en: "Consent Templates" } },
  { href: "/modules/informed-consents/signatures", label: { ar: "توقيع المريض", en: "Patient Signature" } },
  { href: "/modules/informed-consents/archive", label: { ar: "الأرشيف والتدقيق", en: "Audit & Legal Archive" } },
];

export default async function InformedConsentsPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/informed-consents");

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Informed Consents Module" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return (
    <ModulePlaceholderPage
      auth={auth}
      moduleKey="informed-consents"
      pageTitle={{ ar: "لوحة تطبيق الموافقات المستنيرة", en: "Informed Consents Dashboard" }}
      pageDescription={{
        ar: "إدارة مسارات الموافقة المستنيرة، الإقرار الطبي، والتوثيق القانوني بشكل منظم.",
        en: "Govern informed-consent workflows, clinical acknowledgment, and defensible legal documentation.",
      }}
      menuItems={MENU_ITEMS}
    />
  );
}