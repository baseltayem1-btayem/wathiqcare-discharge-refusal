"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Stethoscope } from "lucide-react";
import AppBreadcrumbs from "@/components/AppBreadcrumbs";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/operations/NotificationBell";
import { useI18n } from "@/i18n/I18nProvider";
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

type NavLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  active: boolean;
  disabled?: boolean;
};

function NavLink({ href, label, icon, active, disabled = false }: NavLinkProps) {
  if (disabled) {
    return (
      <span className="inline-flex w-full cursor-not-allowed items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-gray-300">
        {icon}
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all"
      style={
        active
          ? { background: "#ecfeff", color: "#0e7490", fontWeight: 600, borderInlineStart: "3px solid #0891b2", paddingInlineStart: "calc(0.75rem - 3px)" }
          : { color: "#374151", borderInlineStart: "3px solid transparent", paddingInlineStart: "calc(0.75rem - 3px)" }
      }
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f0f9ff"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
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
    <div
      className={compact ? "flex h-9 w-[78px] items-center justify-center rounded-lg" : "flex h-20 w-[150px] items-center justify-center rounded-xl"}
      style={{ background: "linear-gradient(135deg, #cffafe, #ecfeff)", color: "#0e7490", border: "1px solid #a5f3fc" }}
    >
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

  // ── HARD ISOLATION GUARD ────────────────────────────────────────────────────
  // Platform admins must NEVER see the tenant shell.
  // Middleware enforces this at the edge; this is defense-in-depth at component level.
  // If a platform_admin somehow reaches AppShell, redirect immediately.
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [tenantBranding, setTenantBranding] = useState<TenantBranding | null>(null);
  useEffect(() => {
    fetchAuthMeCached<{ userType?: string; tenant?: TenantBranding | null }>({ cache: "no-store" })
      .then((me) => {
        if (me?.userType === "platform_admin") {
          setIsPlatformAdmin(true);
          router.replace("/platform");
          return;
        }
        setTenantBranding(me?.tenant ?? null);
      })
      .catch(() => { /* ignore — primary enforcement is middleware */ });
  }, [router]);

  if (isPlatformAdmin) return null;
  // ────────────────────────────────────────────────────────────────────────────

  const navItems = workflowCaseNav ? buildCaseWorkflowNav(workflowCaseNav) : TENANT_NAV_ITEMS;
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
    <div className="min-h-screen" style={{ background: "#f5f7fa" }}>
      {/* Top accent stripe */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #0891b2, #06b6d4, #0891b2)" }} />
      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-4 md:py-6">
        <aside
          className="hidden w-64 shrink-0 md:flex md:flex-col"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            padding: "20px 16px",
          }}
        >
          {/* Brand block */}
          <div
            className="rounded-xl p-3"
            style={{ background: "#f0fdff", border: "1px solid #e0f2fe" }}
          >
            <div className="flex justify-center">
              <TenantBrandMark name={tenantName} logoUrl={tenantLogoUrl} />
            </div>
            <div className="mt-3 rounded-lg border border-cyan-100 bg-white/80 px-3 py-2">
              <div className="flex justify-center">
                <img
                  src="/images/wathiqcare-logo.png"
                  alt={t("app.name")}
                  width={180}
                  height={54}
                  className="h-auto w-[110px] object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#0891b2" }}>
              {tenantName}
            </p>
            <p className="mt-0.5 text-center text-[11px] text-gray-500">{t("app.moduleTagline")}</p>
          </div>

          {/* Nav */}
          <nav className="mt-4 flex-1 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label ?? t(item.labelKey || "")}
                icon={item.icon}
                active={isActive(pathname, item.href)}
                disabled={item.disabled}
              />
            ))}
          </nav>

          {/* Status badge */}
          <div
            className="mt-4 rounded-xl p-3 text-xs"
            style={{ background: "#ecfeff", border: "1px solid #a5f3fc", color: "#0e7490" }}
          >
            <div className="inline-flex items-center gap-1.5 font-semibold">
              <Stethoscope className="h-3.5 w-3.5" />
              {t("app.activeWorkspace")}
            </div>
            <p className="mt-0.5" style={{ color: "#0891b2" }}>{t("app.secureMode")}</p>
          </div>

          <LanguageSwitcher className="mt-3" />

          <button
            type="button"
            onClick={() => { void handleLogout(); }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            style={{ borderColor: "#e2e8f0" }}
          >
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <header
            className="sticky top-0 z-10 rounded-xl px-4 py-4 md:px-5"
            style={{
              background: "rgba(255,255,255,0.90)",
              backdropFilter: "blur(14px)",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                  {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
                  <div className="mt-2">
                    <AppBreadcrumbs caseLabel={breadcrumbCaseLabel} />
                  </div>
                </div>
                <div className="inline-flex items-center gap-2">
                  <NotificationBell />
                  <div
                    className="hidden items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/80 px-2.5 py-2 sm:inline-flex"
                    title={tenantName}
                  >
                    <TenantBrandMark name={tenantName} logoUrl={tenantLogoUrl} compact />
                  </div>
                  <LanguageSwitcher className="md:hidden" />
                  <button
                    type="button"
                    onClick={() => { void handleLogout(); }}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 md:hidden"
                    style={{ borderColor: "#e2e8f0" }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t("common.logout")}
                  </button>
                </div>
              </div>

              {/* Mobile nav */}
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-xl p-2 md:hidden"
                style={{ background: "#f5f7fa", border: "1px solid #e2e8f0" }}
              >
                {navItems.map((item) => (
                  <NavLink
                    key={`mobile-${item.href}`}
                    href={item.href}
                    label={item.label ?? t(item.labelKey || "")}
                    icon={item.icon}
                    active={isActive(pathname, item.href)}
                    disabled={item.disabled}
                  />
                ))}
              </div>

              {actions ? (
                <div
                  className="flex flex-wrap items-center gap-2 rounded-xl p-2"
                  style={{ background: "#f5f7fa", border: "1px solid #e2e8f0" }}
                >
                  {actions}
                </div>
              ) : null}
            </div>
          </header>

          <main
            className="mt-4 rounded-xl p-5"
            style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
