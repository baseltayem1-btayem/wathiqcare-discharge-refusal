"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Archive, FileCheck2, FileCog, FilePlus2, FolderKanban, Gavel, LayoutGrid, LogOut, Rocket, ShieldCheck, Stethoscope, Timer, ClipboardList, AlertTriangle, FileSignature, CheckCircle2, Database, MessageSquareHeart, HandHelping, FileText } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { clearToken } from "@/utils/api";

type AppShellProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  workflowCaseNav?: {
    caseId: string;
    currentStage?: string | null;
    escalationRequired?: boolean;
  };
};

type NavItem = {
  href: string;
  labelKey?: string;
  label?: string;
  icon: ReactNode;
  disabled?: boolean;
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

const CASE_STAGE_NAV = [
  {
    key: "medical_discharge_decision",
    href: (caseId: string) => `/cases/${caseId}`,
    labelKey: "workflow.stage.medical_discharge_decision",
    icon: <Stethoscope className="h-4 w-4" />,
  },
  {
    key: "initial_communication",
    href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/initial-communication`,
    labelKey: "workflow.stage.initial_communication",
    icon: <MessageSquareHeart className="h-4 w-4" />,
  },
  {
    key: "support_and_intervention",
    href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/social-services`,
    labelKey: "workflow.stage.support_and_intervention",
    icon: <HandHelping className="h-4 w-4" />,
  },
  {
    key: "refusal_form",
    href: (caseId: string) => `/cases/${caseId}/refusal-form`,
    labelKey: "workflow.stage.refusal_form",
    icon: <FileSignature className="h-4 w-4" />,
  },
  {
    key: "official_notification",
    href: (caseId: string) => `/cases/${caseId}/financial-notice`,
    labelKey: "workflow.stage.official_notification",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "escalation",
    href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/escalation-review`,
    labelKey: "workflow.stage.escalation",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    key: "closed",
    href: (caseId: string) => `/cases/${caseId}`,
    labelKey: "workflow.stage.closed",
    icon: <Archive className="h-4 w-4" />,
  },
] as const;

function buildCaseWorkflowNav(caseNav: NonNullable<AppShellProps["workflowCaseNav"]>): NavItem[] {
  const orderedKeys = CASE_STAGE_NAV.map((item) => item.key);
  const activeIndex = orderedKeys.indexOf((caseNav.currentStage || "") as (typeof orderedKeys)[number]);

  return CASE_STAGE_NAV
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
          ? { background: "#ecfeff", color: "#0e7490", fontWeight: 600, borderLeft: "3px solid #0891b2" }
          : { color: "#374151" }
      }
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f0f9ff"; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      {icon}
      {label}
    </Link>
  );
}

export default function AppShell({ title, subtitle, actions, children, workflowCaseNav }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const navItems = workflowCaseNav ? buildCaseWorkflowNav(workflowCaseNav) : NAV_ITEMS;

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
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#0891b2" }}>
              {t("app.name")}
            </p>
            <h2 className="mt-1 text-sm font-bold text-gray-900">{t("app.moduleName")}</h2>
            <p className="mt-0.5 text-[11px] text-gray-500">{t("app.moduleTagline")}</p>
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
                </div>
                <div className="inline-flex items-center gap-2">
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
