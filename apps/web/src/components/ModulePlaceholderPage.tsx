"use client";

import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";

import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";
import { getModuleDefinition, type ModuleKey } from "@/lib/modules/catalog";

type PlaceholderAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

type PlaceholderPageProps = {
  auth: PlaceholderAuth;
  moduleKey: ModuleKey;
  pageTitle: {
    ar: string;
    en: string;
  };
  pageDescription: {
    ar: string;
    en: string;
  };
  menuItems: Array<{
    href: string;
    label: {
      ar: string;
      en: string;
    };
  }>;
};

export default function ModulePlaceholderPage({ auth, moduleKey, pageTitle, pageDescription, menuItems }: PlaceholderPageProps) {
  const { isRtl } = useI18n();
  const moduleDefinition = getModuleDefinition(moduleKey);

  return (
    <ModuleShell
      auth={auth}
      moduleKey={moduleKey}
      title={pageTitle}
      subtitle={{
        ar: moduleDefinition.shortDescription.ar,
        en: moduleDefinition.shortDescription.en,
      }}
      eyebrow={{
        ar: moduleDefinition.arabicTitle,
        en: moduleDefinition.englishTitle,
      }}
      menuItems={menuItems}
      nextAction={{
        href: "/modules",
        label: isRtl ? "العودة إلى الوحدات" : "Back to Modules",
        variant: "primary",
      }}
      quickActions={moduleKey === "discharge-refusal"
        ? [
            { href: "/dashboard", label: isRtl ? "لوحة رفض الخروج" : "Discharge Dashboard", variant: "secondary" },
            { href: "/cases", label: isRtl ? "مساحة الحالات" : "Case Workspace", variant: "secondary" },
          ]
        : []}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
        <div className="wc-panel space-y-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
              <FileText className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{isRtl ? pageTitle.ar : pageTitle.en}</h2>
              <p className="text-sm text-slate-600">{isRtl ? pageDescription.ar : pageDescription.en}</p>
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-sm leading-7 text-slate-700">
            <div className="font-semibold text-slate-900">{isRtl ? "تم إعداد هيكل الوحدة" : "Module structure prepared"}</div>
            <div>{isRtl ? "تم إعداد هيكل الوحدة — تنفيذ مسار العمل قيد الاعتماد." : "Module structure prepared — workflow implementation pending."}</div>
          </div>
        </div>
        <div className="space-y-3">
          <div className="wc-panel">
            <div className="wc-panel-heading">{isRtl ? "حالة التنفيذ" : "Implementation Status"}</div>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="wc-data-chip justify-start"><ShieldCheck className="h-3.5 w-3.5 text-emerald-700" /><span>{isRtl ? "الهيكل والتنقل جاهزان" : "Structure and navigation are ready"}</span></div>
              <div className="wc-data-chip justify-start"><ShieldCheck className="h-3.5 w-3.5 text-amber-600" /><span>{isRtl ? "تنفيذ الإجراءات التفصيلية بانتظار الاعتماد" : "Detailed workflow execution is pending approval"}</span></div>
            </div>
          </div>
          <div className="wc-panel">
            <div className="wc-panel-heading">{isRtl ? "روابط الوحدة" : "Module Links"}</div>
            <div className="wc-link-grid">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href} className="wc-link-card">
                  <span className="wc-link-card__icon"><FileText className="h-4 w-4" /></span>
                  <span>{isRtl ? item.label.ar : item.label.en}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}