"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  DynamicConsentSectionMeta,
  PatientEducationUnderstandingQuestion,
} from "@/modules/consent-engine/engine/types";

interface Props {
  titleEn: string;
  titleAr: string;
  questions: PatientEducationUnderstandingQuestion[];
  scoring: NonNullable<DynamicConsentSectionMeta["scoring"]>;
  /** Optional callback fired when the patient submits the check. */
  onResult?: (result: {
    scorePct: number;
    passed: boolean;
    answers: Record<string, string>;
    correctIds: string[];
  }) => void;
}

/**
 * Phase 2.2 UNDERSTANDING_CHECK — short scored comprehension quiz. One
 * question rendered at a time on mobile; Submit disabled until every
 * question is answered. On submission the score is computed locally and a
 * pass/fail summary with rationales is shown. If failed, the remediation
 * note is surfaced.
 */
export default function UnderstandingCheck({
  titleEn,
  titleAr,
  questions,
  scoring,
  onResult,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const totalWeight = useMemo(
    () => questions.reduce((sum, q) => sum + q.weight, 0),
    [questions],
  );

  const result = useMemo(() => {
    const correctIds = questions
      .filter((q) => answers[q.id] === q.correctOption)
      .map((q) => q.id);
    const earned = questions
      .filter((q) => correctIds.includes(q.id))
      .reduce((sum, q) => sum + q.weight, 0);
    const scorePct = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);
    const passed = scorePct >= scoring.passingScore;
    return { scorePct, passed, correctIds };
  }, [answers, questions, scoring.passingScore, totalWeight]);

  const allAnswered = Object.keys(answers).length === questions.length;

  const handleSelect = useCallback(
    (questionId: string, optionKey: string) => {
      setAnswers((prev) => ({ ...prev, [questionId]: optionKey }));
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    onResult?.({ ...result, answers });
  }, [answers, onResult, result]);

  const handleRetry = useCallback(() => {
    setAnswers({});
    setSubmitted(false);
  }, []);

  return (
    <article
      data-section-kind="UNDERSTANDING_CHECK"
      className="rounded-3xl border border-amber-200 bg-white p-5 shadow-sm"
    >
      <header className="mb-3 flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
          Understanding Check / تقييم الفهم
        </span>
        <h2 className="text-lg font-semibold text-slate-900">{titleEn}</h2>
        <h3 className="text-base font-semibold text-slate-800" dir="rtl">
          {titleAr}
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Passing score: {scoring.passingScore}% — Max: {scoring.maxScore} pts
        </p>
      </header>

      <ol className="space-y-4">
        {questions.map((q, index) => {
          const selected = answers[q.id];
          const isCorrect = submitted && selected === q.correctOption;
          const isWrong = submitted && selected !== undefined && selected !== q.correctOption;
          return (
            <li
              key={q.id}
              className={`rounded-2xl border p-4 ${
                isCorrect
                  ? "border-emerald-300 bg-emerald-50"
                  : isWrong
                    ? "border-rose-300 bg-rose-50"
                    : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Q{index + 1} · weight {q.weight}
              </div>
              <p className="text-sm font-medium text-slate-900">{q.en.question}</p>
              <p className="text-sm font-medium text-slate-800" dir="rtl">
                {q.ar.question}
              </p>
              <div className="mt-3 grid gap-2">
                {Object.entries(q.en.options).map(([key, label]) => {
                  const arLabel = q.ar.options[key] ?? "";
                  const isSelected = selected === key;
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${
                        isSelected
                          ? "border-sky-400 bg-white"
                          : "border-slate-200 bg-white hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`uq-${q.id}`}
                        value={key}
                        checked={isSelected}
                        disabled={submitted}
                        onChange={() => handleSelect(q.id, key)}
                        className="mt-1"
                      />
                      <span className="flex flex-1 flex-col">
                        <span className="font-medium text-slate-900">
                          {key}. {label}
                        </span>
                        <span className="text-slate-700" dir="rtl">
                          {key}. {arLabel}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {submitted && (q.rationaleEn || q.rationaleAr) ? (
                <div className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-700">
                  {q.rationaleEn ? <p>{q.rationaleEn}</p> : null}
                  {q.rationaleAr ? (
                    <p className="mt-1" dir="rtl">
                      {q.rationaleAr}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {submitted ? (
          <>
            <div
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                result.passed ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
              }`}
            >
              Score: {result.scorePct}% — {result.passed ? "PASS" : "FAIL"}
            </div>
            {!result.passed ? (
              <p className="max-w-md text-xs text-rose-700">{scoring.remediationOnFail}</p>
            ) : null}
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Retry
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={!allAnswered}
            onClick={handleSubmit}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            Submit Understanding Check
          </button>
        )}
      </div>
    </article>
  );
}
