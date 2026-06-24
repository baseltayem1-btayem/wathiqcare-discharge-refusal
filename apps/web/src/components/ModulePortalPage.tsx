"use client";

import Link from "next/link";
import { Component } from "react";
import { ClipboardCheck, FileSignature, Landmark, ShieldCheck } from "lucide-react";

import ModuleShell from "@/components/ModuleShell";
import { useI18n } from "@/i18n/I18nProvider";
import { MODULE_DEFINITIONS, getAccessibleModules, type ModuleDefinition, type ModuleKey } from "@/lib/modules/catalog";

type PortalAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

function ModuleIcon({ moduleKey }: { moduleKey: ModuleKey }) {
  if (moduleKey === "informed-consents") {
    return <ClipboardCheck className="h-5 w-5 text-[var(--primary)]" />;
  }
  if (moduleKey === "wathiqnote") {
    return <Landmark className="h-5 w-5 text-[var(--primary)]" />;
  }
  if (moduleKey === "promissory-notes") {
    return <Landmark className="h-5 w-5 text-[var(--primary)]" />;
  }
  if (moduleKey === "discharge-refusal") {
    return <ShieldCheck className="h-5 w-5 text-[var(--primary)]" />;
  }
  return <FileSignature className="h-5 w-5 text-[var(--primary)]" />;
}

function ModuleCard({ moduleItem, isRtl }: { moduleItem: ModuleDefinition; isRtl: boolean }) {
  const { t } = useI18n();
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
        <Link href={moduleItem.href} className="toolbar-btn toolbar-btn-primary text-white">
          {t("modules.portal.actionButton")}
        </Link>
      </div>
    </div>
  );
}

function ModuleCardUnavailable({ moduleItem, isRtl }: { moduleItem: ModuleDefinition; isRtl: boolean }) {
  return (
    <div className="wc-panel space-y-4 opacity-70">
      <div className="flex items-start gap-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <ModuleIcon moduleKey={moduleItem.key} />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-900">{isRtl ? moduleItem.arabicTitle : moduleItem.englishTitle}</div>
          <div className="text-xs text-slate-500">{isRtl ? moduleItem.englishTitle : moduleItem.arabicTitle}</div>
          <div className="text-xs text-amber-700">{isRtl ? "غير متاح مؤقتاً" : "Temporarily unavailable"}</div>
        </div>
      </div>
      <div className="flex items-center justify-end border-t border-slate-200 pt-3">
        <span className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
          {isRtl ? "معطّل" : "Disabled"}
        </span>
      </div>
    </div>
  );
}

class ModuleCardErrorBoundary extends Component<
  { moduleItem: ModuleDefinition; isRtl: boolean; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("MODULES_RUNTIME_ERROR", {
      moduleKey: this.props.moduleItem.key,
      moduleHref: this.props.moduleItem.href,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  render() {
    if (this.state.hasError) {
      return <ModuleCardUnavailable moduleItem={this.props.moduleItem} isRtl={this.props.isRtl} />;
    }
    return this.props.children;
  }
}

export default function ModulePortalPage({ auth }: { auth: PortalAuth }) {
  const { isRtl, t } = useI18n();
  const hasAnyRole = Boolean((auth.role || "").trim() || (auth.platform_role || "").trim());
  const moduleCards = (() => {
    try {
      return getAccessibleModules({ role: auth.role, platformRole: auth.platform_role }).map((moduleItem) => ({
        moduleItem,
        unavailable: false,
      }));
    } catch (error) {
      console.error("MODULES_RUNTIME_ERROR", {
        route: "/modules",
        reason: "module_catalog_resolution_failed",
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      return MODULE_DEFINITIONS.map((moduleItem) => ({
        moduleItem,
        unavailable: true,
      }));
    }
  })();
  const hasActiveModuleCards = moduleCards.some((card) => !card.unavailable);

  return (
    <ModuleShell
      auth={auth}
      title={{
        ar: "WathiqCare™ Platform Portal",
        en: "WathiqCare™ Platform Portal",
      }}
      subtitle={{
        ar: "Healthcare Legal Automation & Consent Governance",
        en: "Healthcare Legal Automation & Consent Governance",
      }}
      eyebrow={{
        ar: "WathiqCare",
        en: "WathiqCare",
      }}
    >
      <div className="space-y-3">
        {!hasAnyRole ? (
          <section className="wc-panel space-y-2 border-amber-200 bg-amber-50">
            <div className="text-sm font-semibold text-amber-900">
              {isRtl ? "لا يمكن تحديد صلاحيات المستخدم" : "Unable to determine user access role"}
            </div>
            <p className="text-xs text-amber-800">
              {isRtl
                ? "يرجى إعادة تسجيل الدخول أو التواصل مع مدير النظام لتحديث الصلاحيات."
                : "Please sign in again or contact your administrator to refresh role assignments."}
            </p>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="wc-panel-heading">{t("modules.portal.heading")}</div>
          {hasAnyRole && !hasActiveModuleCards ? (
            <div className="wc-panel space-y-2 border-slate-200 bg-slate-50">
              <div className="text-sm font-semibold text-slate-900">
                {isRtl ? "لا توجد وحدات مفعّلة لهذا الحساب" : "No active modules are assigned to this account"}
              </div>
              <p className="text-xs text-slate-700">
                {isRtl
                  ? "تم تسجيل الدخول بنجاح، لكن لا توجد صلاحيات وحدات حالياً. يرجى التواصل مع مدير النظام لتفعيل الوحدة المطلوبة."
                  : "Login is successful, but no module permissions are currently assigned. Contact your administrator to activate required modules."}
              </p>
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {moduleCards.map(({ moduleItem, unavailable }) => (
              <ModuleCardErrorBoundary key={moduleItem.key} moduleItem={moduleItem} isRtl={isRtl}>
                {unavailable ? (
                  <ModuleCardUnavailable moduleItem={moduleItem} isRtl={isRtl} />
                ) : (
                  <ModuleCard moduleItem={moduleItem} isRtl={isRtl} />
                )}
              </ModuleCardErrorBoundary>
            ))}
          </div>
        </section>
      </div>
    </ModuleShell>
  );
}
