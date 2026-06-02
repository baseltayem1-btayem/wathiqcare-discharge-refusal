"use client";

import { FormEvent, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
  Phone,
  Languages,
} from "lucide-react";

type WathiqcareRequestDemoPageProps = {
  lang?: string;
};

type FormState = {
  facilityName: string;
  fullName: string;
  contactEmail: string;
  phoneNumber: string;
  contactAddress: string;
  employeeCount: string;
  website: string;
};

const THEME = {
  page: "#F4F8FB",
  white: "#FFFFFF",
  darkText: "#07111F",
  mutedText: "#4B5563",
  teal: "#2596BE",
  tealDark: "#0B5A70",
  softTeal: "#E6F7FB",
  border: "#D8E5EA",
};

const BRAND = {
  name: "WathiqCare",
  logoDark: "/images/wathiqcare-logo.png",
};

const trustItems = [
  "PDPL Compliant",
  "CBAHI Ready",
  "99.9% Uptime",
  "24/7 Support",
];

const formFields: Array<{
  key: keyof FormState;
  label: string;
  required: boolean;
  type: "text" | "email" | "tel" | "number" | "url";
}> = [
  { key: "facilityName", label: "Facility Name", required: true, type: "text" },
  { key: "fullName", label: "Full Name", required: true, type: "text" },
  { key: "contactEmail", label: "Contact Email", required: true, type: "email" },
  { key: "phoneNumber", label: "Phone Number", required: true, type: "tel" },
  { key: "contactAddress", label: "Contact Address", required: true, type: "text" },
  {
    key: "employeeCount",
    label: "Number of Employees",
    required: true,
    type: "number",
  },
  { key: "website", label: "Website", required: false, type: "url" },
];

const initialForm: FormState = {
  facilityName: "",
  fullName: "",
  contactEmail: "",
  phoneNumber: "",
  contactAddress: "",
  employeeCount: "",
  website: "",
};

export default function WathiqcareRequestDemoPage({
  lang = "en",
}: WathiqcareRequestDemoPageProps) {
  const isArabic = lang === "ar";
  const homeHref = isArabic ? "/ar" : "/";
  const loginHref = `/${lang}/login`;

  const [form, setForm] = useState<FormState>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const labels = useMemo(
    () =>
      isArabic
        ? {
          backToHome: "العودة للرئيسية",
          enterSystem: "الدخول للنظام",
          language: "اللغة",
          requestDemo: "طلب نسخة تجريبية",
          subtitle:
            "يرجى تعبئة بيانات المنشأة وسيتواصل معكم فريقنا لتحديد موعد عرض توضيحي مخصص.",
          detailsTitle: "تفاصيل طلب النسخة التجريبية",
          requiredHint: "الحقول المعلّمة بنجمة مطلوبة",
          submit: "إرسال الطلب",
          submitting: "جارٍ الإرسال...",
          success:
            "تم إرسال طلبكم بنجاح. سيتواصل فريق واثق كير معكم قريبًا لتنسيق العرض.",
          error: "تعذر إرسال الطلب حاليًا. يرجى المحاولة مرة أخرى.",
          nextTitle: "ماذا سيحدث بعد ذلك؟",
          next1: "نراجع متطلبات منشأتكم.",
          next2: "نحدد موعد عرض توضيحي بإرشاد مباشر.",
          next3: "ننسق نطاق التجربة واحتياجات الامتثال.",
        }
        : {
          backToHome: "Back to Home",
          enterSystem: "Enter System",
          language: "Language",
          requestDemo: "Request a Demo",
          subtitle:
            "Please fill in your facility details and our team will contact you to schedule a personalized demonstration.",
          detailsTitle: "Demo Request Details",
          requiredHint: "Required fields are marked with an asterisk.",
          submit: "Submit Request",
          submitting: "Submitting...",
          success:
            "Thank you for your request. Our team will contact you shortly to schedule your demo.",
          error: "Unable to submit your request right now. Please try again.",
          nextTitle: "What happens next?",
          next1: "We review your facility requirements.",
          next2: "We schedule a guided platform demo.",
          next3: "We align pilot scope and compliance needs.",
        },
    [isArabic],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          facilityName: form.facilityName,
          contactName: form.fullName,
          contactEmail: form.contactEmail,
          contactPhone: form.phoneNumber,
          contactAddress: form.contactAddress,
          employeeCount: form.employeeCount,
          website: form.website,
          locale: lang,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; message?: string; detail?: string }
        | null;

      if (!response.ok || payload?.ok === false) {
        setErrorMessage(payload?.detail ?? labels.error);
        return;
      }

      setSuccessMessage(payload?.message?.trim() || labels.success);
      setForm(initialForm);
    } catch {
      setErrorMessage(labels.error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen bg-[#F4F8FB] font-[Manrope,Inter,system-ui,sans-serif] text-[#07111F]"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <header className="border-b border-[#D8E5EA] bg-white">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#07111F] transition hover:text-[#2596BE]"
          >
            {isArabic ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {labels.backToHome}
          </Link>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#D8E5EA] bg-white px-2 py-1.5 sm:px-3">
              <Languages className="h-4 w-4 text-[#2596BE]" />
              <span className="hidden text-xs font-semibold text-[#07111F] sm:inline">
                {labels.language}
              </span>
              <Link
                href="/en/request-demo"
                className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                  lang === "en"
                    ? "bg-[#07111F] text-white"
                    : "text-[#4B5563] hover:bg-[#F4F8FB]"
                }`}
              >
                EN
              </Link>
              <Link
                href="/ar/request-demo"
                className={`rounded-md px-2 py-1 text-xs font-bold transition ${
                  lang === "ar"
                    ? "bg-[#07111F] text-white"
                    : "text-[#4B5563] hover:bg-[#F4F8FB]"
                }`}
              >
                عربي
              </Link>
            </div>

            <Link
              href={loginHref}
              className="rounded-xl bg-[#2596BE] px-3 py-2 text-sm font-bold text-white transition hover:bg-[#1f86aa] sm:px-5"
            >
              {labels.enterSystem}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="min-w-0 overflow-visible">
            <Image
              src={BRAND.logoDark}
              alt={BRAND.name}
              width={440}
              height={124}
              priority
              className="mb-10 h-auto w-auto shrink-0 object-contain max-w-[280px] max-h-[84px] sm:max-w-[300px] sm:max-h-[90px] md:max-w-[420px] md:max-h-[126px] lg:max-w-[500px] lg:max-h-[150px]"
            />

            <h1 className="text-4xl font-extrabold tracking-tight text-[#07111F] md:text-5xl">
              {labels.requestDemo}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-8 text-[#4B5563] md:text-lg">
              {labels.subtitle}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {trustItems.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#D8E5EA]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6F7FB] text-[#2596BE]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-[#07111F]">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 rounded-2xl bg-[#E6F7FB] p-5 ring-1 ring-[#C6E8F2]">
              <div className="grid gap-3">
                <a
                  href="mailto:demo@wathiqcare.online"
                  className="flex items-center gap-3 font-bold text-[#075061]"
                >
                  <Mail className="h-5 w-5" />
                  demo@wathiqcare.online
                </a>

                <a
                  href="tel:+966543587772"
                  className="flex items-center gap-3 font-bold text-[#075061]"
                  dir="ltr"
                >
                  <Phone className="h-5 w-5" />
                  +966 543587772
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-[#D8E5EA] md:p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-extrabold text-[#07111F]">
                {labels.detailsTitle}
              </h2>
              <p className="mt-2 text-sm text-[#4B5563]">{labels.requiredHint}</p>
            </div>

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <p className="text-sm leading-7">{successMessage}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2">
                {formFields.map((field) => (
                  <label
                    key={field.key}
                    className={
                      field.key === "website" || field.key === "contactAddress"
                        ? "md:col-span-2"
                        : ""
                    }
                  >
                    <span className="mb-2 block text-sm font-bold text-[#07111F]">
                      {field.label}
                      {field.required ? <span className="ml-1 text-red-500">*</span> : null}
                    </span>

                    <input
                      type={field.type}
                      required={field.required}
                      min={field.type === "number" ? 1 : undefined}
                      value={form[field.key]}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                      }
                      className="h-12 w-full rounded-xl border border-[#D8E5EA] bg-white px-3.5 text-[#07111F] outline-none transition focus:border-[#2596BE] focus:ring-4 focus:ring-[#2596BE]/10"
                    />
                  </label>
                ))}

                {errorMessage ? (
                  <div className="md:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2596BE] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-[#2596BE]/20 transition hover:bg-[#1f86aa] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {isSubmitting ? labels.submitting : labels.submit}
                    {isArabic ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </button>
                </div>
              </form>
            )}

            <aside className="mt-8 rounded-2xl bg-gradient-to-br from-[#075061] to-[#2596BE] p-5 text-white">
              <h3 className="text-xl font-extrabold">{labels.nextTitle}</h3>
              <ol className="mt-4 grid gap-2 text-sm leading-7 text-white/95">
                <li>1. {labels.next1}</li>
                <li>2. {labels.next2}</li>
                <li>3. {labels.next3}</li>
              </ol>
            </aside>
          </div>
        </div>
      </section>

      <style jsx>{`
        .force-theme-colors {
          background: ${THEME.page};
          color: ${THEME.darkText};
          border-color: ${THEME.border};
        }
      `}</style>
    </main>
  );
}
