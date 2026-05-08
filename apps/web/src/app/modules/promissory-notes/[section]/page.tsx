import ModulePlaceholderPage from "@/components/ModulePlaceholderPage";
import AccessDenied from "@/components/AccessDenied";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import { notFound } from "next/navigation";

const SECTION_MAP = {
  list: {
    title: { ar: "قائمة السندات لأمر", en: "Promissory Notes List" },
    description: { ar: "قائمة مهيأة لإدارة السندات لأمر والالتزامات المالية الرقمية.", en: "Prepared list view for governed promissory-note and undertaking records." },
  },
  create: {
    title: { ar: "إنشاء سند إلكتروني", en: "Create Electronic Promissory Note" },
    description: { ar: "مساحة مهيأة لبدء سندات إلكترونية وتعهدات مالية جديدة.", en: "Prepared creation workspace for new electronic promissory notes and undertakings." },
  },
  acknowledgment: {
    title: { ar: "الإقرار والالتزام", en: "Debtor / Employee / Patient Acknowledgment" },
    description: { ar: "هيكل أولي لمسارات الإقرار الخاصة بالمدين أو الموظف أو المريض حسب نوع الالتزام.", en: "Prepared acknowledgment workflow structure for debtor, employee, or patient undertakings." },
  },
  signatures: {
    title: { ar: "التوقيع الرقمي", en: "Digital Signature" },
    description: { ar: "سطح مهيأ لاعتماد التوقيع الرقمي دون تفعيل منطق التنفيذ النهائي بعد.", en: "Prepared digital-signature surface without enabling final enforcement logic yet." },
  },
  archive: {
    title: { ar: "الأرشيف القانوني", en: "Legal Archive" },
    description: { ar: "تهيئة للأرشفة النظامية وحفظ المستندات الداعمة للسندات الإلكترونية.", en: "Prepared legal archive for promissory-note records and supporting evidence." },
  },
} as const;

const MENU_ITEMS = [
  { href: "/modules/promissory-notes", label: { ar: "لوحة الوحدة", en: "Module Dashboard" } },
  { href: "/modules/promissory-notes/list", label: { ar: "قائمة السندات", en: "Promissory Notes List" } },
  { href: "/modules/promissory-notes/create", label: { ar: "إنشاء سند إلكتروني", en: "Create Electronic Promissory Note" } },
  { href: "/modules/promissory-notes/acknowledgment", label: { ar: "الإقرار والالتزام", en: "Acknowledgment" } },
  { href: "/modules/promissory-notes/signatures", label: { ar: "التوقيع الرقمي", en: "Digital Signature" } },
  { href: "/modules/promissory-notes/archive", label: { ar: "الأرشيف القانوني", en: "Legal Archive" } },
];

export default async function PromissoryNotesSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const config = SECTION_MAP[section as keyof typeof SECTION_MAP];

  if (!config) {
    notFound();
  }

  const auth = await requirePageAuthClaimsOrRedirect(`/modules/promissory-notes/${section}`);

  if (!canAccessModule("promissory-notes", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Electronic Promissory Notes Module" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return <ModulePlaceholderPage auth={auth} moduleKey="promissory-notes" pageTitle={config.title} pageDescription={config.description} menuItems={MENU_ITEMS} />;
}