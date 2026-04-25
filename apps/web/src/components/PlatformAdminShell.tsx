"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardCheck, FileSearch, LogOut, Send, Settings, ShieldCheck } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TopNavigation from "@/components/navigation/TopNavigation";
import { resolveSmartNavigation, type SmartActionKey, type SmartResolvedAction } from "@/components/navigation/smartNavigation";
import PlatformNotificationBell from "@/components/PlatformNotificationBell";
import { useI18n } from "@/i18n/I18nProvider";
import { clearToken } from "@/utils/api";
import { PLATFORM_NAV_ITEMS } from "@/config/platformSidebar";

type PlatformAdminShellProps = {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children: ReactNode;
};

type PlatformSmartAction = {
    key: SmartActionKey;
    href: string;
    label: string;
    icon: ReactNode;
    ariaLabel: string;
};

function platformNavLabel(label: string, isArabic: boolean): string {
    if (!isArabic) return label;
    const map: Record<string, string> = {
        "Platform Overview": "نظرة عامة على المنصة",
        "Tenant Management": "إدارة الجهات",
        "Users": "المستخدمون",
        "Subscription Management": "إدارة الاشتراكات",
        "Billing Dashboard": "لوحة الفوترة",
        "System Health": "صحة النظام",
        "Audit Logs": "سجلات التدقيق",
        "Support Tools": "أدوات الدعم",
        "Platform Settings": "إعدادات المنصة",
    };
    return map[label] ?? label;
}

export default function PlatformAdminShell({ title, subtitle, actions, children }: PlatformAdminShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { t, lang } = useI18n();
    const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);

    const actionCatalog = useMemo<Partial<Record<SmartActionKey, PlatformSmartAction>>>(() => {
        return {
            reviewCaseStatus: {
                key: "reviewCaseStatus",
                href: "/cases",
                label: t("shell.smartNavigation.actions.reviewCaseStatus"),
                icon: <ClipboardCheck className="h-3.5 w-3.5" />,
                ariaLabel: t("shell.smartNavigation.actions.reviewCaseStatus"),
            },
            reviewDocumentStatus: {
                key: "reviewDocumentStatus",
                href: "/documents",
                label: t("shell.smartNavigation.actions.reviewDocumentStatus"),
                icon: <FileSearch className="h-3.5 w-3.5" />,
                ariaLabel: t("shell.smartNavigation.actions.reviewDocumentStatus"),
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
        };
    }, [t]);

    const availableActionKeys: SmartActionKey[] = [
        "reviewCaseStatus",
        "reviewDocumentStatus",
        "sendForApproval",
        "generateReport",
        "exportReport",
        "reviewHighRiskItems",
        "openRiskDashboard",
    ];
    const smartResolution = resolveSmartNavigation(pathname, availableActionKeys);

    const resolveAction = (action: SmartResolvedAction): PlatformSmartAction | null => {
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

        if (action.href && action.label) {
            return {
                key: "reviewCaseStatus",
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
        .filter((action): action is PlatformSmartAction => Boolean(action));

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
        <div className="min-h-screen bg-[var(--background)]">
            <TopNavigation
                pathname={pathname}
                isRtl={lang === "ar"}
                brand={(
                    <Link href="/platform" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-soft)] bg-slate-50/80 px-2.5 py-1.5">
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
                            {txt("Platform", "المنصة")}
                        </span>
                    </Link>
                )}
                items={PLATFORM_NAV_ITEMS.map((item) => ({
                    href: item.href,
                    label: platformNavLabel(item.label, lang === "ar"),
                    icon: item.icon,
                    ariaLabel: platformNavLabel(item.label, lang === "ar"),
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
                quickActionsLabel={txt("Quick actions", "إجراءات سريعة")}
                secondaryActionsLabel={t("shell.smartNavigation.secondaryActions")}
                workspaceStatus={(
                    <span
                        className="inline-flex items-center gap-1 rounded-full border border-[#cdddf0] bg-[#edf4fb] px-2.5 py-1 text-xs font-semibold text-[#1f5fa7]"
                        aria-label={txt("Platform system mode", "وضع المنصة")}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {txt("System Mode", "وضع النظام")}
                    </span>
                )}
                rightControls={(
                    <>
                        <PlatformNotificationBell />
                        <LanguageSwitcher className="hidden md:inline-flex" />
                        <button
                            type="button"
                            onClick={() => { void handleLogout(); }}
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
                            onClick={() => { void handleLogout(); }}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-slate-700"
                        >
                            <LogOut className="h-4 w-4" />
                            {t("common.logout")}
                        </button>
                    </div>
                )}
            />

            <div className="mx-auto w-full max-w-[1600px] px-3 py-3 md:px-5 md:py-5">
                <div className="min-w-0 flex-1">
                    <header className="rounded-xl border border-[var(--border)] bg-white/90 px-4 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur md:px-5">
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                                    {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
                                </div>
                                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#cdddf0] bg-[#edf4fb] px-3 py-1 text-xs font-semibold text-[#1f5fa7]">
                                    <Settings className="h-3.5 w-3.5" />
                                    {txt("System Mode", "وضع النظام")}
                                </div>
                            </div>

                            {actions ? (
                                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[#d6dde5] bg-[#f8fafc] p-2">
                                    {actions}
                                </div>
                            ) : null}
                        </div>
                    </header>

                    <main className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
