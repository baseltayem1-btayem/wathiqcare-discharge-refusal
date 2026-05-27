/**
 * Public surface of the v1.1 UI refresh component scaffold.
 *
 * Every export here is presentational and inert outside of an
 * <UIRefreshBoundary> scope. None of these components touch the
 * OTP, signing, audit, evidence, secure-link, or sequencing
 * pipelines — they receive localised strings and event handlers
 * from the caller, which retains full ownership of those flows.
 *
 * See pilot-package/FIGMA_TO_CODE_MAPPING.md for design provenance.
 */

export { default as UIRefreshBoundary } from "./UIRefreshBoundary";

export { default as StepIndicatorV11 } from "./StepIndicatorV11";
export type { StepIndicatorV11Props } from "./StepIndicatorV11";

export { default as TrustBanner } from "./TrustBanner";
export type { TrustBannerProps } from "./TrustBanner";

export { default as PatientHeroSection } from "./PatientHeroSection";
export type { PatientHeroSectionProps } from "./PatientHeroSection";

export { default as ProcedureSummaryCard } from "./ProcedureSummaryCard";
export type { ProcedureSummaryCardProps } from "./ProcedureSummaryCard";

export { default as EducationCard } from "./EducationCard";
export type { EducationCardProps, EducationCardTone } from "./EducationCard";

export { default as WhatToExpectCard } from "./WhatToExpectCard";
export type { WhatToExpectCardProps, WhatToExpectItem } from "./WhatToExpectCard";

export { default as RiskBenefitCards } from "./RiskBenefitCards";
export type {
  RiskBenefitCardsProps,
  RiskBenefitItem,
} from "./RiskBenefitCards";

export { default as FAQAccordion } from "./FAQAccordion";
export type { FAQAccordionProps, FAQItem } from "./FAQAccordion";

export { default as OTPVisualPanel } from "./OTPVisualPanel";
export type { OTPVisualPanelProps } from "./OTPVisualPanel";

export { default as SignatureVisualPanel } from "./SignatureVisualPanel";
export type { SignatureVisualPanelProps } from "./SignatureVisualPanel";

export { default as ConfirmationCard } from "./ConfirmationCard";
export type { ConfirmationCardProps } from "./ConfirmationCard";

export type { Lang } from "./_utils";
