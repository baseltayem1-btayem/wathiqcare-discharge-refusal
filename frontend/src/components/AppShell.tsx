"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Archive, FileCheck2, FileCog, FilePlus2, FolderKanban, Gavel, LayoutGrid, LogOut, Rocket, ShieldCheck, Stethoscope, Timer, ClipboardList, AlertTriangle, FileSignature, CheckCircle2, Database } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { clearToken } from "@/utils/api";

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
};

type NavItem = {
  href: string;
  labelKey: string;
  icon: ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
  { href: "/cases", labelKey: "nav.cases", icon: <FolderKanban className="h-4 w-4" /> },
  { href: "/cases/new", labelKey: "nav.newCase", icon: <FilePlus2 className="h-4 w-4" /> },
  { href: "/workflow", labelKey: "nav.workflowDocs", icon: <FileCog className="h-4 w-4" /> },
  { href: "/refusal-forms", labelKey: "nav.refusalForms", icon: <FileSignature className="h-4 w-4" /> },
  { href: "/legal-escalation", labelKey: "nav.legalEscalation", icon: <AlertTriangle className="h-4 w-4" /> },
  { href: "/escalation-timeline", labelKey: "nav.escalationTimeline", icon: <Timer className="h-4 w-4" /> },
  { href: "/legal-case-file", labelKey: "nav.legalCaseFile", icon: <Gavel className="h-4 w-4" /> },
  { href: "/audit-log", labelKey: "nav.auditViewer", icon: <ClipboardList className="h-4 w-4" /> },
  { href: "/icd11-validator", labelKey: "nav.icd11Validator", icon: <CheckCircle2 className="h-4 w-4" /> },
  { href: "/emr-integration", labelKey: "nav.emrIntegration", icon: <Database className="h-4 w-4" /> },
  { href: "/consents", labelKey: "nav.consents", icon: <FileCheck2 className="h-4 w-4" /> },
  { href: "/compliance", labelKey: "nav.compliance", icon: <ShieldCheck className="h-4 w-4" /> },
  { href: "/bundles", labelKey: "nav.bundles", icon: <Archive className="h-4 w-4" /> },
  { href: "/launch-status", labelKey: "nav.launchStatus", icon: <Rocket className="h-4 w-4" /> },
  { href: "/admin", labelKey: "nav.admin", icon: <ShieldCheck className="h-4 w-4" /> },
];

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
};

function NavLink({ href, label, icon, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={
        active
          ? "inline-flex w-full items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm"
          : "inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }
    >
      {icon}
      {label}
    </Link>
  );
}

export default function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie clearing is best-effort; local token is still removed below.
    }
    clearToken();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-cyan-50/60">
      <div className="mx-auto flex max-w-[1400px] gap-6 p-4 md:p-6">
        <aside className="hidden w-72 shrink-0 rounded-3xl border border-slate-200/80 bg-white/95 p-5 shadow-xl shadow-slate-200/40 backdrop-blur md:flex md:flex-col">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{t("app.name")}</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{t("app.moduleName")}</h2>
            <p className="mt-2 text-xs text-slate-600">{t("app.moduleTagline")}</p>
          </div>

          <nav className="mt-6 space-y-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={t(item.labelKey)}
                icon={item.icon}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="mt-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900">
            <div className="inline-flex items-center gap-1.5 font-semibold">
              <Stethoscope className="h-3.5 w-3.5" />
              {t("app.activeWorkspace")}
            </div>
            <p className="mt-1 text-cyan-700">{t("app.secureMode")}</p>
          </div>

          <LanguageSwitcher className="mt-4" />

          <button
            type="button"
            onClick={() => {
              void handleLogout();
            }}
            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            {t("common.logout")}
          </button>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 rounded-3xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-lg shadow-slate-200/40 backdrop-blur md:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">{title}</h1>
                  {subtitle ? <p className="mt-1 text-sm text-slate-600">{subtitle}</p> : null}
                </div>
                <div className="inline-flex items-center gap-2">
                  <LanguageSwitcher className="md:hidden" />
                  <button
                    type="button"
                    onClick={() => {
                      void handleLogout();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:hidden"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("common.logout")}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 md:hidden">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={`mobile-${item.href}`}
                    href={item.href}
                    label={t(item.labelKey)}
                    icon={item.icon}
                    active={isActive(pathname, item.href)}
                  />
                ))}
              </div>

              {actions ? (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  {actions}
                </div>
              ) : null}
            </div>
          </header>

          <main className="mt-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-200/40 md:mt-6 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
