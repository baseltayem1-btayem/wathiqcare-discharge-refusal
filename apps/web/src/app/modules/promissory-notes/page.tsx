import ModulePlaceholderPage from "@/components/ModulePlaceholderPage";
import AccessDenied from "@/components/AccessDenied";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";

const MENU_ITEMS = [
  { href: "/modules/promissory-notes", label: { ar: "لوحة الوحدة", en: "Module Dashboard" } },
  { href: "/modules/promissory-notes/list", label: { ar: "قائمة السندات", en: "Promissory Notes List" } },
  { href: "/modules/promissory-notes/create", label: { ar: "إنشاء سند إلكتروني", en: "Create Electronic Promissory Note" } },
  { href: "/modules/promissory-notes/acknowledgment", label: { ar: "الإقرار والالتزام", en: "Acknowledgment" } },
  { href: "/modules/promissory-notes/signatures", label: { ar: "التوقيع الرقمي", en: "Digital Signature" } },
  { href: "/modules/promissory-notes/archive", label: { ar: "الأرشيف القانوني", en: "Legal Archive" } },
];

export default async function PromissoryNotesPage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/promissory-notes");

  if (!canAccessModule("promissory-notes", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Electronic Promissory Notes Module" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return (
    <ModulePlaceholderPage
      auth={auth}
      moduleKey="promissory-notes"
      pageTitle={{ ar: "لوحة تطبيق السندات لأمر الإلكترونية", en: "Electronic Promissory Notes Dashboard" }}
      pageDescription={{
        ar: "إدارة السندات لأمر والتعهدات المالية الرقمية ضمن هيكل حوكمي وقانوني منضبط.",
        en: "Govern digital promissory notes and financial undertakings within a controlled legal-operational structure.",
      }}
      menuItems={MENU_ITEMS}
    />
  );
}