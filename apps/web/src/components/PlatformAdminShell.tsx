"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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
            className="inline-flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
            style={
                active
                    ? { background: "#edf4fb", color: "#1f5fa7", fontWeight: 600, borderColor: "#cdddf0" }
                    : { color: "#374151", borderColor: "transparent" }
            }
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = ""; }}
        >
            {icon}
            {label}
        </Link>
    );
}

export default function PlatformAdminShell({ title, subtitle, actions, children }: PlatformAdminShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { t, lang } = useI18n();
    const txt = (en: string, ar: string) => (lang === "ar" ? ar : en);

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
            <div className="h-1 bg-[var(--primary)]" />
            <div className="mx-auto flex max-w-7xl gap-4 px-4 py-4 md:py-6">
                <aside
                    className="hidden w-72 shrink-0 md:flex md:flex-col"
                    style={{
                        background: "#ffffff",
                        border: "1px solid #d6dde5",
                        borderRadius: "18px",
                        boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                        padding: "20px 16px",
                    }}
                >
                    <div
                        className="rounded-lg p-4"
                        style={{ background: "#f8fafc", border: "1px solid #e7edf3" }}
                    >
                        <div className="flex justify-center">
                            <img
                                src="/images/wathiqcare-logo.png"
                                alt="WathiqCare"
                                width={180}
                                height={54}
                                className="h-auto w-[120px] object-contain"
                                loading="eager"
                                decoding="async"
                            />
                        </div>
                        <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: "#1f5fa7" }}>
                            {txt("Platform Admin", "إدارة المنصة")}
                        </p>
                        <p className="mt-1 text-center text-[11px] text-slate-500">{txt("System Operations", "عمليات النظام")}</p>
                    </div>

                    <nav className="mt-5 flex-1 space-y-1">
                        {PLATFORM_NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.href}
                                href={item.href}
                                label={platformNavLabel(item.label, lang === "ar")}
                                icon={item.icon}
                                active={isActive(pathname, item.href)}
                            />
                        ))}
                    </nav>

                    <div
                        className="mt-5 rounded-lg p-3 text-xs"
                        style={{ background: "#edf4fb", border: "1px solid #cdddf0", color: "#1f5fa7" }}
                    >
                        <div className="inline-flex items-center gap-1.5 font-semibold">
                            <Settings className="h-3.5 w-3.5" />
                            {txt("System Mode", "وضع النظام")}
                        </div>
                        <p className="mt-1 text-slate-600">{txt("SaaS management only", "إدارة المنصة فقط")}</p>
                    </div>

                    <LanguageSwitcher className="mt-3" />

                    <button
                        type="button"
                        onClick={() => { void handleLogout(); }}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                        <LogOut className="h-4 w-4" />
                        {t("common.logout")}
                    </button>
                </aside>

                <div className="min-w-0 flex-1">
                    <header
                        className="sticky top-0 z-10 rounded-lg px-4 py-4 md:px-5"
                        style={{
                            background: "rgba(255,255,255,0.90)",
                            backdropFilter: "blur(10px)",
                            border: "1px solid #d6dde5",
                            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                        }}
                    >
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
                                    {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
                                </div>
                                <div className="inline-flex items-center gap-2">
                                    <PlatformNotificationBell />
                                    <div
                                        className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 sm:inline-flex"
                                        title="WathiqCare"
                                    >
                                        <img
                                            src="/images/wathiqcare-logo.png"
                                            alt="WathiqCare"
                                            width={104}
                                            height={32}
                                            className="h-auto w-[84px] object-contain"
                                            loading="eager"
                                            decoding="async"
                                        />
                                    </div>
                                    <LanguageSwitcher className="md:hidden" />
                                    <button
                                        type="button"
                                        onClick={() => { void handleLogout(); }}
                                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:hidden"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        {t("common.logout")}
                                    </button>
                                </div>
                            </div>

                            <div
                                className="flex flex-wrap items-center gap-1.5 rounded-lg p-2 md:hidden"
                                style={{ background: "#f8fafc", border: "1px solid #d6dde5" }}
                            >
                                {PLATFORM_NAV_ITEMS.map((item) => (
                                    <NavLink
                                        key={`mobile-${item.href}`}
                                        href={item.href}
                                        label={platformNavLabel(item.label, lang === "ar")}
                                        icon={item.icon}
                                        active={isActive(pathname, item.href)}
                                    />
                                ))}
                            </div>

                            {actions ? (
                                <div
                                    className="flex flex-wrap items-center gap-2 rounded-lg p-2"
                                    style={{ background: "#f8fafc", border: "1px solid #d6dde5" }}
                                >
                                    {actions}
                                </div>
                            ) : null}
                        </div>
                    </header>

                    <main
                        className="mt-4 rounded-lg border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]"
                    >
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
