"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Building2,
  FileText,
  Globe,
  Headphones,
  Loader2,
  Lock,
  Shield,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type MeResponse = {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  tenant?: { name?: string; code?: string };
};

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#073763] text-white">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-[#073763]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { lang, setLang, t } = useI18n();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const data = await apiFetch<MeResponse>("/api/auth/me", {
          authFailureMode: "silent",
        });
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setError(t("settings.userLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMe();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const isRtl = lang === "ar";
  const dir = isRtl ? "rtl" : "ltr";

  return (
    <main className="min-h-screen bg-slate-50 p-6" dir={dir}>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#073763]">
            {t("settings.title")}
          </h1>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-[#073763]" />
          ) : null}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card icon={Building2} title={t("settings.organization.title")}>
            <Row label={t("settings.organization.name")} value={me?.tenant?.name || "—"} />
            <Row label={t("settings.organization.code")} value={me?.tenant?.code || "—"} />
            <Placeholder>{t("settings.organization.placeholder")}</Placeholder>
          </Card>

          <Card icon={Globe} title={t("settings.language.title")}>
            <p className="mb-3 text-sm text-slate-600">{t("settings.language.description")}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${
                  lang === "en"
                    ? "bg-[#073763] text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang("ar")}
                className={`rounded-lg px-4 py-2 text-sm font-bold ${
                  lang === "ar"
                    ? "bg-[#073763] text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                العربية
              </button>
            </div>
          </Card>

          <Card icon={Users} title={t("settings.access.title")}>
            <Row label={t("settings.access.user")} value={me?.name || "—"} />
            <Row label={t("settings.access.email")} value={me?.email || "—"} />
            <Row label={t("settings.access.role")} value={me?.role || "—"} />
            <Placeholder>{t("settings.access.placeholder")}</Placeholder>
          </Card>

          <Card icon={Bell} title={t("settings.notifications.title")}>
            <Placeholder>{t("settings.notifications.placeholder")}</Placeholder>
          </Card>

          <Card icon={FileText} title={t("settings.templates.title")}>
            <p className="mb-3 text-sm text-slate-600">{t("settings.templates.description")}</p>
            <Link
              href="/modules/promissory-notes/enterprise"
              className="inline-flex items-center gap-2 rounded-lg bg-[#073763] px-4 py-2 text-sm font-bold text-white"
            >
              {t("settings.templates.openLibrary")}
            </Link>
          </Card>

          <Card icon={Headphones} title={t("settings.support.title")}>
            <Placeholder>{t("settings.support.placeholder")}</Placeholder>
            <div className="mt-3 grid gap-2 text-sm">
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-left text-slate-500 disabled:opacity-60"
              >
                {t("settings.support.legalRequest")}
              </button>
              <button
                type="button"
                disabled
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-left text-slate-500 disabled:opacity-60"
              >
                {t("settings.support.technicalRequest")}
              </button>
            </div>
          </Card>

          <Card icon={Shield} title={t("settings.security.title")}>
            <Row label={t("settings.security.lastLogin")} value={t("settings.security.unknown")} />
            <Row label={t("settings.security.mfa")} value={t("settings.security.notConfigured")} />
            <Placeholder>{t("settings.security.placeholder")}</Placeholder>
          </Card>

          <Card icon={Lock} title={t("settings.audit.title")}>
            <Placeholder>{t("settings.audit.placeholder")}</Placeholder>
          </Card>
        </div>
      </div>
    </main>
  );
}
