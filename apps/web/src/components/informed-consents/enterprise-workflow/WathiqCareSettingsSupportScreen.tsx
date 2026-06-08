"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Headphones,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Ticket,
  UserRoundCheck,
} from "lucide-react";

const cards = [
  {
    titleAr: "الإعدادات",
    titleEn: "Settings",
    href: "/platform/settings",
    icon: Settings,
    descriptionAr: "إدارة إعدادات المنصة والهوية المؤسسية وصلاحيات التشغيل.",
    descriptionEn: "Manage platform settings, enterprise identity, and operational preferences.",
  },
  {
    titleAr: "الدعم القانوني",
    titleEn: "Legal Support",
    href: "/legal/dashboard",
    icon: ShieldCheck,
    descriptionAr: "الوصول إلى الدعم القانوني المرتبط بسير الموافقات والحوكمة.",
    descriptionEn: "Access legal support linked to consent workflow and governance.",
  },
  {
    titleAr: "طلب استشارة قانونية",
    titleEn: "Request Legal Consultation",
    href: "/modules/informed-consents/support-requests",
    icon: UserRoundCheck,
    descriptionAr: "رفع طلب استشارة قانونية مخصص لمسار الموافقات المستنيرة.",
    descriptionEn: "Submit a legal consultation request for informed consent matters.",
  },
  {
    titleAr: "فتح تذكرة دعم تقني",
    titleEn: "Open Technical Support Ticket",
    href: "/platform/support",
    icon: Ticket,
    descriptionAr: "فتح تذكرة دعم فني لمشاكل الدخول أو التشغيل أو التكامل.",
    descriptionEn: "Open a technical support ticket for access, runtime, or integration issues.",
  },
];

export default function WathiqCareSettingsSupportScreen() {
  return (
    <main className="min-h-screen bg-[#F4F7FB] px-7 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#002B5C]">
              <BriefcaseBusiness className="h-4 w-4" />
              WathiqCare Clinical Consent Platform
            </div>
            <h1 className="text-3xl font-bold text-[#101828]">
              Settings & Support / الإعدادات والدعم
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#667085]">
              Centralized production screen for platform settings, legal support, consultation requests, and technical support tickets.
            </p>
          </div>

          <Link
            href="/modules/informed-consents"
            className="inline-flex items-center gap-2 rounded-lg border border-[#D8DCE3] bg-white px-4 py-2.5 text-sm font-semibold text-[#002B5C] shadow-sm hover:bg-[#F8FAFC]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Physician Journey
          </Link>
        </div>

        <section className="rounded-2xl border border-[#D8DCE3] bg-white p-6 shadow-sm">
          <div className="mb-6 rounded-2xl bg-[#002B5C] p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <LifeBuoy className="h-6 w-6 text-[#C9A13B]" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9A13B]">
                  Production Support Hub
                </div>
                <h2 className="mt-1 text-2xl font-bold">
                  WathiqCare Settings & Support
                </h2>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;

              return (
                <Link
                  key={card.titleEn}
                  href={card.href}
                  className="group rounded-2xl border border-[#D8DCE3] bg-gradient-to-b from-white to-[#F8FAFC] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#002B5C] hover:shadow-md"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="rounded-xl bg-[#002B5C] p-3 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <Headphones className="h-4 w-4 text-[#C9A13B]" />
                  </div>

                  <h3 className="text-lg font-bold text-[#101828]">
                    {card.titleAr}
                  </h3>
                  <div className="mt-1 text-sm font-semibold text-[#002B5C]">
                    {card.titleEn}
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#667085]">
                    {card.descriptionAr}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#98A2B3]">
                    {card.descriptionEn}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
