"use client";

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import type { PatientJourneyContext, PatientJourneyState } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { AccessibilityControls } from "./AccessibilityControls";

interface PatientDecisionPanelProps {
  context: PatientJourneyContext;
  journey: PatientJourneyState;
  onDecide: (decision: "accepted" | "refused") => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function PatientDecisionPanel({
  context,
  journey,
  onDecide,
  onAccessibilityChange,
}: PatientDecisionPanelProps) {
  const { language, textSize, highContrast } = journey.accessibility;

  return (
    <div className={`max-w-2xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Your decision", "قرارك")}</h2>
        <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />
      </div>

      <div className="p-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
        <div className={`font-semibold ${textSizeClass(textSize)}`}>{context.procedureName}</div>
        <div className="text-xs text-[var(--wc-text-muted)]">
          {t(language, "Consent reference", "مرجع الموافقة")}: {context.consentReference}
        </div>
      </div>

      <p className={textSizeClass(textSize)}>
        {t(language, "You may accept or refuse. Your care will not be affected if you refuse, and you can change your mind before the procedure begins.", "يمكنك الموافقة أو الرفض. لن تتأثر رعايتك إذا رفضت، ويمكنك تغيير رأيك قبل بدء الإجراء.")}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onDecide("accepted")}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-green-200 bg-green-50 text-green-900 hover:bg-green-100 transition-colors"
        >
          <CheckCircle2 className="w-8 h-8" />
          <span className="font-bold text-lg">{t(language, "I Accept", "أوافق")}</span>
          <span className="text-xs text-center">{t(language, "I agree to the procedure after understanding the risks and benefits.", "أوافق على الإجراء بعد فهم المخاطر والفوائد.")}</span>
        </button>

        <button
          type="button"
          onClick={() => onDecide("refused")}
          className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-red-200 bg-red-50 text-red-900 hover:bg-red-100 transition-colors"
        >
          <XCircle className="w-8 h-8" />
          <span className="font-bold text-lg">{t(language, "I Refuse", "أرفض")}</span>
          <span className="text-xs text-center">{t(language, "I do not want this procedure. I understand the consequences.", "لا أريد هذا الإجراء. أفهم العواقب.")}</span>
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{t(language, "If you are unsure, tap Back to review or ask a question.", "إذا كنت غير متأكد، اضغط رجوع للمراجعة أو اسأل سؤالاً.")}</span>
      </div>
    </div>
  );
}
