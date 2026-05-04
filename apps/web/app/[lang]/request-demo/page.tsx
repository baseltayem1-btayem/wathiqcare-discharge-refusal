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
        <label htmlFor={id} className="wc-label">
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
          className="wc-input"
        />
      </div>
    );
  }

  const featureKeys = ["pdpl", "cbahi", "uptime", "support"] as const;
  const featureIcons = [CheckCircle2, CheckCircle2, CheckCircle2, CheckCircle2];

  return (
    <main className="wc-page" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top bar */}
      <div className="h-[3px] bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-400" />

      <div className="wc-container py-8 md:py-12">
        {/* Nav row */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/${lang}`}
            className="wc-button-secondary h-10 gap-2 px-3 text-sm"
          >
            <ArrowBack className="h-4 w-4" />
            {t("requestDemoPage.backHome")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href={`/${lang}/login`}
              className="wc-button-ghost h-10 px-3 text-sm"
            >
              {t("requestDemoPage.enterSystem")}
            </Link>
          </div>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* Left panel */}
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="wc-h2 mb-3 text-brand-navy">
                {t("requestDemoPage.title")}
              </h1>
              <p className="wc-body text-neutral-600">{t("requestDemoPage.subtitle")}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {featureKeys.map((k, i) => {
                const Icon = featureIcons[i];
                return (
                  <div key={k} className="wc-card-soft flex items-center gap-3">
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

            <div className="wc-card-soft border-cyan-100 bg-cyan-50 p-5">
              <div className="flex items-center gap-3 mb-3">
                <Mail className="h-5 w-5 text-cyan-700" />
                <a href="mailto:demo@wathiqcare.online" className="text-sm font-semibold text-cyan-800 hover:underline">
                  demo@wathiqcare.online
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-cyan-700" />
                <a href="tel:+966543587772" className="text-sm font-semibold text-cyan-800 hover:underline" dir="ltr">
                  +966 543587772
                </a>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="wc-card p-6 md:p-8">
            <h2 className="wc-h3 mb-6 text-brand-navy">
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
                  <div className="sm:col-span-2 wc-alert-error">
                    {errorMessage}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="wc-button-primary w-full"
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
