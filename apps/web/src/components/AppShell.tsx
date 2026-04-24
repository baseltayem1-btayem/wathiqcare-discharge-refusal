"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, FileText, FolderOpen, HelpCircle, LayoutDashboard, LogOut, Menu, Scale, Settings, ShieldAlert, Stethoscope, Users, X } from "lucide-react";
import AppBreadcrumbs from "@/components/AppBreadcrumbs";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/operations/NotificationBell";
import { useI18n } from "@/i18n/I18nProvider";
import {
  beginTrackingForRoute,
  isTrackingEnabled,
  trackPageView,
  trackRouteChange,
  trackUiError,
} from "@/lib/tracking";
import { clearToken, fetchAuthMeCached } from "@/utils/api";
import { TENANT_NAV_ITEMS, CASE_STAGE_NAV_DEF, type TenantNavItem } from "@/config/tenantSidebar";

type TenantBranding = {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  breadcrumbCaseLabel?: string;
  workflowCaseNav?: {
    caseId: string;
    currentStage?: string | null;
    escalationRequired?: boolean;
  };
};

// NavItem type re-exported for local use (same shape as TenantNavItem)
type NavItem = TenantNavItem;

function buildCaseWorkflowNav(caseNav: NonNullable<AppShellProps["workflowCaseNav"]>): NavItem[] {
  const orderedKeys = CASE_STAGE_NAV_DEF.map((item) => item.key);
  const activeIndex = orderedKeys.indexOf((caseNav.currentStage || "") as (typeof orderedKeys)[number]);

  return CASE_STAGE_NAV_DEF
    .filter((item) => item.key !== "escalation" || Boolean(caseNav.escalationRequired) || item.key === caseNav.currentStage)
    .map((item, index) => ({
      href: item.href(caseNav.caseId),
      labelKey: item.labelKey,
      icon: item.icon,
      disabled: activeIndex >= 0 ? index > activeIndex + 1 : false,
    }));
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavGroup = {
  title: string;
  items: NavItem[];
};

type DashboardSidebarItem = {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
};

const NAV_GROUP_ORDER: Array<{ title: string; hrefs: string[] }> = [
  { title: "Workflows", hrefs: ["/cases", "/bundles", "/documents"] },
  { title: "Insights", hrefs: ["/dashboard", "/dashboards", "/analytics", "/reports"] },
  { title: "Management", hrefs: ["/tenant/users", "/admin", "/settings"] },
];

function groupTenantNavigation(navItems: NavItem[]): NavGroup[] {
  const byHref = new Map(navItems.map((item) => [item.href, item]));
  const seen = new Set<string>();
  const grouped: NavGroup[] = [];

  for (const groupDef of NAV_GROUP_ORDER) {
    const items = groupDef.hrefs
      .map((href) => byHref.get(href))
      .filter((item): item is NavItem => Boolean(item));

    if (items.length > 0) {
      grouped.push({ title: groupDef.title, items });
      items.forEach((item) => seen.add(item.href));
    }
  }

  const remainder = navItems.filter((item) => !seen.has(item.href));
  if (remainder.length > 0) {
    grouped.push({ title: "More", items: remainder });
  }

  return grouped;
}

type NavLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  disabled?: boolean;
  surface?: "sidebar" | "light";
};

function NavLink({ href, label, icon, active, disabled = false, surface = "sidebar" }: NavLinkProps) {
  const onSidebar = surface === "sidebar";

  if (disabled) {
    return (
      <span className={onSidebar
        ? "inline-flex w-full cursor-not-allowed items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-white/50 opacity-60 [&_svg]:text-white/50"
        : "inline-flex w-full cursor-not-allowed items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-400 opacity-60"}>
        <span className="shrink-0">{icon}</span>
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={
        active
          ? onSidebar
            ? "inline-flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/10 [&_svg]:text-white"
            : "inline-flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 border-[var(--primary-soft-border)] bg-[var(--primary-soft)] text-[var(--primary-pressed)]"
          : onSidebar
            ? "inline-flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-white/80 transition-all duration-200 hover:bg-white/5 hover:text-white [&_svg]:text-white/80 hover:[&_svg]:text-white"
            : "inline-flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50"
      }
    >
      <span className="shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

function TenantBrandMark({ name, logoUrl, compact = false }: { name: string; logoUrl: string | null; compact?: boolean }) {
  const isImcTenant = /\bIMC\b/i.test(name);
  const shouldUseImcSidebarMark = !compact && (isImcTenant || !logoUrl);
  const tenantLogoSrc = shouldUseImcSidebarMark ? "/images/imc-logo-white.png" : logoUrl;

  if (tenantLogoSrc) {
    return (
      <img
        src={tenantLogoSrc}
        alt={name}
        className={compact
          ? "h-auto w-full max-w-[120px] object-contain"
          : "h-auto w-full max-w-[220px] object-contain bg-transparent"}
      />
    );
  }

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, compact ? 2 : 3)
    .toUpperCase();
  return (
    <div className={compact ? "flex h-9 w-full max-w-[120px] items-center justify-center rounded-lg border border-cyan-200 bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-700" : "flex h-20 w-full max-w-[220px] items-center justify-center rounded-xl border border-white/20 bg-transparent text-white"}>
      {isImcTenant ? (
        <img
          src="https://www.imc.med.sa/images/logo.jpg"
          alt="IMC"
          className={compact ? "h-auto w-full object-contain" : "h-auto w-full object-contain brightness-0 invert"}
          loading="eager"
          decoding="async"
        />
      ) : (
        <span className={compact ? "text-sm font-bold tracking-[0.2em]" : "text-lg font-bold tracking-[0.3em]"}>{initials || "TEN"}</span>
      )}
    </div>
  );
}

function SidebarBranding({
  tenantName,
  tenantLogoUrl,
  mobile = false,
}: {
  tenantName: string;
  tenantLogoUrl: string | null;
  mobile?: boolean;
}) {
  const imcLogoSrc = tenantLogoUrl || "/images/imc-logo.png";

  return (
    <div className={mobile ? "space-y-2.5" : "space-y-3"}>
      <div className={mobile ? "flex items-center justify-center rounded-lg bg-white/5 px-2.5 py-2" : "flex items-center justify-center rounded-lg bg-white/5 px-3 py-2.5"}>
        <img
          src="/images/wathiqcare-logo.png"
          alt="WathiqCare"
          width={120}
          height={32}
          className={mobile
            ? "h-[30px] w-auto max-w-[150px] object-contain brightness-0 invert"
            : "h-[34px] w-auto max-w-[170px] object-contain brightness-0 invert"}
          loading="eager"
          decoding="async"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
        />
      </div>

      <div className={mobile
        ? "rounded-xl border border-white/20 bg-white/95 p-2"
        : "rounded-xl border border-white/20 bg-white/95 p-2.5"}>
        <div className="flex items-center justify-center">
          <img
            src={imcLogoSrc}
            alt={tenantName}
            width={220}
            height={72}
            className={mobile
              ? "h-[62px] w-auto max-w-full object-contain"
              : "h-[58px] w-auto max-w-full object-contain"}
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </div>
  );
}

export default function AppShell({
  title,
  subtitle,
  actions,
  children,
  breadcrumbCaseLabel,
  workflowCaseNav,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRtl } = useI18n();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ── HARD ISOLATION GUARD ────────────────────────────────────────────────────
  // Platform admins must NEVER see the tenant shell.
  // Middleware enforces this at the edge; this is defense-in-depth at component level.
  // If a platform_admin somehow reaches AppShell, redirect immediately.
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const previousPathRef = useRef<string | null>(null);
  useEffect(() => {
    fetchAuthMeCached<{
      userType?: string;
      tenant?: TenantBranding | null;
      user?: { role?: string | null } | null;
      claims?: { role?: string | null } | null;
    }>({ cache: "no-store" })
      .then((me) => {
        if (me?.userType === "platform_admin") {
          setIsPlatformAdmin(true);
          router.replace("/platform");
          return;
        }
        setTenantBranding(me?.tenant ?? null);
        setViewerRole(me?.user?.role ?? me?.claims?.role ?? null);
      })
      .catch(() => { /* ignore — primary enforcement is middleware */ });
  }, [router]);

  useEffect(() => {
    if (!isTrackingEnabled()) {
      return;
    }

    beginTrackingForRoute(pathname);
    trackPageView({ role: viewerRole ?? undefined });

    const previousPath = previousPathRef.current;
    if (previousPath && previousPath !== pathname) {
      trackRouteChange(previousPath, pathname, { role: viewerRole ?? undefined });
    }

    previousPathRef.current = pathname;
  }, [pathname, viewerRole]);

  useEffect(() => {
    if (!isTrackingEnabled()) {
      return;
    }

    const onWindowError = () => {
      trackUiError({ source: "window_error", role: viewerRole ?? undefined });
    };

    const onUnhandledRejection = () => {
      trackUiError({ source: "unhandled_rejection", role: viewerRole ?? undefined });
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [viewerRole]);

  if (isPlatformAdmin) return null;
  // ────────────────────────────────────────────────────────────────────────────

  const navItems = workflowCaseNav ? buildCaseWorkflowNav(workflowCaseNav) : TENANT_NAV_ITEMS;
  const navGroups = workflowCaseNav
    ? [{ title: t("app.activeWorkspace"), items: navItems }]
    : groupTenantNavigation(navItems);
  const isDashboardsSidebarMode = pathname.includes("/dashboards");
  const dashboardSidebarItems: DashboardSidebarItem[] = [
    { key: "dashboard", href: "/dashboard", label: "لوحة التحكم", icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: "cases", href: "/cases", label: "الحالات", icon: <FolderOpen className="h-4 w-4" /> },
    { key: "documents", href: "/documents", label: "المستندات", icon: <FileText className="h-4 w-4" /> },
    { key: "alerts", href: "/legal-alerts", label: "التنبيهات", icon: <Bell className="h-4 w-4" /> },
    { key: "risk", href: "/legal-escalation", label: "المخاطر والإفصاح", icon: <ShieldAlert className="h-4 w-4" /> },
    { key: "reports", href: "/reports", label: "التقارير", icon: <BarChart3 className="h-4 w-4" /> },
    { key: "users", href: "/tenant/users", label: "المستخدمون", icon: <Users className="h-4 w-4" /> },
    { key: "settings", href: "/settings", label: "الإعدادات", icon: <Settings className="h-4 w-4" /> },
  ];
  const tenantName = tenantBranding?.name?.trim() || t("app.tenantName");
  const tenantLogoUrl = tenantBranding?.logoUrl ?? null;

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Server-side cookie clearing is best-effort; legacy local token cleanup still runs.
    }
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-[1600px] px-3 py-3 md:px-5 md:py-5">
        <div className="wc-shell-grid">
          <aside
            className={`hidden shrink-0 rounded-[24px] border p-4 text-white shadow-[0_20px_45px_rgba(2,6,23,0.22)] md:flex md:flex-col ${isDashboardsSidebarMode ? "w-[260px] border-[#173454] bg-[#071a33]" : "w-[296px] border-[var(--sidebar-border)] bg-[#0A2540]"}`}
          >
            {isDashboardsSidebarMode ? (
              <>
                <div className="mb-5 rounded-2xl border border-white/15 bg-white/5 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5 text-right">
                      <div className="text-sm font-semibold text-white">منصة إدارة</div>
                      <div className="text-sm font-semibold text-white/90">الحالات القانونية</div>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 space-y-1.5">
                  {dashboardSidebarItems.map((item) => {
                    const isActiveItem = item.key === "cases";

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={isActiveItem
                          ? "inline-flex w-full items-center gap-2.5 rounded-xl bg-[#1E63B5] px-3 py-2.5 text-sm font-semibold text-white"
                          : "inline-flex w-full items-center gap-2.5 rounded-xl bg-transparent px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"}
                      >
                        <span className={isActiveItem ? "text-white" : "text-slate-300"}>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 p-3 text-right">
                  <div className="text-sm font-semibold text-white">محتاج مساعدة؟</div>
                  <p className="mt-1 text-xs text-slate-300">تواصل مع الدعم الفني</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[#0A2540] transition hover:bg-slate-100"
                  >
                    تواصل الآن
                  </button>
                </div>
              </>
            ) : (
              <>
                <SidebarBranding tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} />

                <nav className="mt-3 flex-1 space-y-4">
                  {navGroups.map((group) => (
                    <section key={group.title}>
                      <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                        {group.title}
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item) => (
                          <NavLink
                            key={item.href}
                            href={item.href}
                            label={item.label ?? t(item.labelKey || "")}
                            icon={item.icon}
                            active={isActive(pathname, item.href)}
                            disabled={item.disabled}
                            surface="sidebar"
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </nav>

                <div className="mt-4 rounded-2xl border border-[rgba(159,179,207,0.24)] bg-[rgba(255,255,255,0.05)] p-3 text-xs text-[#cfe0f7]">
                  <div className="inline-flex items-center gap-1.5 font-semibold">
                    <Stethoscope className="h-3.5 w-3.5 text-white" />
                    {t("app.activeWorkspace")}
                  </div>
                  <p className="mt-1 text-white/70">{t("app.secureMode")}</p>
                  <div className="mt-3 rounded-xl border border-[rgba(159,179,207,0.24)] bg-[rgba(10,20,36,0.5)] p-2">
                    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-white">
                      <HelpCircle className="h-3 w-3 text-white/80" />
                      Support
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/70">
                      For urgent legal package blockers, contact the command support channel.
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <LanguageSwitcher variant="sidebar" />
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/20 [&_svg]:text-white/80"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("common.logout")}
                  </button>
                </div>
              </>
            )}
          </aside>

          <div className="min-w-0">
            <header
              className="sticky top-3 z-20 rounded-2xl border border-[var(--border)] bg-white/90 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur md:px-6"
            >
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2 md:hidden">
                      <button
                        type="button"
                        onClick={() => setMobileNavOpen((current) => !current)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-slate-700"
                        aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
                      >
                        {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                      </button>
                      <div className="rounded-xl border border-[var(--border-soft)] bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                        {tenantName}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold wc-status-ready">
                        {t("app.activeWorkspace")}
                      </span>
                    </div>
                    {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
                    <div className="mt-3">
                      <AppBreadcrumbs caseLabel={breadcrumbCaseLabel} />
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 self-start">
                    <NotificationBell />
                    <div className="hidden items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-slate-50/80 px-2.5 py-2 sm:inline-flex" title={tenantName}>
                      <TenantBrandMark name={tenantName} logoUrl={tenantLogoUrl} compact />
                    </div>
                    <LanguageSwitcher className="md:hidden" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                  <div className="inline-flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Session:</span>
                    <span>{tenantName}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Mode:</span>
                    <span>{t("app.secureMode")}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Route:</span>
                    <span className="font-mono text-[11px] text-slate-500">{pathname}</span>
                  </div>
                </div>

                {mobileNavOpen ? (
                  <>
                    <button
                      type="button"
                      aria-label="Close mobile navigation"
                      onClick={() => setMobileNavOpen(false)}
                      className="fixed inset-0 z-30 bg-slate-900/35 md:hidden"
                    />
                    <div
                      className={`fixed top-20 z-40 w-[85vw] max-w-[320px] max-h-[calc(100vh-6rem)] overflow-y-auto space-y-3 rounded-xl border border-[var(--sidebar-border)] bg-[#0A2540] p-3 text-white shadow-[0_20px_45px_rgba(2,6,23,0.28)] md:hidden ${isRtl ? "right-3" : "left-3"}`}
                    >
                      <SidebarBranding tenantName={tenantName} tenantLogoUrl={tenantLogoUrl} mobile />
                      {navGroups.map((group) => (
                        <section key={`mobile-${group.title}`}>
                          <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">{group.title}</div>
                          <div className="space-y-1">
                            {group.items.map((item) => (
                              <div key={`mobile-link-${item.href}`} onClick={() => setMobileNavOpen(false)}>
                                <NavLink
                                  href={item.href}
                                  label={item.label ?? t(item.labelKey || "")}
                                  icon={item.icon}
                                  active={isActive(pathname, item.href)}
                                  disabled={item.disabled}
                                  surface="sidebar"
                                />
                              </div>
                            ))}
                          </div>
                        </section>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          void handleLogout();
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-white/20 [&_svg]:text-white/80"
                      >
                        <LogOut className="h-4 w-4" />
                        {t("common.logout")}
                      </button>
                    </div>
                  </>
                ) : null}

                {actions ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white p-2.5">
                    {actions}
                  </div>
                ) : null}
              </div>
            </header>

            <main className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-sm)] md:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
