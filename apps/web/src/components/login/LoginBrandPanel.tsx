import { BadgeCheck, Building2, ClipboardList, FileWarning, HandCoins, ShieldCheck } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { getLoginPlatformBranding } from "@/lib/config/login-platform-branding";

export default function LoginBrandPanel() {
  const { isRtl } = useI18n();
  const branding = getLoginPlatformBranding(isRtl);
  const moduleIcons = {
    consents: ClipboardList,
    promissory: HandCoins,
    discharge: FileWarning,
  } as const;

  return (
    <section className="flex h-full flex-col">
      <div className="mb-5 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
          {branding.platformName}
        </p>
        <h1 className="mt-2 text-xl font-bold text-slate-900 md:text-2xl">{branding.platformTitle}</h1>
        <p className="mt-1.5 text-sm font-semibold text-slate-700">{branding.platformHeadline}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{branding.platformDescription}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <Building2 className="h-4 w-4 text-[var(--primary)]" />
            <span>{branding.licensedSubscriberLabel}: {branding.licensedSubscriberValue}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <BadgeCheck className="h-4 w-4 text-[var(--primary)]" />
            <span>{branding.versionLabel}: {branding.versionValue}</span>
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] px-3 py-2 text-xs font-semibold text-[var(--primary-pressed)]">
          <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
          {branding.secureWorkspaceSubtitle}
        </div>
      </div>

      <div className="mt-4 grid gap-2.5">
        <div
          className="inline-flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
          <div>
            <p className="text-sm font-semibold text-slate-900">{branding.secureWorkspaceTitle}</p>
            <p className="text-xs text-slate-600">{branding.secureWorkspaceSubtitle}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-3">
          <p className="text-sm font-semibold text-slate-900">{branding.modulesTitle}</p>
          <p className="mt-1 text-xs text-slate-600">{branding.modulesSubtitle}</p>

          <div className="mt-3 grid gap-2">
            {branding.modules.map((module) => {
              const Icon = moduleIcons[module.id];

              return (
                <div
                  key={module.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Icon className="h-4 w-4 text-[var(--primary)]" />
                    {module.title}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{module.summary}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="mt-5 text-xs text-slate-400">{branding.footer}</p>
    </section>
  );
}

