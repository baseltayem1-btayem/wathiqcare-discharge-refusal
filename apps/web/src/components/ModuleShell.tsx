"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Landmark, Layers3, LogOut, ShieldCheck, Workflow } from "lucide-react";

import AppBreadcrumbs from "@/components/AppBreadcrumbs";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import WathiqCareShell, { type WathiqCareShellAction } from "@/components/WathiqCareShell";
import { useI18n } from "@/i18n/I18nProvider";
import { getAccessibleModules, getModuleDefinition, moduleStatusLabel, type ModuleKey } from "@/lib/modules/catalog";
import { clearToken, fetchAuthMeCached } from "@/utils/api";

type TenantBranding = {
  id?: string;
  name?: string;
  code?: string;
  logoUrl?: string | null;
};

type ModuleShellAuth = {
  role?: string | null;
  platform_role?: string | null;
  email?: string;
};

type ModuleShellMenuItem = {
  href: string;
  label: {
    ar: string;
    en: string;
  };
};

type ModuleShellProps = {
  auth: ModuleShellAuth;
  title: {
    ar: string;
    en: string;
  };
  subtitle?: {
    ar: string;
    en: string;
  };
  eyebrow?: {
    ar: string;
    en: string;
  };
  moduleKey?: ModuleKey;
  menuItems?: ModuleShellMenuItem[];
  nextAction?: WathiqCareShellAction | null;
  quickActions?: WathiqCareShellAction[];
  toolbarExtras?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

function TenantBrandMark({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const isImcTenant = /\bIMC\b/i.test(name);
  const tenantLogoSrc = isImcTenant || !logoUrl ? "/images/imc-logo-white.png" : logoUrl;

  if (tenantLogoSrc) {
    return (
      <Image
        src={tenantLogoSrc}
        alt={name}
        width={120}
        height={36}
        className="h-auto w-full max-w-[120px] object-contain"
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return (
    <div className="flex h-9 w-full max-w-[120px] items-center justify-center rounded-lg border border-cyan-200 bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-700">
      <span className="text-sm font-bold tracking-[0.2em]">{initials || "TEN"}</span>
    </div>
  );
}

export default function ModuleShell({
  auth,
  title,
  subtitle,
  eyebrow,
  moduleKey,
  menuItems = [],
  nextAction = null,
  quickActions = [],
  toolbarExtras,
  children,
  footer,
}: ModuleShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isRtl } = useI18n();
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);
  const [isTenantContextDegraded, setIsTenantContextDegraded] = useState(false);

  useEffect(() => {
    fetchAuthMeCached<{ tenant?: TenantBranding | null }>({ cache: "no-store", authFailureMode: "inline" })
      .then((me) => {
        setTenantBranding(me?.tenant ?? null);
        setIsTenantContextDegraded(false);
      })
      .catch((error) => {
        console.error("MODULE_SHELL_AUTH_ME_RUNTIME_ERROR", error);
        setTenantBranding(null);
        setIsTenantContextDegraded(true);
      });
  }, []);

  const moduleDefinition = moduleKey ? getModuleDefinition(moduleKey) : null;
  const accessibleModules = useMemo(
    () => getAccessibleModules({ role: auth.role, platformRole: auth.platform_role }),
    [auth.platform_role, auth.role],
  );

  const defaultMenuItems: ModuleShellMenuItem[] = accessibleModules.map((moduleItem) => ({
    href: moduleItem.href,
    label: {
      ar: moduleItem.arabicTitle,
      en: moduleItem.englishTitle,
    },
  }));

  const effectiveMenuItems = [
    {
      href: "/modules",
      label: {
        ar: "الوحدات",
        en: "Modules",
      },
    },
    ...(menuItems.length ? menuItems : defaultMenuItems),
  ];

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Best-effort cookie clearing.
    }
    clearToken();
    router.replace("/login");
  }

  const tenantName = tenantBranding?.name?.trim() || "WathiqCare";
  const roleLabel = auth.platform_role ? (isRtl ? "مسؤول منصة" : "Platform Admin") : auth.role || (isRtl ? "مستخدم" : "User");

  return (
    <WathiqCareShell
      title={isRtl ? title.ar : title.en}
      subtitle={subtitle ? (isRtl ? subtitle.ar : subtitle.en) : tenantName}
      pathname={pathname}
      isRtl={isRtl}
      headerEyebrow={eyebrow ? (isRtl ? eyebrow.ar : eyebrow.en) : (isRtl ? "بوابة منصة وثيق كير" : "WathiqCare Platform Portal")}
      brand={(
        <Link href="/modules" className="wc-brand-block">
          <Image
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={120}
            height={32}
            className="h-7 w-auto object-contain"
            priority
          />
          <div className="wc-brand-copy">
            <div className="wc-brand-title">WathiqCare™</div>
            <div className="wc-brand-subtitle">{isRtl ? "Enterprise Healthcare Legal Automation Platform" : "Enterprise Healthcare Legal Automation Platform"}</div>
          </div>
        </Link>
      )}
      menuItems={effectiveMenuItems.map((item) => ({
        href: item.href,
        label: isRtl ? item.label.ar : item.label.en,
        active: pathname === item.href || pathname.startsWith(`${item.href}/`),
        icon: item.href === "/modules" ? <Layers3 className="h-4 w-4" /> : <Workflow className="h-4 w-4" />,
      }))}
      moduleMeta={(
        <>
          {moduleDefinition ? <span className="wc-module-pill">{isRtl ? moduleDefinition.arabicTitle : moduleDefinition.englishTitle}</span> : null}
          {moduleDefinition ? <span className="wc-module-pill">{moduleStatusLabel(moduleDefinition.status, isRtl)}</span> : null}
          <span className="wc-module-pill">
            <ShieldCheck className="h-3 w-3" />
            <span>{isRtl ? roleLabel : roleLabel}</span>
          </span>
        </>
      )}
      nextAction={nextAction}
      quickActions={quickActions}
      utilityControls={(
        <>
          <div className="hidden md:flex" title={tenantName}>
            <TenantBrandMark name={tenantName} logoUrl={tenantBranding?.logoUrl ?? null} />
          </div>
          <LanguageSwitcher className="hidden md:inline-flex" />
          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            className="toolbar-btn toolbar-btn-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
          </button>
        </>
      )}
      headerExtras={(
        <div className="space-y-2">
          <div className="wc-panel">
            <AppBreadcrumbs />
          </div>
          <div className="wc-panel wc-panel-inline text-[11px]">
            <span><strong>{isRtl ? "الجهة" : "Entity"}:</strong> {tenantName}</span>
            <span><strong>{isRtl ? "الوظيفة" : "Role"}:</strong> {roleLabel}</span>
            <span><strong>{isRtl ? "المسار" : "Route"}:</strong> <span className="font-mono">{pathname}</span></span>
          </div>
          {isTenantContextDegraded ? (
            <div className="wc-panel border-amber-200 bg-amber-50 text-xs text-amber-900">
              {isRtl
                ? "تعذر تحميل بيانات الجهة الحالية. تم تشغيل المنصة في وضع محدود حتى استعادة البيانات."
                : "Tenant context could not be loaded. Running in degraded mode until context data recovers."}
            </div>
          ) : null}
          {moduleDefinition ? (
            <div className="grid gap-2 lg:grid-cols-3">
              <div className="wc-panel wc-panel-inline">
                <Landmark className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>{isRtl ? moduleDefinition.executiveDescription.ar : moduleDefinition.executiveDescription.en}</span>
              </div>
              <div className="wc-panel wc-panel-inline">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                <span>{isRtl ? "سياق تشغيلي منضبط وقابل للتدقيق" : "Governed operational context with audit-ready controls"}</span>
              </div>
              <div className="wc-panel wc-panel-inline">
                <Building2 className="h-3.5 w-3.5 text-[var(--primary)]" />
                <span>{isRtl ? "مهيأ للاستخدام المؤسسي متعدد الأدوار" : "Prepared for enterprise, role-scoped operation"}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}
      toolbarExtras={toolbarExtras ? <div className="flex flex-wrap items-center gap-2">{toolbarExtras}</div> : null}
      footer={footer}
    >
      {children}
    </WathiqCareShell>
  );
}
