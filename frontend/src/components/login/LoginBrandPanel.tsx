import { Scale, ShieldCheck, Stethoscope } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function LoginBrandPanel() {
  const { t } = useI18n();

  return (
    <section className="rounded-3xl border border-slate-200 bg-slate-50/90 p-6 md:p-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{t("app.name")}</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">{t("login.brandTitle")}</h1>
        <p className="mt-2 text-sm font-medium text-slate-700">{t("login.brandSubtitle")}</p>
        <p className="mt-3 text-sm leading-7 text-slate-600">{t("login.brandDescription")}</p>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="inline-flex items-start gap-2.5 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-800" />
          <div>
            <p className="text-sm font-semibold text-cyan-900">{t("app.activeWorkspace")}</p>
            <p className="text-xs text-cyan-700">{t("app.secureMode")}</p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <Stethoscope className="h-4 w-4 text-slate-500" />
          {t("app.moduleName")}
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <Scale className="h-4 w-4 text-slate-500" />
          {t("app.moduleTagline")}
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-500">{t("login.footer")}</p>
    </section>
  );
}
