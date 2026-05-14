"use client";

export const dynamic = "force-dynamic";

import type React from "react";
import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, Clock, CheckCircle2 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

function InfoCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-100">
        <Icon className="h-5 w-5 text-cyan-700" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        {href ? (
          <a href={href} className="mt-0.5 text-sm font-semibold text-cyan-700 hover:underline">
            {value}
          </a>
        ) : (
          <p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>
        )}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
      />
    </div>
  );
}

export default function ContactPage() {
  const { t, lang, isRtl } = useI18n();
  const ArrowBack = isRtl ? ArrowRight : ArrowLeft;

  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("failed");
      setSuccess(t("contactPage.successMessage"));
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError(t("contactPage.errorMessage"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-slate-100"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="h-[3px] bg-gradient-to-r from-teal-600 via-cyan-600 to-cyan-400" />

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
          >
            <ArrowBack className="h-4 w-4" />
            {t("contactPage.backHome")}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mb-10 text-center">
          <h1 className="mb-3 text-3xl font-extrabold text-cyan-950">{t("contactPage.title")}</h1>
          <p className="mx-auto max-w-lg text-slate-600">{t("contactPage.subtitle")}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          {/* Info cards */}
          <div className="flex flex-col gap-4">
            <InfoCard
              icon={Mail}
              label={t("contactPage.emailLabel")}
              value={t("contactPage.emailValue")}
              href={`mailto:${t("contactPage.emailValue")}`}
            />
            <InfoCard
              icon={Mail}
              label={t("contactPage.demoLabel")}
              value={t("contactPage.demoValue")}
              href={`mailto:${t("contactPage.demoValue")}`}
            />
            <InfoCard
              icon={Clock}
              label={t("contactPage.hoursLabel")}
              value={t("contactPage.hoursValue")}
            />
          </div>

          {/* Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
            <h2 className="mb-6 text-xl font-bold text-cyan-950">{t("contactPage.formTitle")}</h2>

            {success ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                <h3 className="text-xl font-bold text-emerald-700">{t("contactPage.successTitle")}</h3>
                <p className="text-slate-600">{success}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field
                  id="name"
                  label={t("contactPage.name")}
                  value={form.name}
                  onChange={(v) => setForm((p) => ({ ...p, name: v }))}
                  disabled={submitting}
                />
                <Field
                  id="email"
                  label={t("contactPage.email")}
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm((p) => ({ ...p, email: v }))}
                  disabled={submitting}
                />
                <Field
                  id="subject"
                  label={t("contactPage.subject")}
                  value={form.subject}
                  onChange={(v) => setForm((p) => ({ ...p, subject: v }))}
                  disabled={submitting}
                />
                <div>
                  <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-700">
                    {t("contactPage.message")}
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    disabled={submitting}
                    placeholder={t("contactPage.messagePlaceholder")}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                  />
                </div>
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 py-3 font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-60"
                >
                  {submitting ? t("contactPage.submitting") : t("contactPage.submit")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
