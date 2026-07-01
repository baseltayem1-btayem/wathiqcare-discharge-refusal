"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, CheckCircle2, AlertTriangle } from "lucide-react";
import type { PatientJourneyContext, PatientJourneyState } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { getMockFaq, getMockComprehensionQuestions } from "../../lib/patient-journey-data";
import { AccessibilityControls } from "./AccessibilityControls";

interface PatientEducationWorkspaceProps {
  context: PatientJourneyContext;
  journey: PatientJourneyState;
  onComplete: (score?: number, passed?: boolean) => void;
  onProgress: (progress: number) => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function PatientEducationWorkspace({
  context,
  journey,
  onComplete,
  onProgress,
  onAccessibilityChange,
}: PatientEducationWorkspaceProps) {
  const { language, textSize, highContrast } = journey.accessibility;
  const [activeTab, setActiveTab] = useState(0);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const faq = getMockFaq();
  const questions = getMockComprehensionQuestions();
  const tabs = [
    t(language, "Summary", "ملخص"),
    t(language, "Risks", "المخاطر"),
    t(language, "Benefits", "الفوائد"),
    t(language, "Instructions", "التعليمات"),
    t(language, "FAQ", "الأسئلة الشائعة"),
    t(language, "Understanding", "الفهم"),
  ];

  useEffect(() => {
    const viewed = activeTab + 1;
    const progress = Math.min(100, Math.round((viewed / tabs.length) * 100));
    onProgress(progress);
  }, [activeTab, tabs.length, onProgress]);

  const handleAnswer = (qid: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: optionId }));
  };

  const score = questions.reduce((acc, q) => (answers[q.id] === q.correctOptionId ? acc + 1 : acc), 0);
  const passed = score >= Math.ceil(questions.length * 0.8);

  const completeEducation = () => {
    setShowResults(true);
    const pct = Math.round((score / questions.length) * 100);
    onComplete(pct, passed);
  };

  return (
    <div className={`max-w-3xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Patient Education", "التثقيف للمريض")}</h2>
        <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />
      </div>

      <div className="w-full bg-[var(--wc-border)] rounded-full h-2">
        <div
          className="bg-[var(--wc-blue)] h-2 rounded-full transition-all"
          style={{ width: `${journey.educationProgress}%` }}
        />
      </div>
      <div className="text-xs text-[var(--wc-text-muted)] text-right">{journey.educationProgress}%</div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab, idx) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              activeTab === idx
                ? "bg-[var(--wc-navy)] text-white border-[var(--wc-navy)]"
                : "bg-white text-[var(--wc-text)] border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className={`p-5 rounded-xl border border-[var(--wc-border)] bg-white ${highContrast ? "bg-black border-white" : ""}`}>
        {activeTab === 0 && (
          <SummaryTab language={language} textSize={textSize} procedureName={context.procedureName} physicianName={context.physicianName} />
        )}
        {activeTab === 1 && <RisksTab language={language} textSize={textSize} risks={context.risks} />}
        {activeTab === 2 && <BenefitsTab language={language} textSize={textSize} />}
        {activeTab === 3 && <InstructionsTab language={language} textSize={textSize} />}
        {activeTab === 4 && <FaqTab language={language} textSize={textSize} faq={faq} openFaq={openFaq} setOpenFaq={setOpenFaq} />}
        {activeTab === 5 && (
          <UnderstandingTab
            language={language}
            textSize={textSize}
            questions={questions}
            answers={answers}
            onAnswer={handleAnswer}
            showResults={showResults}
            score={score}
            passed={passed}
            onComplete={completeEducation}
          />
        )}
      </div>

      <div className="flex justify-between">
        <button
          type="button"
          disabled={activeTab === 0}
          onClick={() => setActiveTab((i) => i - 1)}
          className="px-4 py-2 rounded-lg border border-[var(--wc-border)] text-sm font-semibold disabled:opacity-40"
        >
          {t(language, "Back", "رجوع")}
        </button>
        {activeTab < tabs.length - 1 ? (
          <button
            type="button"
            onClick={() => setActiveTab((i) => i + 1)}
            className="px-4 py-2 rounded-lg bg-[var(--wc-navy)] text-white text-sm font-semibold"
          >
            {t(language, "Next", "التالي")}
          </button>
        ) : (
          <button
            type="button"
            onClick={completeEducation}
            className="px-4 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold"
          >
            {t(language, "Complete education", "أكمل التثقيف")}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryTab({ language, textSize, procedureName, physicianName }: { language: "en" | "ar"; textSize: "normal" | "large" | "extra-large"; procedureName: string; physicianName: string }) {
  return (
    <div className="space-y-3">
      <h3 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "What is being planned?", "ما هو المخطط؟")}</h3>
      <p className={textSizeClass(textSize)}>
        {t(language, `Your physician, ${physicianName}, has recommended: ${procedureName}.`, `أوصى طبيبك ${physicianName} بـ: ${procedureName}.`)}
      </p>
      <p className={textSizeClass(textSize)}>
        {t(language, "This consent explains the procedure, benefits, material risks, and alternatives so you can make an informed decision.", "تشرح هذه الموافقة الإجراء والفوائد والمخاطر المادية والبدائل حتى تتمكن من اتخاذ قرار مستنير.")}
      </p>
    </div>
  );
}

function RisksTab({ language, textSize, risks }: { language: "en" | "ar"; textSize: "normal" | "large" | "extra-large"; risks: { titleEn: string; titleAr: string; riskLevel: string }[] }) {
  return (
    <div className="space-y-3">
      <h3 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Key risks", "المخاطر الرئيسية")}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {risks.map((r) => (
          <div
            key={r.titleEn}
            className={`p-3 rounded-lg border ${
              r.riskLevel === "CRITICAL"
                ? "bg-red-50 border-red-200 text-red-900"
                : r.riskLevel === "HIGH"
                  ? "bg-amber-50 border-amber-200 text-amber-900"
                  : "bg-[var(--wc-surface-2)] border-[var(--wc-border)]"
            }`}
          >
            <div className="font-semibold flex items-center gap-2">
              {r.riskLevel === "CRITICAL" && <AlertTriangle className="w-4 h-4" />}
              {language === "ar" ? r.titleAr : r.titleEn}
            </div>
            <div className="text-xs opacity-80">{r.riskLevel}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BenefitsTab({ language, textSize }: { language: "en" | "ar"; textSize: "normal" | "large" | "extra-large" }) {
  const benefits = [
    t(language, "Relief or improvement of the condition being treated", "تخفيف أو تحسين الحالة المعالجة"),
    t(language, "Prevention of more serious complications", "منع مضاعفات أكثر خطورة"),
    t(language, "Diagnosis confirmation to guide further care", "تأكيد التشخيص لتوجيه الرعاية اللاحقة"),
  ];
  return (
    <div className="space-y-3">
      <h3 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Expected benefits", "الفوائد المتوقعة")}</h3>
      <ul className="space-y-2">
        {benefits.map((b) => (
          <li key={b} className={`flex items-start gap-2 ${textSizeClass(textSize)}`}>
            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InstructionsTab({ language, textSize }: { language: "en" | "ar"; textSize: "normal" | "large" | "extra-large" }) {
  return (
    <div className="space-y-3">
      <h3 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Before and after", "قبل وبعد")}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
          <div className="font-semibold mb-1">{t(language, "Before procedure", "قبل الإجراء")}</div>
          <ul className={`list-disc ltr:ml-4 rtl:mr-4 ${textSizeClass(textSize)}`}>
            <li>{t(language, "Follow fasting instructions if given", "اتبع تعليمات الصوم إن وجدت")}</li>
            <li>{t(language, "Inform staff of allergies", "أبلغ الطاقم بأي حساسية")}</li>
          </ul>
        </div>
        <div className="p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)]">
          <div className="font-semibold mb-1">{t(language, "After procedure", "بعد الإجراء")}</div>
          <ul className={`list-disc ltr:ml-4 rtl:mr-4 ${textSizeClass(textSize)}`}>
            <li>{t(language, "Watch for unexpected bleeding or fever", "راقب أي نزيف أو حمى غير متوقعين")}</li>
            <li>{t(language, "Contact your care team with concerns", "اتصل بفريق الرعاية في حال القلق")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function FaqTab({ language, textSize, faq, openFaq, setOpenFaq }: { language: "en" | "ar"; textSize: "normal" | "large" | "extra-large"; faq: { id: string; questionEn: string; questionAr: string; answerEn: string; answerAr: string }[]; openFaq: string | null; setOpenFaq: (id: string | null) => void }) {
  return (
    <div className="space-y-2">
      <h3 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Common questions", "أسئلة شائعة")}</h3>
      {faq.map((item) => (
        <div key={item.id} className="border border-[var(--wc-border)] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setOpenFaq(openFaq === item.id ? null : item.id)}
            className="w-full flex items-center justify-between p-3 bg-[var(--wc-surface-2)] text-left"
          >
            <span className={`font-semibold ${textSizeClass(textSize)}`}>{language === "ar" ? item.questionAr : item.questionEn}</span>
            {openFaq === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openFaq === item.id && (
            <div className={`p-3 ${textSizeClass(textSize)}`}>{language === "ar" ? item.answerAr : item.answerEn}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function UnderstandingTab({
  language,
  textSize,
  questions,
  answers,
  onAnswer,
  showResults,
  score,
  passed,
  onComplete,
}: {
  language: "en" | "ar";
  textSize: "normal" | "large" | "extra-large";
  questions: { id: string; questionEn: string; questionAr: string; options: { id: string; labelEn: string; labelAr: string }[]; correctOptionId: string }[];
  answers: Record<string, string>;
  onAnswer: (qid: string, oid: string) => void;
  showResults: boolean;
  score: number;
  passed: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Check your understanding", "تحقق من فهمك")}</h3>
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <div className={`font-semibold ${textSizeClass(textSize)}`}>{language === "ar" ? q.questionAr : q.questionEn}</div>
          <div className="space-y-1">
            {q.options.map((opt) => {
              const selected = answers[q.id] === opt.id;
              const isCorrect = opt.id === q.correctOptionId;
              const showCorrect = showResults && isCorrect;
              const showWrong = showResults && selected && !isCorrect;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={showResults}
                  onClick={() => onAnswer(q.id, opt.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                    showCorrect
                      ? "bg-green-50 border-green-300 text-green-800"
                      : showWrong
                        ? "bg-red-50 border-red-300 text-red-800"
                        : selected
                          ? "bg-[var(--wc-blue-soft)] border-[var(--wc-blue-light)]"
                          : "bg-white border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)]"
                  }`}
                >
                  {language === "ar" ? opt.labelAr : opt.labelEn}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!showResults ? (
        <button
          type="button"
          onClick={onComplete}
          disabled={Object.keys(answers).length < questions.length}
          className="px-4 py-2 rounded-lg bg-[var(--wc-navy)] text-white text-sm font-semibold disabled:opacity-40"
        >
          {t(language, "Check answers", "تحقق من الإجابات")}
        </button>
      ) : (
        <div className={`p-3 rounded-lg border ${passed ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
          <div className="font-bold">
            {t(language, `Score: ${score}/${questions.length}`, `النتيجة: ${score}/${questions.length}`)}
          </div>
          <div className="text-sm">
            {passed
              ? t(language, "You passed. You may continue.", "لقد نجحت. يمكنك المتابعة.")
              : t(language, "Review the material and try again.", "راجع المادة وحاول مرة أخرى.")}
          </div>
        </div>
      )}
    </div>
  );
}
