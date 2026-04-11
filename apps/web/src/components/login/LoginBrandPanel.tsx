import { ActivitySquare, Scale, ShieldCheck, Stethoscope } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function LoginBrandPanel() {
  const { t } = useI18n();

  return (
    <section className="flex h-full flex-col">
      <div className="mb-5 flex justify-center">
        <img
          src="/images/wathiqcare-logo.png"
          alt="WathiqCare"
          width={260}
          height={80}
          className="h-auto w-[180px] object-contain sm:w-[210px]"
          loading="eager"
          decoding="async"
        />
      </div>

      <div
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-sm)]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]">
          {t("app.name")}
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">{t("login.brandTitle")}</h1>
        <p className="mt-1.5 text-sm font-semibold text-slate-700">{t("login.brandSubtitle")}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{t("login.brandDescription")}</p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 text-xs font-semibold text-[var(--primary-pressed)]">
          <ActivitySquare className="h-4 w-4 text-[var(--primary)]" />
          {t("login.badge")}
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        <div
          className="inline-flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{t("app.activeWorkspace")}</p>
            <p className="text-xs text-slate-600">{t("app.secureMode")}</p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700"
        >
          <Stethoscope className="h-4 w-4 text-[var(--primary)]" />
          {t("app.moduleName")}
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700"
        >
          <Scale className="h-4 w-4 text-[var(--primary)]" />
          {t("app.moduleTagline")}
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-400">{t("login.footer")}</p>
    </section>
  );
}

