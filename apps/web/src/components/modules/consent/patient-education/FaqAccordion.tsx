"use client";

import { useCallback, useState } from "react";
import type { PatientEducationFaqItem } from "@/modules/consent-engine/engine/types";

interface Props {
  titleEn: string;
  titleAr: string;
  items: PatientEducationFaqItem[];
  /** Optional callback invoked when a FAQ item is opened. */
  onItemViewed?: (id: string) => void;
}

/**
 * Bilingual FAQ accordion (Phase 2.2). Client component — tracks which items
 * the patient opens so the parent can stream the IDs to the evidence
 * package (`faqViewedItems[]`).
 */
export default function FaqAccordion({ titleEn, titleAr, items, onItemViewed }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const handleToggle = useCallback(
    (id: string) => {
      setOpenId((prev) => {
        const next = prev === id ? null : id;
        if (next === id) {
          onItemViewed?.(id);
        }
        return next;
      });
    },
    [onItemViewed],
  );

  return (
    <article
      data-section-kind="FAQ"
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <header className="mb-3 flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          FAQ / الأسئلة الشائعة
        </span>
        <h2 className="text-lg font-semibold text-slate-900">{titleEn}</h2>
        <h3 className="text-base font-semibold text-slate-800" dir="rtl">
          {titleAr}
        </h3>
      </header>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => {
          const isOpen = openId === item.id;
          return (
            <li key={item.id} className="py-2">
              <button
                type="button"
                aria-controls={`faq-panel-${item.id}`}
                onClick={() => handleToggle(item.id)}
                className="flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50"
              >
                <span className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-slate-900">{item.en.question}</span>
                  <span className="text-sm font-medium text-slate-700" dir="rtl">
                    {item.ar.question}
                  </span>
                </span>
                <span aria-hidden className="mt-1 text-slate-500">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen ? (
                <div
                  id={`faq-panel-${item.id}`}
                  className="mt-1 grid gap-3 rounded-2xl bg-slate-50 px-4 py-3 md:grid-cols-2"
                >
                  <p className="text-sm leading-6 text-slate-700">{item.en.answer}</p>
                  <p className="text-sm leading-7 text-slate-800" dir="rtl">
                    {item.ar.answer}
                  </p>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </article>
  );
}
