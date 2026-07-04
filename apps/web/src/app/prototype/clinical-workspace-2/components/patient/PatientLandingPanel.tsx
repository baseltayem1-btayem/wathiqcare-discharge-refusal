"use client";

import { ShieldCheck, User, Stethoscope, Hospital } from "lucide-react";
import type { PatientJourneyContext, PatientJourneyState } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { AccessibilityControls } from "./AccessibilityControls";
import { RemoteSigningReadinessBadge } from "./RemoteSigningReadinessBadge";

interface PatientLandingPanelProps {
  context: PatientJourneyContext;
  journey: PatientJourneyState;
  onContinue: () => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function PatientLandingPanel({
  context,
  journey,
  onContinue,
  onAccessibilityChange,
}: PatientLandingPanelProps) {
  const { language } = journey.accessibility;

  return (
    <div
      className={`max-w-2xl mx-auto space-y-6 ${journey.accessibility.highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-bold">
          <ShieldCheck className="w-4 h-4" />
          {t(language, "Secure signing session", "جلسة توقيع آمنة")}
        </div>
        <RemoteSigningReadinessBadge lang={language} />
      </div>

      <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />

      <div className="text-center space-y-2">
        <h1 className={`font-extrabold ${headingSizeClass(journey.accessibility.textSize)}`}>
          {t(language, "Informed Consent", "موافقة مستنيرة")}
        </h1>
        <p className={`text-[var(--wc-text-muted)] ${textSizeClass(journey.accessibility.textSize)}`}>
          {t(language, "Please review the information before making your decision.", "يرجى مراجعة المعلومات قبل اتخاذ قرارك.")}
        </p>
      </div>

      <div className="space-y-3">
        <InfoRow icon={User} label={t(language, "Patient", "المريض")} value={`${context.patientName} (${context.mrn})`} />
        <InfoRow icon={Stethoscope} label={t(language, "Procedure", "الإجراء")} value={context.procedureName} />
        <InfoRow icon={Hospital} label={t(language, "Physician & Facility", "الطبيب والمنشأة")} value={`${context.physicianName} — ${context.facilityName}`} />
      </div>

      {context.requiredParticipants.length > 0 && (
        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
          <div className={`font-semibold mb-1 ${textSizeClass(journey.accessibility.textSize)}`}>
            {t(language, "Additional participants required", "مشاركون إضافيون مطلوبون")}
          </div>
          <div className={`${textSizeClass(journey.accessibility.textSize)}`}>
            {context.requiredParticipants.join(", ")}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3 rounded-lg bg-[var(--wc-navy)] text-white font-bold text-base hover:bg-[var(--wc-navy-dark)] transition-colors"
      >
        {t(language, "Start reviewing", "ابدأ المراجعة")}
      </button>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
      <Icon className="w-5 h-5 text-[var(--wc-blue)] mt-0.5" />
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">{label}</div>
        <div className="font-semibold text-[var(--wc-text)]">{value}</div>
      </div>
    </div>
  );
}
