"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Building2, LogOut, Shield, User } from "lucide-react";
import AuthGuard from "@/components/AuthGuard";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import WathiqCareShell from "@/components/WathiqCareShell";
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
      <WathiqCareShell
        title={isRtl ? roleTitleAr : roleTitle}
        subtitle={tenantName}
        pathname={me?.user?.email ?? ""}
        isRtl={isRtl}
        menuItems={quickActions.map((action, index) => ({
          href: action.href,
          label: isRtl ? action.labelAr : action.label,
          icon: action.icon,
          active: index === 0,
        }))}
        moduleMeta={(
          <>
            <span className="wc-module-pill" data-role-color={roleColor}>{isRtl ? roleLabel.ar : roleLabel.en}</span>
            <span className="wc-module-pill">{tenantName}</span>
          </>
        )}
        nextAction={quickActions[0] ? {
          href: quickActions[0].href,
          label: isRtl ? quickActions[0].labelAr : quickActions[0].label,
          icon: quickActions[0].icon,
          variant: "primary",
        } : null}
        quickActions={quickActions.slice(1).map((action) => ({
          href: action.href,
          label: isRtl ? action.labelAr : action.label,
          icon: action.icon,
          variant: "secondary",
        }))}
        utilityControls={(
          <>
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => { void handleLogout(); }}
              className="toolbar-btn toolbar-btn-secondary"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
            </button>
          </>
        )}
        headerExtras={(
          <div className="grid gap-2 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div className="wc-panel space-y-2">
              <div className="wc-panel-heading">{isRtl ? "هوية المستخدم" : "User Identity"}</div>
              <div className="text-[11px] text-slate-700">
                <div className="flex items-center gap-2"><User className="h-3.5 w-3.5" /><strong>{userName}</strong></div>
                <div className="mt-1 flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /><span>{tenantName}</span></div>
              </div>
            </div>
            <div className="wc-panel space-y-2">
              <div className="wc-panel-heading">{isRtl ? "جاهزية الجلسة" : "Session Readiness"}</div>
              <div className="grid gap-2 md:grid-cols-3 text-[11px] text-slate-700">
                <div className="wc-data-chip"><Shield className="h-3.5 w-3.5 text-emerald-600" /><span>{isRtl ? "جلسة آمنة نشطة" : "Secure session active"}</span></div>
                <div className="wc-data-chip"><User className="h-3.5 w-3.5 text-[var(--primary)]" /><span>{me?.user?.email ?? "—"}</span></div>
                <div className="wc-data-chip"><Activity className="h-3.5 w-3.5 text-[var(--primary)]" /><span>{me?.tenant?.code ?? "—"}</span></div>
              </div>
            </div>
          </div>
        )}
      >
        {loading ? (
          <div className="wc-panel text-center text-slate-500">{isRtl ? "جاري التحميل..." : "Loading..."}</div>
        ) : (
          <div className="space-y-3">
            <div className="wc-panel">
              <div className="wc-panel-heading">{isRtl ? "الإجراءات السريرية" : "Clinical Actions"}</div>
              <div className="wc-link-grid">
                {quickActions.map((action) => (
                  <Link key={action.href} href={action.href} className="wc-link-card">
                    <span className="wc-link-card__icon">{action.icon}</span>
                    <span>{isRtl ? action.labelAr : action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </WathiqCareShell>
    </AuthGuard>
  );
}
