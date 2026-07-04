"use client";

import { useState } from "react";
import { Languages, Mic } from "lucide-react";
import type { PatientJourneyState, SignatureRecord } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { AccessibilityControls } from "./AccessibilityControls";

interface InterpreterFlowPanelProps {
  journey: PatientJourneyState;
  onComplete: (signature: SignatureRecord) => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function InterpreterFlowPanel({ journey, onComplete, onAccessibilityChange }: InterpreterFlowPanelProps) {
  const { language, textSize, highContrast } = journey.accessibility;
  const [name, setName] = useState("");
  const [interpretedLanguage, setInterpretedLanguage] = useState("");
  const [interpretationConfirmed, setInterpretationConfirmed] = useState(false);

  const handleComplete = () => {
    onComplete({
      role: "interpreter",
      signerName: name,
      language: interpretedLanguage,
      signedAt: new Date().toISOString(),
      signatureData: "data:image/png;base64,INTERPRETER_MOCK",
    });
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Interpreter attestation", "توثيق المترجم")}</h2>
        <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />
      </div>

      <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 text-blue-900 flex items-start gap-3">
        <Languages className="w-5 h-5 mt-0.5" />
        <div className={textSizeClass(textSize)}>
          {t(language, "An interpreter is required because the patient prefers a language other than Arabic. The interpreter must attest to accurate communication.", "مطلوب مترجم لأن المريض يفضل لغة غير العربية. يجب على المترجم التوثيق بأن التواصل كان دقيقاً.")}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">{t(language, "Interpreter full name", "الاسم الكامل للمترجم")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--wc-border)] text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">{t(language, "Language interpreted", "اللغة المترجمة")}</label>
          <input
            type="text"
            value={interpretedLanguage}
            onChange={(e) => setInterpretedLanguage(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-[var(--wc-border)] text-sm"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] cursor-pointer">
        <input
          type="checkbox"
          checked={interpretationConfirmed}
          onChange={(e) => setInterpretationConfirmed(e.target.checked)}
          className="mt-1 w-4 h-4 accent-[var(--wc-blue)]"
        />
        <span className={textSizeClass(textSize)}>
          {t(language, "I confirm that I accurately interpreted the consent information between the care team and the patient.", "أؤكد أنني ترجمت معلومات الموافقة بدقة بين فريق الرعاية والمريض.")}
        </span>
      </label>

      <button
        type="button"
        onClick={handleComplete}
        disabled={!name || !interpretedLanguage || !interpretationConfirmed}
        className="w-full py-3 rounded-lg bg-[var(--wc-navy)] text-white font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2"
      >
        <Mic className="w-5 h-5" />
        {t(language, "Attest interpretation", "توثيق الترجمة")}
      </button>
    </div>
  );
}
