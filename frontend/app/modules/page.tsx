"use client";

import Link from "next/link";
import { FolderKanban, ShieldCheck, Archive, Stethoscope, Lock } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { useI18n } from "@/i18n/I18nProvider";
import { isGovernanceModuleEnabledClient } from "@/lib/server/governance/feature-flag";
import { getTokenClaims } from "@/utils/api";

type ModuleCard = {
  key: string;
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  icon: React.ReactNode;
};

export default function ModulesPage() {
  const { t } = useI18n();
  const governanceEnabled = isGovernanceModuleEnabledClient();
  const role = (getTokenClaims()?.role ?? "").toUpperCase();

  const roleCanUseGovernance = ["OWNER", "ADMIN", "MANAGER"].includes(role);
  const roleCanUseDischarge = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"].includes(role);
  const roleCanUseDocuments = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER", "BILLING"].includes(role);

  const modules: ModuleCard[] = [
    {
      key: "discharge",
      title: t("modules.discharge.title"),
      description: t("modules.discharge.description"),
      href: "/cases",
      enabled: true,
      icon: <Stethoscope className="h-5 w-5" />,
    },
    {
      key: "governance",
      title: t("modules.governance.title"),
      description: t("modules.governance.description"),
      href: "/patients",
      enabled: governanceEnabled && roleCanUseGovernance,
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      key: "documents",
      title: t("modules.documents.title"),
      description: t("modules.documents.description"),
      href: "/bundles",
      enabled: roleCanUseDocuments,
      icon: <Archive className="h-5 w-5" />,
    },
  ];

  modules[0].enabled = roleCanUseDischarge;

  const hasEnabledModules = modules.some((item) => item.enabled);

  return (
    <AuthGuard>
      <AppShell title={t("modules.title")} subtitle={t("modules.subtitle")}>
        {!hasEnabledModules ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t("modules.noAccess")}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((item) => (
            <article key={item.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="inline-flex items-center gap-2 text-slate-900">
                {item.icon}
                <h3 className="text-base font-semibold">{item.title}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>

              {item.enabled ? (
                <Link
                  href={item.href}
                  className="mt-4 inline-flex rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  {t("modules.open")}
                </Link>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
                  <Lock className="h-4 w-4" />
                  {t("modules.disabled")}
                </div>
              )}
            </article>
          ))}
        </div>
      </AppShell>
    </AuthGuard>
  );
}
