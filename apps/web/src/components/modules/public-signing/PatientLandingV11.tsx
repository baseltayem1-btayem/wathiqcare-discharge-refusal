"use client";

/**
 * PatientLandingV11
 * ------------------------------------------------------------
 * Visual-only landing layer for the public-signing workflow.
 *
 * Wired ONLY when FEATURE_UI_REFRESH_V1_1 is enabled. When the
 * flag is off, `PublicSigningWorkflow` keeps rendering its
 * legacy step-indicator + header pair and this file is unused
 * (the boundary returns a pass-through fragment).
 *
 * This component:
 *   - Does NOT fetch data or perform any side effects.
 *   - Does NOT touch state (decision, OTP, signature, audit).
 *   - Receives every value as a prop. The caller stays the
 *     single source of truth for stage progression.
 *
 * Scope (per "Controlled First UI Wiring"):
 *   - Patient landing visual only.
 *   - No education content, no OTP, no signature, no confirmation.
 */

import {
  PatientHeroSection,
  TrustBanner,
  ProcedureSummaryCard,
  WhatToExpectCard,
  StepIndicatorV11,
  type Lang,
  type WhatToExpectItem,
} from "@/components/ui-refresh";

type PatientLandingV11Props = {
  lang?: Lang;
  /** Hero block */
  titleEn: string;
  titleAr: string;
  description?: string;
  /** Procedure summary block */
  consentTypeLabel: string;
  consentTypeValue: string;
  physician?: string;
  facility?: string;
  /** Trust banner (caller-provided copy — no hardcoded legal text) */
  trustBannerMessage: string;
  /** Process preview */
  whatToExpectTitle: string;
  whatToExpectItems: WhatToExpectItem[];
  /** Step indicator */
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
  ofLabel?: string;
};

export default function PatientLandingV11(props: PatientLandingV11Props) {
  const {
    lang = "en",
    titleEn,
    titleAr,
    description,
    consentTypeLabel,
    consentTypeValue,
    physician,
    facility,
    trustBannerMessage,
    whatToExpectTitle,
    whatToExpectItems,
    currentStep,
    totalSteps,
    stepLabel,
    ofLabel,
  } = props;

  const heroTitle = lang === "ar" ? titleAr : titleEn;
  const heroSubtitle = lang === "ar" ? titleEn : titleAr;

  return (
    <div className="space-y-5">
      <StepIndicatorV11
        current={currentStep}
        total={totalSteps}
        lang={lang}
        stepLabel={stepLabel}
        ofLabel={ofLabel}
      />

      <PatientHeroSection
        lang={lang}
        title={heroTitle}
        description={description ?? heroSubtitle}
      />

      <TrustBanner lang={lang} message={trustBannerMessage} />

      <ProcedureSummaryCard
        lang={lang}
        consentTypeLabel={consentTypeLabel}
        consentTypeValue={consentTypeValue}
        physician={physician}
        facility={facility}
      />

      <WhatToExpectCard
        lang={lang}
        title={whatToExpectTitle}
        items={whatToExpectItems}
      />
    </div>
  );
}
