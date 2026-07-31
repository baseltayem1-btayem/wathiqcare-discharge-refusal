"use client";

import { cls, type Lang } from "../shared";
import {
  PATIENT_DECLARATION_KEYS,
  type PatientDeclarationKey,
} from "@/lib/server/patient-declarations-service";

/**
 * Patient declarations panel — the single reusable implementation of the
 * seven explicit, auditable declarations required on the routine electronic
 * signing path. Keys MUST stay in sync with PATIENT_DECLARATION_KEYS in
 * src/lib/server/patient-declarations-service.ts (the server remains
 * authoritative and rejects missing/incomplete declarations).
 */
export const PATIENT_DECLARATION_ITEMS: Array<{
  key: PatientDeclarationKey;
  labelAr: string;
  labelEn: string;
}> = [
  {
    key: "IDENTITY_AND_CAPACITY",
    labelAr: "أقرّ بصحة هويتي وأهليتي أو صفة التوقيع.",
    labelEn:
      "I confirm that my identity and signing capacity or authority are correct.",
  },
  {
    key: "INFORMATION_REVIEWED",
    labelAr: "لقد راجعت المعلومات المقدمة لي.",
    labelEn: "I have reviewed the information provided to me.",
  },
  {
    key: "PROCEDURE_RISKS_ALTERNATIVES_UNDERSTOOD",
    labelAr: "فهمت طبيعة الإجراء ومخاطره الجوهرية ومضاعفاته وبدائله.",
    labelEn:
      "I understood the nature of the procedure, its material risks, complications, and alternatives.",
  },
  {
    key: "QUESTIONS_OPPORTUNITY",
    labelAr: "أُتيحت لي فرصة كافية لطرح الأسئلة.",
    labelEn: "I was given an adequate opportunity to ask questions.",
  },
  {
    key: "ANSWERS_RECEIVED",
    labelAr: "تلقيت الإجابات والتوضيحات عن أسئلتي.",
    labelEn: "I received answers and clarifications to my questions.",
  },
  {
    key: "VOLUNTARY_NO_COERCION",
    labelAr: "قراري طوعي ودون أي إكراه.",
    labelEn: "My decision is voluntary and without coercion.",
  },
  {
    key: "ELECTRONIC_SIGNATURE_ACCEPTED",
    labelAr: "أوافق على اعتماد توقيعي الإلكتروني كتوقيع لي وتعبير عن إرادتي.",
    labelEn:
      "I accept my electronic signature as my signature and expression of intent.",
  },
];

/** True only when every required declaration key has been accepted. */
export function allDeclarationsAccepted(accepted: string[]): boolean {
  return PATIENT_DECLARATION_KEYS.every((key) => accepted.includes(key));
}

/**
 * Payload sent to POST /api/public-signing/document/[token]/sign.
 * On the refusal path declarations are not required (the server skips
 * declaration validation for refused consents) — send an empty list.
 */
export function buildDeclarationsPayload(
  accepted: string[],
  mode: "consent" | "refusal",
): string[] {
  if (mode === "refusal") return [];
  const known = PATIENT_DECLARATION_KEYS as readonly string[];
  return accepted.filter((key) => known.includes(key));
}

export function PatientDeclarationsPanel({
  lang,
  accepted,
  onChange,
  disabled = false,
  error = null,
}: {
  lang: Lang;
  accepted: string[];
  onChange: (accepted: string[]) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const isAr = lang === "ar";

  const toggle = (key: string) => {
    if (disabled) return;
    onChange(
      accepted.includes(key)
        ? accepted.filter((k) => k !== key)
        : [...accepted, key],
    );
  };

  return (
    <fieldset className="rounded-[24px] border border-[#dbe7f4] bg-white p-4 shadow-[0_18px_36px_rgba(12,39,74,0.06)]">
      <legend
        className={cls(
          "px-1 text-xs font-semibold uppercase tracking-wide text-[#4f78a6]",
          isAr ? "text-right" : "text-left",
        )}
      >
        {isAr ? "إقرارات المريض" : "Patient declarations"}
      </legend>
      <p
        className={cls(
          "mt-2 text-xs leading-6 text-slate-500",
          isAr ? "text-right" : "text-left",
        )}
      >
        {isAr
          ? "يجب الموافقة على جميع الإقرارات قبل تأكيد التوقيع."
          : "All declarations must be accepted before confirming your signature."}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {PATIENT_DECLARATION_ITEMS.map((item) => {
          const id = `patient-declaration-${item.key}`;
          const checked = accepted.includes(item.key);
          return (
            <label
              key={item.key}
              htmlFor={id}
              dir={isAr ? "rtl" : "ltr"}
              className={cls(
                "flex items-start gap-3 rounded-[16px] border p-3 text-sm leading-6 transition-colors",
                checked
                  ? "border-[#1f5fae] bg-[#f0f6fd]"
                  : "border-[#dbe7f4] bg-white",
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:border-[#9fc3e8]",
                isAr ? "text-right" : "text-left",
              )}
            >
              <input
                id={id}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(item.key)}
                className="mt-1 h-4 w-4 shrink-0 accent-[#1f5fae]"
              />
              <span className="text-slate-700">
                {isAr ? item.labelAr : item.labelEn}
              </span>
            </label>
          );
        })}
      </div>

      {error ? (
        <p
          role="alert"
          className={cls(
            "mt-3 text-xs font-semibold text-red-600",
            isAr ? "text-right" : "text-left",
          )}
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
