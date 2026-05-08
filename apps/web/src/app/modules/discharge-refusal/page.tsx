import AccessDenied from "@/components/AccessDenied";
import ModuleShell from "@/components/ModuleShell";
import { canAccessModule } from "@/lib/modules/catalog";
import { requirePageAuthClaimsOrRedirect } from "@/lib/server/pageAuth";
import Link from "next/link";

const MENU_ITEMS = [
  { href: "/modules/discharge-refusal", label: { ar: "لوحة الوحدة", en: "Module Dashboard" } },
  { href: "/modules/discharge-refusal/dashboard", label: { ar: "لوحة الحالات", en: "Case Dashboard" } },
  { href: "/modules/discharge-refusal/cases", label: { ar: "مساحة الحالات", en: "Case Workspace" } },
];

export default async function DischargeRefusalModulePage() {
  const auth = await requirePageAuthClaimsOrRedirect("/modules/discharge-refusal");

  if (!canAccessModule("discharge-refusal", { role: auth.role, platformRole: auth.platform_role })) {
    return <AccessDenied resource="Discharge Refusal Platform" backHref="/modules" backLabel="العودة إلى الوحدات" />;
  }

  return (
    <ModuleShell
      auth={auth}
      moduleKey="discharge-refusal"
      title={{ ar: "منصة رفض الخروج", en: "Discharge Refusal Platform" }}
      subtitle={{
        ar: "ربط مباشر بالمسارات السريرية والقانونية المعتمدة دون المساس بالمسارات الإنتاجية القائمة.",
        en: "Direct entry into the validated discharge-refusal workflows without altering existing production routes.",
      }}
      eyebrow={{ ar: "مسارات التشغيل الفعلية", en: "Validated Operational Flows" }}
      menuItems={MENU_ITEMS}
      nextAction={{ href: "/dashboard", label: "Open Case Dashboard", variant: "primary" }}
      quickActions={[
        { href: "/cases", label: "Open Case Workspace", variant: "secondary" },
        { href: "/documents", label: "Legal Documents", variant: "secondary" },
      ]}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-4">
          <div className="wc-panel space-y-3">
            <div className="wc-panel-heading">Operational Continuity</div>
            <p className="text-sm leading-7 text-slate-700">
              This module entry preserves the validated discharge-refusal platform and maps users into the existing case dashboard, case workspace, secure-link generation, patient acknowledgment, OTP lifecycle, signature capture, audit trail, Arabic/English PDF generation, and legal package outputs.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              { href: "/dashboard", title: "Case Dashboard", text: "Validated discharge dashboards and operational overview." },
              { href: "/cases", title: "Case Workspace", text: "Live case handling, secure links, witness capture, and decisions." },
              { href: "/documents", title: "Legal Documents", text: "Arabic/English PDFs, legal package generation, and evidence output." },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="wc-link-card min-h-[148px] flex-col items-start justify-start gap-2 p-4">
                <span className="text-sm font-semibold text-slate-900">{item.title}</span>
                <span className="text-xs leading-6 text-slate-600">{item.text}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="wc-panel">
            <div className="wc-panel-heading">Compatibility Links</div>
            <div className="wc-link-grid">
              <Link href="/modules/discharge-refusal/dashboard" className="wc-link-card"><span>Case Dashboard Redirect</span></Link>
              <Link href="/modules/discharge-refusal/cases" className="wc-link-card"><span>Case Workspace Redirect</span></Link>
            </div>
          </div>
          <div className="wc-panel">
            <div className="wc-panel-heading">Workflow Coverage</div>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="wc-data-chip justify-start"><span>Secure-link generation</span></div>
              <div className="wc-data-chip justify-start"><span>Secure patient flow and OTP lifecycle</span></div>
              <div className="wc-data-chip justify-start"><span>Signature submission and audit trail</span></div>
              <div className="wc-data-chip justify-start"><span>Arabic/English PDFs and legal packages</span></div>
            </div>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}