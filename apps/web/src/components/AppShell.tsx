"use client";

import Link from "next/link";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardCheck, FileCheck2, FilePlus2, FileSearch, FileUp, LogOut, Send, ShieldCheck, Sparkles, Stethoscope } from "lucide-react";
import AppBreadcrumbs from "@/components/AppBreadcrumbs";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TopNavigation from "@/components/navigation/TopNavigation";
import { resolveSmartNavigation, type SmartActionKey, type SmartResolvedAction } from "@/components/navigation/smartNavigation";
import { useAiLegalIntelligence } from "@/components/navigation/useAiLegalIntelligence";
import { useCaseWorkflow } from "@/components/navigation/useCaseWorkflow";
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

const PRIMARY_TENANT_HREFS = [
  "/dashboard",
  "/cases",
  "/documents",
  "/alerts",
  "/legal-risk",
  "/reports",
  "/users",
  "/settings",
] as const;

function TenantBrandMark({ name, logoUrl, compact = false }: { name: string; logoUrl: string | null; compact?: boolean }) {
  const isImcTenant = /\bIMC\b/i.test(name);
  const shouldUseImcSidebarMark = !compact && (isImcTenant || !logoUrl);
  const tenantLogoSrc = shouldUseImcSidebarMark ? "/images/imc-logo-white.png" : logoUrl;

  if (tenantLogoSrc) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
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
        /* eslint-disable-next-line @next/next/no-img-element */
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

  const navItems = workflowCaseNav ? buildCaseWorkflowNav(workflowCaseNav) : TENANT_NAV_ITEMS;
  const primaryNavItems = workflowCaseNav
    ? navItems
    : PRIMARY_TENANT_HREFS
      .map((href) => navItems.find((item) => item.href === href))
      .filter((item): item is NavItem => Boolean(item));

  const normalizedRole = (viewerRole || "").toLowerCase();
  const canOperateQuickActions = ["admin", "manager", "owner"].some((role) => normalizedRole.includes(role));
  const { workflow: backendWorkflow } = useCaseWorkflow(pathname);

  const routeCaseId = useMemo(() => {
    if (workflowCaseNav?.caseId) {
      return workflowCaseNav.caseId;
    }
    const match = pathname.match(/^\/cases\/([^/?#]+)/);
    return match && match[1] !== "new" ? match[1] : null;
  }, [pathname, workflowCaseNav?.caseId]);

  const actionCatalog = useMemo(() => {
    const caseWorkspaceHref = routeCaseId ? `/cases/${routeCaseId}` : "/cases";

    return {
      newCase: {
        key: "newCase",
        href: "/cases/new",
        label: t("shell.quickActions.newCase"),
        icon: <FilePlus2 className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.quickActions.newCase"),
      },
      caseWorkspace: {
        key: "caseWorkspace",
        href: caseWorkspaceHref,
        label: t("shell.quickActions.caseWorkspace"),
        icon: <ClipboardCheck className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.quickActions.caseWorkspace"),
      },
      reviewCaseStatus: {
        key: "reviewCaseStatus",
        href: "/cases",
        label: t("shell.smartNavigation.actions.reviewCaseStatus"),
        icon: <ClipboardCheck className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.reviewCaseStatus"),
      },
      uploadDocument: {
        key: "uploadDocument",
        href: "/documents",
        label: t("shell.quickActions.uploadDocument"),
        icon: <FileUp className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.quickActions.uploadDocument"),
      },
      linkDocumentToCase: {
        key: "linkDocumentToCase",
        href: "/cases",
        label: t("shell.smartNavigation.actions.linkDocumentToCase"),
        icon: <FileCheck2 className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.linkDocumentToCase"),
      },
      reviewDocumentStatus: {
        key: "reviewDocumentStatus",
        href: "/documents",
        label: t("shell.smartNavigation.actions.reviewDocumentStatus"),
        icon: <FileSearch className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.reviewDocumentStatus"),
      },
      generateLegalPackage: {
        key: "generateLegalPackage",
        href: caseWorkspaceHref,
        label: t("shell.smartNavigation.actions.generateLegalPackage"),
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.generateLegalPackage"),
      },
      legalReadiness: {
        key: "legalReadiness",
        href: "/dashboards",
        label: t("shell.quickActions.legalReadiness"),
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.quickActions.legalReadiness"),
      },
      sendForApproval: {
        key: "sendForApproval",
        href: "/alerts",
        label: t("shell.smartNavigation.actions.sendForApproval"),
        icon: <Send className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.sendForApproval"),
      },
      generateReport: {
        key: "generateReport",
        href: "/reports",
        label: t("shell.quickActions.generateReport"),
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.quickActions.generateReport"),
      },
      exportReport: {
        key: "exportReport",
        href: "/reports",
        label: t("shell.smartNavigation.actions.exportReport"),
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.exportReport"),
      },
      reviewHighRiskItems: {
        key: "reviewHighRiskItems",
        href: "/legal-risk",
        label: t("shell.smartNavigation.actions.reviewHighRiskItems"),
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.reviewHighRiskItems"),
      },
      openRiskDashboard: {
        key: "openRiskDashboard",
        href: "/dashboards",
        label: t("shell.smartNavigation.actions.openRiskDashboard"),
        icon: <BarChart3 className="h-3.5 w-3.5" />,
        ariaLabel: t("shell.smartNavigation.actions.openRiskDashboard"),
      },
    } as const;
  }, [routeCaseId, t]);

  const baseAvailableActionKeys: SmartActionKey[] = workflowCaseNav
    ? ["caseWorkspace", "uploadDocument", "legalReadiness", "reviewCaseStatus", "generateLegalPackage", "sendForApproval"]
    : [
      "newCase",
      "uploadDocument",
      "reviewCaseStatus",
      "linkDocumentToCase",
      "reviewDocumentStatus",
      "generateLegalPackage",
      "legalReadiness",
      "sendForApproval",
      "reviewHighRiskItems",
      "openRiskDashboard",
      "exportReport",
      ...(canOperateQuickActions ? (["generateReport"] as SmartActionKey[]) : []),
    ];

  const smartResolution = resolveSmartNavigation(pathname, baseAvailableActionKeys, backendWorkflow);

  const resolveAction = (action: SmartResolvedAction) => {
    if (action.key) {
      const catalogAction = actionCatalog[action.key];
      if (catalogAction) {
        return {
          ...catalogAction,
          href: action.href || catalogAction.href,
          label: action.label || catalogAction.label,
          ariaLabel: action.label || catalogAction.ariaLabel,
        };
      }
    }

    if (action.label && action.href) {
      return {
        key: `custom-${action.label}`,
        href: action.href,
        label: action.label,
        icon: <ClipboardCheck className="h-3.5 w-3.5" />,
        ariaLabel: action.label,
      };
    }

    return null;
  };

  const nextAction = resolveAction(smartResolution.nextAction);
  const quickActions = smartResolution.secondaryActions
    .map((action) => resolveAction(action))
    .filter((action): action is NonNullable<ReturnType<typeof resolveAction>> => Boolean(action));

  const { insight: aiInsight, loading: aiInsightLoading } = useAiLegalIntelligence(routeCaseId);
  const aiGapCount = (aiInsight?.aiAssessment.clinicalDocumentationGaps.length || 0)
    + (aiInsight?.aiAssessment.legalDocumentationGaps.length || 0);
  const aiNextStep = aiInsight?.aiAssessment.recommendedNextSteps[0] || null;

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

  if (isPlatformAdmin) return null;
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-transparent">
      <TopNavigation
        pathname={pathname}
        isRtl={isRtl}
        brand={(
          <Link href="/dashboard" className="inline-flex items-center gap-2.5 rounded-xl border border-[var(--border-soft)] bg-slate-50/80 px-2.5 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/wathiqcare-logo.png"
              alt="WathiqCare"
              width={112}
              height={30}
              className="h-7 w-auto object-contain"
              loading="eager"
              decoding="async"
            />
            <span className="hidden rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary-pressed)] sm:inline-flex">
              {tenantName}
            </span>
          </Link>
        )}
        items={primaryNavItems.map((item) => ({
          href: item.href,
          label: t(item.labelKey || ""),
          icon: item.icon,
          disabled: item.disabled,
          ariaLabel: t(item.labelKey || ""),
        }))}
        quickActions={quickActions.map((action) => ({
          key: action.key,
          href: action.href,
          label: action.label,
          icon: action.icon,
          ariaLabel: action.ariaLabel,
        }))}
        nextAction={nextAction || undefined}
        currentModuleLabel={t(`shell.smartNavigation.modules.${smartResolution.moduleKey}`)}
        workflowStageLabel={t(`shell.smartNavigation.stages.${smartResolution.workflowStageKey}`)}
        workflowSourceLabel={smartResolution.source === "backend-driven"
          ? t("shell.smartNavigation.backendWorkflow")
          : t("shell.smartNavigation.suggestedWorkflow")}
        nextActionLabel={t("shell.smartNavigation.nextAction")}
        quickActionsLabel={t("shell.quickActions.title")}
        secondaryActionsLabel={t("shell.smartNavigation.secondaryActions")}
        workspaceStatus={(
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-pressed)]" aria-label={t("app.activeWorkspace")}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("app.activeWorkspace")}
          </span>
        )}
        rightControls={(
          <>
            <NotificationBell />
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-slate-50/80 px-2.5 py-2 sm:inline-flex" title={tenantName}>
              <TenantBrandMark name={tenantName} logoUrl={tenantLogoUrl} compact />
            </div>
            <LanguageSwitcher className="hidden md:inline-flex" />
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 md:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              {t("common.logout")}
            </button>
          </>
        )}
        mobileFooter={(
          <div className="space-y-2">
            <LanguageSwitcher className="w-full" />
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
        )}
      />

      <div className="mx-auto max-w-[1600px] px-3 py-3 md:px-5 md:py-5">
        <div className="min-w-0">
          <header className="rounded-2xl border border-[var(--border)] bg-white/95 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur md:px-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
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

                <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-soft)] bg-[var(--primary-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--primary-pressed)]">
                  <Stethoscope className="h-3.5 w-3.5" />
                  {t("app.secureMode")}
                </div>
              </div>

              {routeCaseId ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-xs text-slate-600">
                  <div className="inline-flex items-center gap-2 text-slate-700">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                    <span className="font-semibold">{t("shell.aiInsights.title")}</span>
                    <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {aiInsight?.source === "ai-assisted" ? t("shell.aiInsights.sourceAi") : t("shell.aiInsights.sourceUnavailable")}
                    </span>
                  </div>

                  {aiInsightLoading ? (
                    <span className="text-[11px] text-slate-500">{t("shell.aiInsights.loading")}</span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {t("shell.aiInsights.risk")}: {aiInsight?.aiAssessment.riskLevel || "UNKNOWN"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-[var(--border-soft)] bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {t("shell.aiInsights.gaps")}: {aiGapCount}
                      </span>
                      {aiNextStep ? (
                        <span className="inline-flex items-center rounded-full border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primary-pressed)]">
                          {t("shell.aiInsights.nextStep")}: {aiNextStep}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border-soft)] bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
                <div className="inline-flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{t("shell.session")}</span>
                  <span>{tenantName}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className="font-semibold text-slate-700">{t("shell.route")}</span>
                  <span className="font-mono text-[11px] text-slate-500">{pathname}</span>
                </div>
              </div>

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
  );
}
