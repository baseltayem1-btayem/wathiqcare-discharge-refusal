"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Phone } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

type FormState = {
  facilityName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  employeeCount: string;
  website: string;
};

const initialForm: FormState = {
  facilityName: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  contactAddress: "",
  employeeCount: "",
  website: "",
};

export default function RequestDemoPage() {
  const { t, lang, isRtl } = useI18n();
  const ArrowBack = isRtl ? ArrowRight : ArrowLeft;

  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Request failed");
      setSuccessMessage(t("requestDemoPage.successMessage"));
      setForm(initialForm);
    } catch {
      setErrorMessage(t("requestDemoPage.errorMessage"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function field(id: keyof FormState, labelKey: string, type = "text", required = true) {
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {t(`requestDemoPage.${labelKey}`)}
          {required && <span className="ms-1 text-red-500">*</span>}
        </label>
        <input
          id={id}
          type={type}
          required={required}
          value={form[id]}
          onChange={(e) => setForm((prev) => ({ ...prev, [id]: e.target.value }))}
          disabled={isSubmitting}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
        />
      </div>
    );
  }

  const featureKeys = ["pdpl", "cbahi", "uptime", "support"] as const;
  const featureIcons = [CheckCircle2, CheckCircle2, CheckCircle2, CheckCircle2];

  return (
    <main className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-slate-100" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top bar */}
      <div className="h-[3px] bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-400" />

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        {/* Nav row */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
          >
            <ArrowBack className="h-4 w-4" />
            {t("requestDemoPage.backHome")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href={`/${lang}/login`}
              className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-700 shadow-sm transition hover:bg-cyan-50"
            >
              {t("requestDemoPage.enterSystem")}
            </Link>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* Left panel */}
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="mb-3 text-3xl font-extrabold text-cyan-950">
                {t("requestDemoPage.title")}
              </h1>
              <p className="text-slate-600 leading-relaxed">{t("requestDemoPage.subtitle")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {featureKeys.map((k, i) => {
                const Icon = featureIcons[i];
                return (
                  <div key={k} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-100">
                      <Icon className="h-5 w-5 text-cyan-700" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700">
                      {t(`requestDemoPage.features.${k}`)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="h-5 w-5 text-cyan-700" />
                <span className="text-sm font-semibold text-cyan-800">demo@wathiqcare.online</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-cyan-700" />
                <span className="text-sm font-semibold text-cyan-800">+966 XX XXX XXXX</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
            <h2 className="mb-6 text-xl font-bold text-cyan-950">
              {t("requestDemoPage.formTitle")}
            </h2>

            {successMessage ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                <h3 className="text-xl font-bold text-emerald-700">{t("requestDemoPage.successTitle")}</h3>
                <p className="text-slate-600">{successMessage}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {field("facilityName", "facilityName")}
                {field("contactName", "contactName")}
                {field("contactEmail", "contactEmail", "email")}
                {field("contactPhone", "contactPhone", "tel")}
                <div className="sm:col-span-2">
                  {field("contactAddress", "contactAddress")}
                </div>
                {field("employeeCount", "employeeCount", "number")}
                {field("website", "website", "url", false)}

                {errorMessage && (
                  <div className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 py-3 font-bold text-white shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? t("requestDemoPage.submitting") : t("requestDemoPage.submit")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
