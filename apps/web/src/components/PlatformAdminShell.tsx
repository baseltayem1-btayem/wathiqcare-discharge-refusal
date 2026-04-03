"use client";

import Link from "next/link";
import Image from "next/image";
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

export default function PlatformAdminShell({ title, subtitle, actions, children }: PlatformAdminShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { t } = useI18n();

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
            <div style={{ height: "3px", background: "linear-gradient(90deg, #7c3aed, #6d28d9, #7c3aed)" }} />
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
                        style={{ background: "#f5f3ff", border: "1px solid #ede9fe" }}
                    >
                        <div className="flex justify-center">
                            <Image
                                src="/images/wathiqcare-logo.png"
                                alt="WathiqCare"
                                width={180}
                                height={54}
                                className="h-auto w-[120px] object-contain"
                                priority
                            />
                        </div>
                        <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#7c3aed" }}>
                            Platform Admin
                        </p>
                        <p className="mt-0.5 text-center text-[11px] text-gray-500">System Operations</p>
                    </div>

                    {/* Nav */}
                    <nav className="mt-4 flex-1 space-y-0.5">
                        {PLATFORM_NAV_ITEMS.map((item) => (
                            <NavLink
                                key={item.href}
                                href={item.href}
                                label={item.label}
                                icon={item.icon}
                                active={isActive(pathname, item.href)}
                            />
                        ))}
                    </nav>

                    {/* Status badge */}
                    <div
                        className="mt-4 rounded-xl p-3 text-xs"
                        style={{ background: "#f5f3ff", border: "1px solid #e9d5ff", color: "#6b21a8" }}
                    >
                        <div className="inline-flex items-center gap-1.5 font-semibold">
                            <Settings className="h-3.5 w-3.5" />
                            System Mode
                        </div>
                        <p className="mt-0.5" style={{ color: "#7c3aed" }}>SaaS management only</p>
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
                                    <PlatformNotificationBell />
                                    <div
                                        className="hidden items-center gap-2 rounded-xl border border-purple-100 bg-purple-50/80 px-2.5 py-2 sm:inline-flex"
                                        title="WathiqCare"
                                    >
                                        <Image
                                            src="/images/wathiqcare-logo.png"
                                            alt="WathiqCare"
                                            width={104}
                                            height={32}
                                            className="h-auto w-[84px] object-contain"
                                        />
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
                                {PLATFORM_NAV_ITEMS.map((item) => (
                                    <NavLink
                                        key={`mobile-${item.href}`}
                                        href={item.href}
                                        label={item.label}
                                        icon={item.icon}
                                        active={isActive(pathname, item.href)}
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
