"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Building2, User, Stethoscope, Shield, Activity } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch, clearToken } from "@/utils/api";

type MeResponse = {
  authenticated?: boolean;
  user?: {
    fullName?: string;
    email?: string;
    role?: string;
  };
  tenant?: {
    name?: string;
    code?: string;
  };
  platformRole?: string | null;
  userType?: string;
};

type QuickAction = {
  label: string;
  labelAr: string;
  href: string;
  icon: React.ReactNode;
};

type RoleDashboardProps = {
  roleTitle: string;
  roleTitleAr: string;
  roleColor: string;
  quickActions: QuickAction[];
  allowedRoles?: string[];
};

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  platform_superadmin: { en: "Super Admin", ar: "مدير النظام الأعلى" },
  platform_admin: { en: "Platform Admin", ar: "مدير المنصة" },
  tenant_owner: { en: "Hospital Owner", ar: "مالك المستشفى" },
  tenant_admin: { en: "Hospital Admin", ar: "مدير المستشفى" },
  doctor: { en: "Doctor", ar: "طبيب" },
  nursing: { en: "Nurse", ar: "ممرض/ة" },
  legal_admin: { en: "Legal Officer", ar: "مستشار قانوني" },
  medical_director: { en: "Medical Director", ar: "المدير الطبي" },
  finance_officer: { en: "Finance Officer", ar: "مسؤول المالية" },
  reception: { en: "Receptionist", ar: "موظف الاستقبال" },
  patient_affairs: { en: "Patient Affairs", ar: "شؤون المرضى" },
};

export default function RoleDashboard({ roleTitle, roleTitleAr, roleColor, quickActions }: Omit<RoleDashboardProps, "allowedRoles">) {
  const { isRtl } = useI18n();
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<MeResponse>("/api/auth/me", { cache: "no-store", authFailureMode: "inline" })
      .then((data) => setMe(data))
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // best-effort
    }
    clearToken();
    router.replace("/login");
  }

  const userRole = me?.user?.role ?? "";
  const roleLabel = ROLE_LABELS[userRole] ?? { en: userRole, ar: userRole };
  const tenantName = me?.tenant?.name ?? "WathiqCare";
  const userName = me?.user?.fullName ?? me?.user?.email ?? "—";

  return (
    <AuthGuard>
      <div className="min-h-screen" style={{ background: "#f5f7fa" }} dir={isRtl ? "rtl" : "ltr"}>
        {/* Top accent stripe */}
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${roleColor}, #0891b2, ${roleColor})` }} />

        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <Image
                src="/images/wathiqcare-logo.png"
                alt="WathiqCare"
                width={140}
                height={42}
                className="h-auto w-[90px] object-contain"
              />
              <span className="hidden text-xs font-semibold text-slate-400 sm:block">|</span>
              <span className="hidden text-sm font-semibold text-slate-700 sm:block">{isRtl ? roleTitleAr : roleTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                type="button"
                onClick={() => { void handleLogout(); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-red-50 hover:border-red-200 hover:text-red-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isRtl ? "تسجيل الخروج" : "Logout"}
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
              {isRtl ? "جاري التحميل..." : "Loading..."}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
              {/* Sidebar Info Card */}
              <aside className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${roleColor}20`, color: roleColor }}>
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{userName}</p>
                      <p className="text-xs text-slate-500">{isRtl ? roleLabel.ar : roleLabel.en}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="font-medium">{isRtl ? "المؤسسة" : "Organization"}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{tenantName}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
                    <Activity className="h-3.5 w-3.5" />
                    {isRtl ? "الإجراءات السريعة" : "Quick Actions"}
                  </div>
                  <div className="space-y-1">
                    {quickActions.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        <span className="text-slate-400">{action.icon}</span>
                        {isRtl ? action.labelAr : action.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${roleColor}15`, color: roleColor }}>
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-slate-900">{isRtl ? roleTitleAr : roleTitle}</h1>
                      <p className="text-sm text-slate-500">{tenantName}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {quickActions.map((action) => (
                      <Link
                        key={action.href}
                        href={action.href}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-medium text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
                      >
                        <span style={{ color: roleColor }}>{action.icon}</span>
                        {isRtl ? action.labelAr : action.label}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Session Info */}
                <div className="rounded-2xl border border-slate-100 bg-white/60 p-4">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      {isRtl ? "جلسة آمنة نشطة" : "Secure session active"}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {me?.user?.email ?? "—"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {me?.tenant?.code ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
