import ModulePlaceholderPage from "@/components/ModulePlaceholderPage";
import AccessDenied from "@/components/AccessDenied";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { notFound } from "next/navigation";

const SECTION_MAP = {
  cases: {
    title: { ar: "قائمة حالات الموافقات", en: "Consent Cases" },
    description: { ar: "عرض ومتابعة حالات الموافقات المستنيرة ضمن هيكل الوحدة الجديد.", en: "Track and review informed-consent cases within the prepared module structure." },
  },
  create: {
    title: { ar: "إنشاء مسار موافقة", en: "Create Consent Workflow" },
    description: { ar: "إعداد نقطة البدء لمسارات الموافقة المستنيرة متعددة الأطراف.", en: "Prepared entry point for multi-step informed-consent workflow creation." },
  },
  templates: {
    title: { ar: "قوالب الموافقات", en: "Consent Templates" },
    description: { ar: "مساحة مهيأة لإدارة القوالب القانونية والسريرية للموافقات.", en: "Prepared workspace for consent template governance and clinical-legal document patterns." },
  },
  signatures: {
    title: { ar: "توقيع المريض", en: "Patient Signature" },
    description: { ar: "هيكل أولي لالتقاط التوقيع والإقرار المؤمّن للمريض.", en: "Prepared surface for secure patient signature and acknowledgment capture." },
  },
  archive: {
    title: { ar: "الأرشيف والتدقيق", en: "Audit & Legal Archive" },
    description: { ar: "تهيئة للأرشفة القانونية وسجل التدقيق الخاص بمسارات الموافقات.", en: "Prepared archive area for legal retention and audit sequencing of consent workflows." },
  },
} as const;

const MENU_ITEMS = [
  { href: "/modules/informed-consents", label: { ar: "لوحة الوحدة", en: "Module Dashboard" } },
  { href: "/modules/informed-consents/cases", label: { ar: "قائمة الموافقات", en: "Consent Cases" } },
  { href: "/modules/informed-consents/create", label: { ar: "إنشاء مسار موافقة", en: "Create Consent Workflow" } },
  { href: "/modules/informed-consents/templates", label: { ar: "قوالب الموافقات", en: "Consent Templates" } },
  { href: "/modules/informed-consents/signatures", label: { ar: "توقيع المريض", en: "Patient Signature" } },
  { href: "/modules/informed-consents/archive", label: { ar: "الأرشيف والتدقيق", en: "Audit & Legal Archive" } },
];

export default async function InformedConsentSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = SECTION_MAP[section as keyof typeof SECTION_MAP];

  if (!config) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect(`/modules/informed-consents/${section}`);

  if (!canAccessModule("informed-consents", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Informed Consents Module" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return <ModulePlaceholderPage auth={auth} moduleKey="informed-consents" pageTitle={config.title} pageDescription={config.description} menuItems={MENU_ITEMS} />;
}