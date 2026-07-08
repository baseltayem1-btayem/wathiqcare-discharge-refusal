"use client";

import Image from "next/image";
import {
  Building2,
  ChevronRight,
  FileText,
  Shield,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import { Alert, Card, cls, PatientIdentityCard, type Lang } from "../shared";

export function ReviewRequestStep({
  lang,
  facilityName,
  procedureTitle,
  physicianName,
  patientName,
  patientMrn,
  consentRef,
  versionLabel,
  onProceed,
}: {
  lang: Lang;
  facilityName: string;
  procedureTitle: string;
  physicianName: string;
  patientName: string;
  patientMrn: string;
  consentRef: string;
  versionLabel: string;
  onProceed: () => void;
}) {
  const isAr = lang === "ar";
  const securityCards = isAr
    ? [
        { icon: ShieldCheck, title: "رابط آمن ومشفر", note: "جلسة موثقة ومحمية" },
        { icon: Shield, title: "متوافق مع المعايير", note: "تدقيق وسجل قانوني" },
        { icon: Sparkles, title: "إتمام سريع وسهل", note: "رحلة مبسطة للمريض" },
      ]
    : [
        { icon: ShieldCheck, title: "Encrypted secure link", note: "Protected verified session" },
        { icon: Shield, title: "Standards aligned", note: "Auditable legal flow" },
        { icon: Sparkles, title: "Fast and easy", note: "Patient-first guided journey" },
      ];

  return (
    <div className="flex flex-col gap-6">
      <div className={cls("flex flex-col gap-3", isAr ? "items-end text-right" : "items-start text-left")}>
        <div className={cls("flex items-center gap-3 rounded-[24px] border border-[#d8e4f2] bg-white px-4 py-3 shadow-[0_18px_36px_rgba(11,39,79,0.08)]", isAr ? "flex-row-reverse" : "flex-row")}>
          <Image
            src="/images/wathiqcare-logo.png"
            alt="WathiqCare"
            width={132}
            height={36}
            priority
            className="h-8 w-auto object-contain"
          />
          <div className={isAr ? "text-right" : "text-left"}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#355f93]">
              {isAr ? "واثق كير" : "WathiqCare"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              {isAr ? "توثيق الرعاية، حماية المريض" : "Documenting care, protecting patients"}
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold leading-tight text-[#102c56] sm:text-[30px]">
            {isAr ? "مرحباً بك في رحلة الموافقة الرقمية" : "Welcome to the digital consent journey"}
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-[15px]">
          {isAr
            ? "يمكنك من هذه الرحلة مراجعة نموذج الموافقة الطبية المعتمد بشكل آمن، ثم التحقق من هويتك واستكمال توقيعك الإلكتروني بثقة."
            : "Use this secure journey to review the approved medical consent, verify your identity, and complete your electronic signature with confidence."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {securityCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="rounded-[22px] border border-[#dbe8f4] bg-white/95 p-4 shadow-[0_10px_30px_rgba(15,40,74,0.06)]">
              <div className={cls("flex items-start gap-3", isAr ? "flex-row-reverse text-right" : "text-left")}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#edf4fd] text-[#1b4f8a]">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#133863]">{card.title}</p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">{card.note}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-[24px] border border-[#dbe7f4] bg-[linear-gradient(135deg,rgba(13,44,87,0.98),rgba(18,58,111,0.96))] p-5 text-white shadow-[0_24px_50px_rgba(10,31,63,0.18)]">
        <div className="flex flex-col gap-4">
          <div className={cls("flex items-start justify-between gap-4", isAr ? "flex-row-reverse" : "flex-row")}>
            <div className={cls("space-y-2", isAr ? "text-right" : "text-left")}>
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#f3d792]">
                {isAr ? "طلب موافقة آمن" : "Secure consent request"}
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                  {isAr ? "نوع الموافقة" : "Consent type"}
                </p>
                <p className="mt-2 text-xl font-semibold leading-snug text-white">{procedureTitle}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/80">
              {versionLabel || (isAr ? "إصدار معتمد" : "Approved version")}
            </div>
          </div>

          {patientName ? (
            <div className="rounded-[20px] border border-white/10 bg-white/8 p-1.5">
              <PatientIdentityCard lang={lang} name={patientName} mrn={patientMrn} />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            {physicianName ? (
              <div className={cls("rounded-2xl border border-white/10 bg-white/8 p-3", isAr ? "text-right" : "text-left")}>
                <div className={cls("mb-1 flex items-center gap-2 text-white/70", isAr ? "flex-row-reverse" : "flex-row")}>
                  <Stethoscope size={14} />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{isAr ? "الفريق الطبي" : "Clinical team"}</span>
                </div>
                <p className="text-sm font-medium text-white">{physicianName}</p>
              </div>
            ) : null}
            <div className={cls("rounded-2xl border border-white/10 bg-white/8 p-3", isAr ? "text-right" : "text-left")}>
              <div className={cls("mb-1 flex items-center gap-2 text-white/70", isAr ? "flex-row-reverse" : "flex-row")}>
                <Building2 size={14} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{isAr ? "المنشأة" : "Facility"}</span>
              </div>
              <p className="text-sm font-medium text-white">{facilityName}</p>
            </div>
          </div>

          {consentRef ? (
            <div className={cls("text-[11px] text-white/72", isAr ? "text-right" : "text-left")}>
              {isAr ? "المرجع: " : "Reference: "}
              <span className="font-mono text-white/88">{consentRef}</span>
            </div>
          ) : null}
        </div>
      </Card>

      <Alert type="info" lang={lang}>
        {isAr
          ? "هذه الرحلة صادرة من الفريق الطبي عبر رابط موثّق. لن يُطلب منك أي دفع، وتُسجَّل جميع خطواتك ضمن سجل تدقيق آمن."
          : "This journey was issued by your medical team through a verified link. No payment is requested, and your actions are recorded in a secure audit trail."}
      </Alert>

      <button
        type="button"
        onClick={onProceed}
        className="w-full rounded-[18px] bg-[linear-gradient(180deg,#e3bf72_0%,#c99d3e_100%)] px-5 py-4 text-sm font-semibold text-[#11325d] shadow-[0_16px_30px_rgba(201,157,62,0.28)] transition-transform hover:translate-y-[-1px] active:translate-y-0"
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isAr ? "ابدأ الآن" : "Start now"}
          <ChevronRight size={16} className={isAr ? "rotate-180" : ""} />
        </span>
      </button>

      <div className={cls("flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500", isAr ? "flex-row-reverse" : "flex-row")}>
        <span>{isAr ? "آمن" : "Secure"}</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>{isAr ? "متوافق" : "Compliant"}</span>
        <span className="h-1 w-1 rounded-full bg-slate-300" />
        <span>{isAr ? "موثوق" : "Trusted"}</span>
      </div>
    </div>
  );
}
