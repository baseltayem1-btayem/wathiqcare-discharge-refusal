"use client";

import React from "react";
import {
  CheckCircle2,
  Circle,
  Clock3,
  FileSignature,
  LockKeyhole,
  RotateCw,
  Send,
  ShieldCheck,
} from "lucide-react";

type Lang = "ar" | "en";

type Props = {
  lang?: Lang;
  progress?: number;
};

const steps = [
  {
    id: 1,
    ar: "التحقق من بيانات السند والمدين",
    en: "Validate note and debtor data",
    status: "completed",
  },
  {
    id: 2,
    ar: "إنشاء السند ورقم التتبع",
    en: "Create note and tracking reference",
    status: "completed",
  },
  {
    id: 3,
    ar: "تجهيز رابط التوقيع ورمز OTP",
    en: "Prepare signing link and OTP",
    status: "active",
  },
  {
    id: 4,
    ar: "إرسال الرابط إلى جوال المدين",
    en: "Dispatch link to debtor mobile",
    status: "pending",
  },
] as const;

function text(lang: Lang, ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

export function WathiqNoteIssueLoader({ lang = "ar", progress = 68 }: Props) {
  const isAr = lang === "ar";
  const safeProgress = Math.max(8, Math.min(progress, 96));

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F4F7FB]/80 px-5 py-8 backdrop-blur-xl"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-10 h-96 w-96 rounded-full bg-[#1976D2]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[#10B981]/10 blur-3xl" />
        <div className="absolute inset-x-20 top-24 h-px bg-gradient-to-r from-transparent via-[#1976D2]/20 to-transparent" />
      </div>

      <div className="relative w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/80 bg-white/80 p-7 shadow-[0_28px_90px_rgba(0,43,92,0.18)] backdrop-blur-2xl">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(25,118,210,0.10),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_34%)]" />

        <div className="relative grid gap-8 lg:grid-cols-[320px_1fr_280px]">
          <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#D8E6F7]/80 bg-white/70 p-6 shadow-inner">
            <div className="relative h-64 w-64">
              <div className="absolute inset-0 rounded-full border border-[#DDEBFA]" />
              <div className="absolute inset-4 rounded-full border border-[#E8F1FB]" />
              <div className="absolute inset-8 rounded-full bg-white shadow-[inset_0_10px_35px_rgba(15,23,42,0.06)]" />

              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 210deg, #1976D2 0deg, #10B981 ${
                    safeProgress * 3.6
                  }deg, #E6EEF8 ${safeProgress * 3.6}deg 360deg)`,
                  mask: "radial-gradient(circle, transparent 58%, black 59%)",
                  WebkitMask:
                    "radial-gradient(circle, transparent 58%, black 59%)",
                }}
              />

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-5xl font-black tracking-tight text-[#002B5C]">
                  {safeProgress}%
                </div>
                <div className="mt-2 text-sm font-bold text-slate-500">
                  {text(lang, "جاري التحضير...", "Preparing...")}
                </div>
              </div>

              <div className="absolute bottom-8 left-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-[#DDEBFA]">
                <RotateCw className="h-4 w-4 animate-spin text-[#1976D2]" />
              </div>
            </div>
          </div>

          <div className="py-4">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EBF7F3] ring-1 ring-emerald-100">
              <FileSignature className="h-6 w-6 text-emerald-600" />
            </div>

            <h2 className="text-3xl font-black tracking-tight text-[#002B5C]">
              {text(
                lang,
                "جاري تجهيز السند ورابط التوقيع",
                "Preparing Note and Signing Link",
              )}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              {text(
                lang,
                "نقوم الآن بإنشاء السند وتجهيز رابط التوقيع الآمن ورمز التحقق للمدين. قد يستغرق ذلك بضع ثوانٍ فقط.",
                "WathiqCare is creating the note, preparing the secure signing link, and generating OTP evidence for the debtor.",
              )}
            </p>

            <div className="mt-7 space-y-3">
              {steps.map((step) => {
                const completed = step.status === "completed";
                const active = step.status === "active";

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${
                      active
                        ? "border-[#1976D2]/30 bg-[#1976D2]/5 shadow-sm"
                        : "border-transparent bg-white/45"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        completed
                          ? "bg-emerald-600 text-white"
                          : active
                            ? "bg-white text-[#1976D2] ring-2 ring-[#1976D2]/30"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : active ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>

                    <div className="flex-1 text-sm font-bold text-slate-700">
                      {step.id}. {isAr ? step.ar : step.en}
                    </div>

                    <div
                      className={`text-xs font-black ${
                        completed
                          ? "text-emerald-600"
                          : active
                            ? "text-[#1976D2]"
                            : "text-slate-400"
                      }`}
                    >
                      {completed
                        ? text(lang, "مكتمل", "Completed")
                        : active
                          ? text(lang, "قيد التنفيذ", "In progress")
                          : text(lang, "بانتظار", "Pending")}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-7 rounded-2xl border border-[#DDEBFA] bg-white/70 px-4 py-3 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-4 w-4 text-[#002B5C]" />
                <span>
                  {text(
                    lang,
                    "بيانات السند والمدين محمية أثناء إنشاء الرابط وإرسال رمز التحقق.",
                    "Note and debtor data are protected while the signing link and OTP are prepared.",
                  )}
                </span>
              </div>
            </div>

            <div className="mt-7">
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1976D2] via-[#4B9CD3] to-[#10B981] shadow-[0_0_18px_rgba(25,118,210,0.35)]"
                  style={{ width: `${safeProgress}%` }}
                />
              </div>
              <p className="mt-3 text-center text-xs font-bold text-slate-500">
                {text(
                  lang,
                  "يرجى عدم إغلاق الصفحة أو تحديثها أثناء تجهيز السند.",
                  "Please do not close or refresh the page while the note is being prepared.",
                )}
              </p>
            </div>
          </div>

          <div className="hidden flex-col gap-4 border-slate-200/70 lg:flex lg:border-r lg:pr-6 ltr:lg:border-l ltr:lg:border-r-0 ltr:lg:pl-6 ltr:lg:pr-0">
            <MiniStatus
              icon={<ShieldCheck className="h-5 w-5" />}
              title={text(lang, "تم التحقق الأمني", "Security verified")}
              description={text(lang, "الجلسة مؤمنة ومراقبة.", "The session is secured and monitored.")}
            />
            <MiniStatus
              icon={<Send className="h-5 w-5" />}
              title={text(lang, "تجهيز الإرسال", "Delivery preparation")}
              description={text(lang, "يتم تجهيز الرابط والـ OTP.", "Signing link and OTP are being prepared.")}
            />
            <MiniStatus
              icon={<Clock3 className="h-5 w-5" />}
              title={text(lang, "الوقت المتوقع", "Estimated time")}
              description={text(lang, "بضع ثوانٍ فقط.", "A few seconds remaining.")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStatus({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EBF7F3] text-emerald-600">
        {icon}
      </div>
      <div className="text-sm font-black text-[#002B5C]">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
  );
}
