"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Mail, Phone, Users } from "lucide-react";
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
  const { lang, isRtl } = useI18n();
  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const content = useMemo(
    () =>
      lang === "ar"
        ? {
          title: "طلب نسخة تجريبية",
          subtitle:
            "يرجى تعبئة بيانات المنشأة ووسائل التواصل ليقوم فريق واثق كير بالتواصل معكم وتقديم عرض توضيحي مناسب.",
          backHome: "العودة للرئيسية",
          enterSystem: "الدخول للنظام",
          formTitle: "بيانات طلب النسخة التجريبية",
          facilityName: "اسم المنشأة",
          contactName: "اسم مسؤول التواصل",
          contactEmail: "البريد الإلكتروني للتواصل",
          contactPhone: "رقم الهاتف",
          contactAddress: "عنوان التواصل",
          employeeCount: "عدد الموظفين في المنشأة",
          submit: "إرسال الطلب",
          submitting: "جارٍ الإرسال...",
          requiredHint: "جميع الحقول مطلوبة",
          success:
            "شكرًا على طلبكم. تم إرسال رسالة تأكيد إلى بريدكم الإلكتروني، وسيقوم مندوب شركة واثق كير بالتواصل معكم قريبًا.",
          errorFallback: "تعذر إرسال الطلب حاليًا. يرجى المحاولة مرة أخرى.",
        }
        : {
          title: "Request a Demo",
          subtitle:
            "Please provide your organization details and contact information so the WathiqCare team can schedule a tailored demo.",
          backHome: "Back to Home",
          enterSystem: "Enter System",
          formTitle: "Demo Request Details",
          facilityName: "Organization Name",
          contactName: "Contact Person Name",
          contactEmail: "Contact Email",
          contactPhone: "Contact Phone",
          contactAddress: "Contact Address",
          employeeCount: "Number of Employees",
          submit: "Submit Request",
          submitting: "Submitting...",
          requiredHint: "All fields are required",
          success:
            "Thank you for your request. A confirmation email has been sent to your inbox, and a WathiqCare representative will contact you shortly.",
          errorFallback: "Unable to submit your request right now. Please try again.",
        },
    [lang],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...form, locale: lang }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; detail?: string }
        | null;

      const requestSucceeded = response.ok && (payload?.ok ?? true);
      if (!requestSucceeded) {
        setErrorMessage(payload?.detail ?? content.errorFallback);
        return;
      }

      setSuccessMessage(payload?.message?.trim() || content.success);
      setForm(initialForm);
    } catch {
      setErrorMessage(content.errorFallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.65)] sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                WC
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">WathiqCare</p>
                <p className="text-lg font-semibold leading-tight">{content.title}</p>
              </div>
            </div>

            <LanguageSwitcher className="bg-white" />
          </div>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-45px_rgba(2,6,23,0.55)] lg:p-8">
          <p className="text-sm leading-7 text-slate-700">{content.subtitle}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <ArrowIcon className="h-4 w-4" />
              {content.backHome}
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              {content.enterSystem}
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">{content.formTitle}</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-700">
                <span className="mb-1 inline-flex items-center gap-2 font-medium">
                  <Building2 className="h-4 w-4" />
                  {content.facilityName}
                </span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/60"
                  value={form.facilityName}
                  onChange={(event) => setForm((prev) => ({ ...prev, facilityName: event.target.value }))}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                <span className="mb-1 inline-flex items-center gap-2 font-medium">{content.contactName}</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/60"
                  value={form.contactName}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactName: event.target.value }))}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                <span className="mb-1 inline-flex items-center gap-2 font-medium">
                  <Mail className="h-4 w-4" />
                  {content.contactEmail}
                </span>
                <input
                  type="email"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/60"
                  value={form.contactEmail}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactEmail: event.target.value }))}
                  required
                />
              </label>

              <label className="text-sm text-slate-700">
                <span className="mb-1 inline-flex items-center gap-2 font-medium">
                  <Phone className="h-4 w-4" />
                  {content.contactPhone}
                </span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/60"
                  value={form.contactPhone}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactPhone: event.target.value }))}
                  required
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 inline-flex items-center gap-2 font-medium">{content.contactAddress}</span>
                <input
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/60"
                  value={form.contactAddress}
                  onChange={(event) => setForm((prev) => ({ ...prev, contactAddress: event.target.value }))}
                  required
                />
              </label>

              <label className="text-sm text-slate-700 md:col-span-2">
                <span className="mb-1 inline-flex items-center gap-2 font-medium">
                  <Users className="h-4 w-4" />
                  {content.employeeCount}
                </span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/60"
                  value={form.employeeCount}
                  onChange={(event) => setForm((prev) => ({ ...prev, employeeCount: event.target.value }))}
                  required
                />
              </label>
            </div>

            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              value={form.website}
              onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
              aria-hidden="true"
            />

            <p className="text-xs text-slate-500">{content.requiredHint}</p>

            {successMessage ? (
              <p className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                {successMessage}
              </p>
            ) : null}

            {errorMessage ? <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{errorMessage}</p> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? content.submitting : content.submit}
              <ArrowIcon className="h-4 w-4" />
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}