"use client";

import { useState } from "react";
import { MessageCircleQuestion, Send } from "lucide-react";
import type { PatientJourneyState } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { AccessibilityControls } from "./AccessibilityControls";

interface PatientQuestionsPanelProps {
  journey: PatientJourneyState;
  onSubmitQuestion: (text: string) => void;
  onContinue: () => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function PatientQuestionsPanel({
  journey,
  onSubmitQuestion,
  onContinue,
  onAccessibilityChange,
}: PatientQuestionsPanelProps) {
  const { language, textSize, highContrast } = journey.accessibility;
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (!text.trim()) return;
    onSubmitQuestion(text.trim());
    setText("");
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Questions for your care team", "أسئلة لفريق الرعاية")}</h2>
        <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />
      </div>

      <p className={textSizeClass(textSize)}>
        {t(language, "If anything is unclear, ask your physician. A response will be added to your record.", "إذا كان هناك شيء غير واضح، اسأل طبيبك. ستتم إضافة الرد إلى سجلك.")}
      </p>

      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(language, "Type your question here...", "اكتب سؤالك هنا...")}
          rows={3}
          className="w-full p-3 rounded-lg border border-[var(--wc-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--wc-blue-light)]"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--wc-navy)] text-white text-sm font-semibold disabled:opacity-40"
        >
          <Send className="w-4 h-4" /> {t(language, "Send question", "إرسال السؤال")}
        </button>
      </div>

      {journey.questions.length > 0 && (
        <div className="space-y-2">
          <div className={`font-semibold ${textSizeClass(textSize)}`}>{t(language, "Your questions", "أسئلتك")}</div>
          {journey.questions.map((q) => (
            <div key={q.id} className="p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
              <div className="flex items-start gap-2">
                <MessageCircleQuestion className="w-4 h-4 text-[var(--wc-blue)] mt-0.5" />
                <div>
                  <div className={textSizeClass(textSize)}>{q.text}</div>
                  <div className="text-xs text-[var(--wc-text-muted)] mt-1">
                    {q.answer ? t(language, "Answered", "تم الرد") : t(language, "Waiting for answer", "في انتظار الرد")}
                  </div>
                  {q.answer && <div className="text-sm mt-1 text-[var(--wc-text)]">{q.answer}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onContinue}
        className="w-full py-3 rounded-lg bg-[var(--wc-navy)] text-white font-bold text-base hover:bg-[var(--wc-navy-dark)]"
      >
        {t(language, "Continue to decision", "المتابعة إلى القرار")}
      </button>
    </div>
  );
}
