"use client";

import Link from "next/link";
import { FileSignature, Landmark, ShieldCheck } from "lucide-react";

import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";
import { getAccessibleModules, type ModuleDefinition, type ModuleKey } from "@/lib/modules/catalog";

type PortalAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

function ModuleIcon({ moduleKey }: { moduleKey: ModuleKey }) {
  if (moduleKey === "promissory-notes") {
    return <Landmark className="h-5 w-5 text-[var(--primary)]" />;
  }
  if (moduleKey === "discharge-refusal") {
    return <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />;
  }
  return <FileSignature className="h-5 w-5 text-[var(--primary)]" />;
}

function ModuleCard({ moduleItem, isRtl }: { moduleItem: ModuleDefinition; isRtl: boolean }) {
  return (
    <div className="wc-panel space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <ModuleIcon moduleKey={moduleItem.key} />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-slate-900">{isRtl ? moduleItem.arabicTitle : moduleItem.englishTitle}</div>
            <div className="text-xs text-slate-500">{isRtl ? moduleItem.englishTitle : moduleItem.arabicTitle}</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end border-t border-slate-200 pt-3">
        <Link href={moduleItem.href} className="toolbar-btn toolbar-btn-primary">
          {isRtl ? "فتح الوحدة" : "Open Module"}
        </Link>
      </div>
    </div>
  );
}

export default function ModulePortalPage({ auth }: { auth: PortalAuth }) {
  const { isRtl } = useI18n();
  const availableModules = getAccessibleModules({ role: auth.role, platformRole: auth.platform_role });

  return (
    <ModuleShell
      auth={auth}
      title={{
        ar: "بوابة الوحدات",
        en: "Modules Portal",
      }}
      subtitle={{
        ar: "مرحباً بك في واثق كير. اختر الوحدة المطلوبة للمتابعة.",
        en: "Welcome to WathiqCare. Select a module to continue.",
      }}
      eyebrow={{
        ar: "WathiqCare",
        en: "WathiqCare",
      }}
    >
      <div className="space-y-3">
        <section className="space-y-3">
          <div className="wc-panel-heading">{isRtl ? "وحدات المنصة" : "Platform Modules"}</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {availableModules.map((moduleItem) => (
              <ModuleCard key={moduleItem.key} moduleItem={moduleItem} isRtl={isRtl} />
            ))}
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}