import Image from "next/image";
import { Scale, ShieldCheck, Stethoscope } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function LoginBrandPanel() {
  const { t } = useI18n();

  return (
    <section className="flex h-full flex-col">
      {/* Logo */}
      <div className="mb-6 flex justify-center">
        <Image
          src="https://cdn.phototourl.com/uploads/2026-03-08-8e081936-6059-4849-a3de-b482e86049fd.png"
          alt="WathiqCare"
          width={260}
          height={80}
          className="h-auto w-[180px] object-contain sm:w-[220px]"
          priority
        />
      </div>

      {/* Headline card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "#ffffff", border: "1px solid #e0f2fe", boxShadow: "0 2px 12px rgba(8,145,178,0.08)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "#0891b2" }}
        >
          {t("app.name")}
        </p>
        <h1 className="mt-2 text-xl font-bold text-gray-900 md:text-2xl">{t("login.brandTitle")}</h1>
        <p className="mt-1.5 text-sm font-medium text-gray-700">{t("login.brandSubtitle")}</p>
        <p className="mt-2 text-sm leading-7 text-gray-500">{t("login.brandDescription")}</p>
      </div>

      {/* Feature badges */}
      <div className="mt-4 grid gap-2">
        <div
          className="inline-flex items-start gap-2.5 rounded-xl px-3 py-2"
          style={{ background: "#ecfeff", border: "1px solid #a5f3fc" }}
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#0891b2" }} />
          <div>
            <p className="text-sm font-semibold text-gray-900">{t("app.activeWorkspace")}</p>
            <p className="text-xs" style={{ color: "#0891b2" }}>{t("app.secureMode")}</p>
          </div>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700"
          style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}
        >
          <Stethoscope className="h-4 w-4" style={{ color: "#0891b2" }} />
          {t("app.moduleName")}
        </div>
        <div
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700"
          style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}
        >
          <Scale className="h-4 w-4" style={{ color: "#0891b2" }} />
          {t("app.moduleTagline")}
        </div>
      </div>

      <p className="mt-5 text-xs text-gray-400">{t("login.footer")}</p>
    </section>
  );
}
