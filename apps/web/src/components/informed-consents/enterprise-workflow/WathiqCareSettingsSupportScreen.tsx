"use client";

import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { EnterpriseSupportSettingsPanel } from "@/components/informed-consents/enterprise-workflow/EnterpriseSupportSettingsPanel";

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
              Support & Settings / الدعم والإعدادات
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
          <EnterpriseSupportSettingsPanel lang="en" />
        </section>
      </div>
    </main>
  );
}
