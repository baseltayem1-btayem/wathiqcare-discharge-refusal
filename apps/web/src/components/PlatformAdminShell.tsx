"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ClipboardCheck, FileSearch, LogOut, Send, Settings, ShieldCheck } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import WathiqCareShell from "@/components/WathiqCareShell";
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
        <WathiqCareShell
            title={title}
            subtitle={subtitle}
            pathname={pathname}
            isRtl={lang === "ar"}
            brand={(
                <Link href="/platform" className="wc-brand-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/images/wathiqcare-logo.png"
                        alt="WathiqCare"
                        width={120}
                        height={32}
                        className="h-7 w-auto object-contain"
                        loading="eager"
                        decoding="async"
                    />
                    <div className="wc-brand-copy">
                        <div className="wc-brand-title">WathiqCare System</div>
                        <div className="wc-brand-subtitle">{txt("Platform Administration", "إدارة المنصة")}</div>
                    </div>
                </Link>
            )}
            menuItems={PLATFORM_NAV_ITEMS.map((item) => ({
                href: item.href,
                label: platformNavLabel(item.label, lang === "ar"),
                icon: item.icon,
                active: pathname === item.href || pathname.startsWith(`${item.href}/`),
                ariaLabel: platformNavLabel(item.label, lang === "ar"),
            }))}
            moduleMeta={(
                <>
                    <span className="wc-module-pill">{t(`shell.smartNavigation.modules.${smartResolution.moduleKey}`)}</span>
                    <span className="wc-module-pill">{t(`shell.smartNavigation.stages.${smartResolution.workflowStageKey}`)}</span>
                    <span className="wc-module-pill">
                        <Settings className="h-3 w-3" />
                        <span>{txt("System Mode", "وضع النظام")}</span>
                    </span>
                </>
            )}
            nextAction={nextAction ? { href: nextAction.href, label: nextAction.label, icon: nextAction.icon, ariaLabel: nextAction.ariaLabel, variant: "primary" } : null}
            quickActions={quickActions.map((action) => ({
                href: action.href,
                label: action.label,
                icon: action.icon,
                ariaLabel: action.ariaLabel,
                variant: "secondary",
            }))}
            utilityControls={(
                <>
                    <PlatformNotificationBell />
                    <LanguageSwitcher className="hidden md:inline-flex" />
                    <button
                        type="button"
                        onClick={() => { void handleLogout(); }}
                        className="toolbar-btn toolbar-btn-secondary"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{t("common.logout")}</span>
                    </button>
                </>
            )}
            headerExtras={(
                <div className="wc-panel wc-panel-inline text-[11px]">
                    <span><strong>{txt("Workspace", "مساحة العمل")}:</strong> {txt("Platform Control Center", "مركز التحكم بالمنصة")}</span>
                    <span><strong>{txt("Workflow", "سير العمل")}:</strong> {smartResolution.source === "backend-driven" ? t("shell.smartNavigation.backendWorkflow") : t("shell.smartNavigation.suggestedWorkflow")}</span>
                    <span><strong>{txt("Route", "المسار")}:</strong> <span className="font-mono">{pathname}</span></span>
                </div>
            )}
            toolbarExtras={actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        >
            {children}
        </WathiqCareShell>
    );
}
