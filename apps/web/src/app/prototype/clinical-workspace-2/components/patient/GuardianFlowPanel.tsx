"use client";

import { useState } from "react";
import { Baby, ShieldCheck } from "lucide-react";
import type { PatientJourneyState, SignatureRecord } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { AccessibilityControls } from "./AccessibilityControls";

interface GuardianFlowPanelProps {
  journey: PatientJourneyState;
  onComplete: (signature: SignatureRecord) => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function GuardianFlowPanel({ journey, onComplete, onAccessibilityChange }: GuardianFlowPanelProps) {
  const { language, textSize, highContrast } = journey.accessibility;
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [capacityConfirmed, setCapacityConfirmed] = useState(false);

  const handleComplete = () => {
    onComplete({
      role: "guardian",
      signerName: name,
      relationship,
      signedAt: new Date().toISOString(),
      signatureData: "data:image/png;base64,GUARDIAN_MOCK",
    });
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Guardian / representative", "ولي الأمر / الممثل")}</h2>
        <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />
      </div>

      <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-900 flex items-start gap-3">
        <Baby className="w-5 h-5 mt-0.5" />
        <div className={textSizeClass(textSize)}>
          {t(language, "The patient requires a guardian or legal representative to consent on their behalf.", "المريض يحتاج إلى ولي أمر أو ممثل قانوني للموافقة نيابة عنه.")}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">{t(language, "Guardian full name", "الاسم الكامل لولي الأمر")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--wc-border)] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">{t(language, "Relationship to patient", "العلاقة بالمريض")}</label>
          <input
            type="text"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--wc-border)] text-sm"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] cursor-pointer">
        <input
          type="checkbox"
          checked={capacityConfirmed}
          onChange={(e) => setCapacityConfirmed(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[var(--wc-blue)]"
        />
        <span className={textSizeClass(textSize)}>
          {t(language, "I confirm that I have legal authority to consent on behalf of the patient and that the patient lacks capacity.", "أؤكد أن لدي السلطة القانونية للموافقة نيابة عن المريض وأن المريض يفتقر إلى الأهلية.")}
        </span>
      </label>

      <button
        type="button"
        onClick={handleComplete}
        disabled={!name || !relationship || !capacityConfirmed}
        className="w-full py-3 rounded-lg bg-[var(--wc-navy)] text-white font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
      >
        <ShieldCheck className="w-5 h-5" />
        {t(language, "Confirm and attest", "تأكيد وتوثيق")}
      </button>
    </div>
  );
}
