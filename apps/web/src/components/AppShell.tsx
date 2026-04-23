"use client";

import Link from "next/link";
import { ReactNode, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HelpCircle, LogOut, Menu, Stethoscope, X } from "lucide-react";
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
        ? "inline-flex w-full cursor-not-allowed items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[var(--sidebar-text-muted)] opacity-60"
        : "inline-flex w-full cursor-not-allowed items-center gap-2 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-400 opacity-60"}>
        {icon}
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
            ? "inline-flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 border-[var(--sidebar-active-border)] bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] shadow-[0_6px_14px_rgba(2,6,23,0.24)]"
            : "inline-flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-all duration-200 border-[var(--primary-soft-border)] bg-[var(--primary-soft)] text-[var(--primary-pressed)]"
          : onSidebar
            ? "inline-flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[var(--sidebar-text)] transition-all duration-200 hover:border-[rgba(159,179,207,0.28)] hover:bg-white/10"
            : "inline-flex w-full items-center gap-2.5 rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50"
      }
    >
      {icon}
      {label}
    </Link>
  );
}

function TenantBrandMark({ name, logoUrl, compact = false }: { name: string; logoUrl: string | null; compact?: boolean }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className={compact ? "h-auto w-[78px] object-contain" : "h-auto w-[150px] object-contain"}
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
  const isImcTenant = /\bIMC\b/i.test(name);

  return (
    <div className={compact ? "flex h-9 w-[78px] items-center justify-center rounded-lg border border-cyan-200 bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-700" : "flex h-20 w-[150px] items-center justify-center rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-100 to-cyan-50 text-cyan-700"}>
      {isImcTenant ? (
        <img
          src="https://www.imc.med.sa/images/logo.jpg"
          alt="IMC"
          className="h-8 w-auto object-contain"
          loading="eager"
          decoding="async"
        />
      ) : (
        <span className={compact ? "text-sm font-bold tracking-[0.2em]" : "text-lg font-bold tracking-[0.3em]"}>{initials || "TEN"}</span>
      )}
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
  const { t } = useI18n();
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
            className="hidden rounded-[24px] border border-[var(--sidebar-border)] bg-[linear-gradient(180deg,var(--sidebar-bg)_0%,var(--sidebar-bg-elevated)_100%)] p-4 shadow-[0_20px_45px_rgba(2,6,23,0.22)] md:flex md:flex-col"
          >
            <div className="rounded-2xl border border-[rgba(159,179,207,0.24)] bg-[rgba(12,25,45,0.55)] p-3">
              <div className="flex justify-center">
                <TenantBrandMark name={tenantName} logoUrl={tenantLogoUrl} />
              </div>
              <div className="mt-3 rounded-xl border border-[rgba(159,179,207,0.24)] bg-[rgba(255,255,255,0.04)] px-3 py-2">
                <div className="flex justify-center">
                  <img
                    src="/images/wathiqcare-logo.png"
                    alt={t("app.name")}
                    width={180}
                    height={54}
                    className="h-auto w-[114px] object-contain"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
              <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b8cceb]">
                {tenantName}
              </p>
            </div>

            <nav className="mt-4 flex-1 space-y-4">
              {navGroups.map((group) => (
                <section key={group.title}>
                  <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--sidebar-text-muted)]">
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
              <p className="mt-1 text-[var(--sidebar-text-muted)]">{t("app.secureMode")}</p>
              <div className="mt-3 rounded-xl border border-[rgba(159,179,207,0.24)] bg-[rgba(10,20,36,0.5)] p-2">
                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#d8e6f9]">
                  <HelpCircle className="h-3 w-3 text-white" />
                  Support
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--sidebar-text-muted)]">
                  For urgent legal package blockers, contact the command support channel.
                </p>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[rgba(159,179,207,0.24)] bg-[rgba(255,255,255,0.06)] px-3 py-2 text-sm font-medium text-slate-100 transition"
              >
                <LogOut className="h-4 w-4" />
                {t("common.logout")}
              </button>
            </div>
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
                  <div className="space-y-3 rounded-xl border border-[var(--border)] bg-white p-3 shadow-[var(--shadow-sm)] md:hidden">
                    {navGroups.map((group) => (
                      <section key={`mobile-${group.title}`}>
                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{group.title}</div>
                        <div className="space-y-1">
                          {group.items.map((item) => (
                            <div key={`mobile-link-${item.href}`} onClick={() => setMobileNavOpen(false)}>
                              <NavLink
                                href={item.href}
                                label={item.label ?? t(item.labelKey || "")}
                                icon={item.icon}
                                active={isActive(pathname, item.href)}
                                disabled={item.disabled}
                                surface="light"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700"
                    >
                      <LogOut className="h-4 w-4" />
                      {t("common.logout")}
                    </button>
                  </div>
                ) : null}

                {actions ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-white p-2.5">
                    {actions}
                  </div>
                ) : null}
              </div>
            </header>

            <main className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-[var(--shadow-sm)] md:p-6">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
