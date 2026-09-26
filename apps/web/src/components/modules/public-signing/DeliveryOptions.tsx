"use client";

import { useState } from "react";
import { Mail, Smartphone, Send } from "lucide-react";
import { cn, dirFor, rowDir, textAlign } from "@/components/ui-refresh/_utils";
import type { PublicSigningLang } from "./public-signing-helpers";

type DeliveryMethod = "email" | "sms";

type DeliveryOptionsProps = {
  lang: PublicSigningLang;
  token: string;
  endpoint: string;
  defaultEmail?: string;
  defaultMobile?: string;
  className?: string;
};

export default function DeliveryOptions({
  lang,
  endpoint,
  defaultEmail = "",
  defaultMobile = "",
  className,
}: DeliveryOptionsProps) {
  const uiLang = lang === "ar" ? "ar" : "en";
  const isRtl = lang === "ar" || lang === "bilingual";
  const [method, setMethod] = useState<DeliveryMethod>("email");
  const [email, setEmail] = useState(defaultEmail);
  const [mobile, setMobile] = useState(defaultMobile);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSubmit() {
    const value = method === "email" ? email.trim() : mobile.trim();
    if (!value) {
      setResult({
        type: "error",
        message: uiLang === "ar" ? "يُرجى إدخال عنوان أو رقم صحيح." : "Please enter a valid address or number.",
      });
      return;
    }

    setBusy(true);
    setResult(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ method, value }),
      });
      const payload = await response.json().catch(() => ({ error: "Unknown error" }));
      if (!response.ok) {
        throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
      }
      setResult({
        type: "success",
        message: uiLang === "ar" ? "تم إرسال النسخة بنجاح." : "Patient copy sent successfully.",
      });
    } catch (error) {
      setResult({
        type: "error",
        message:
          uiLang === "ar"
            ? `تعذر إرسال النسخة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`
            : `Could not send patient copy: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
      dir={dirFor(uiLang)}
    >
      <h2 className={cn("text-base font-semibold text-slate-900", textAlign(uiLang))}>
        {uiLang === "ar" ? "استلام نسخة المريض" : "Receive patient copy"}
      </h2>
      <p className={cn("mt-1 text-sm text-slate-600", textAlign(uiLang))}>
        {uiLang === "ar"
          ? "اختر طريقة لاستلام نسخة المريض الموّقعة (اختياري)."
          : "Choose how to receive the signed patient copy (optional)."}
      </p>

      <div className={cn("mt-4 flex flex-wrap gap-2", rowDir(uiLang))}>
        <button
          type="button"
          onClick={() => setMethod("email")}
          aria-pressed={method === "email"}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
            method === "email"
              ? "bg-sky-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <Mail size={16} aria-hidden />
          {uiLang === "ar" ? "البريد الإلكتروني" : "Email"}
        </button>
        <button
          type="button"
          onClick={() => setMethod("sms")}
          aria-pressed={method === "sms"}
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium",
            method === "sms"
              ? "bg-sky-700 text-white"
              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          <Smartphone size={16} aria-hidden />
          {uiLang === "ar" ? "رسالة نصية" : "SMS"}
        </button>
      </div>

      <div className="mt-4">
        {method === "email" ? (
          <label className="block" htmlFor="deliveryEmail">
            <span className={cn("text-sm font-medium text-slate-700", textAlign(uiLang))}>
              {uiLang === "ar" ? "عنوان البريد الإلكتروني" : "Email address"}
            </span>
            <input
              id="deliveryEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={cn(
                "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900",
                "focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200",
                isRtl ? "text-right" : "text-left",
              )}
              placeholder={uiLang === "ar" ? "name@example.com" : "name@example.com"}
            />
          </label>
        ) : (
          <label className="block" htmlFor="deliveryMobile">
            <span className={cn("text-sm font-medium text-slate-700", textAlign(uiLang))}>
              {uiLang === "ar" ? "رقم الجوال" : "Mobile number"}
            </span>
            <input
              id="deliveryMobile"
              type="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              className={cn(
                "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900",
                "focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200",
                isRtl ? "text-right" : "text-left",
              )}
              placeholder={uiLang === "ar" ? "+9665XXXXXXXX" : "+9665XXXXXXXX"}
            />
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={busy}
        className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={16} aria-hidden />
        {busy
          ? uiLang === "ar" ? "جاري الإرسال..." : "Sending..."
          : uiLang === "ar" ? "إرسال النسخة" : "Send patient copy"}
      </button>

      {result ? (
        <div
          className={cn(
            "mt-3 rounded-xl px-3 py-2 text-sm",
            result.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          {result.message}
        </div>
      ) : null}
    </section>
  );
}
