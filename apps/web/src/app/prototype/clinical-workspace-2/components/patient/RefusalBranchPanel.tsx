"use client";

import { useState } from "react";
import { AlertTriangle, PenLine, FileX } from "lucide-react";
import type { PatientJourneyContext, PatientJourneyState, SignatureRecord } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { AccessibilityControls } from "./AccessibilityControls";

interface RefusalBranchPanelProps {
  context: PatientJourneyContext;
  journey: PatientJourneyState;
  onAcknowledge: () => void;
  onSign: (signature: SignatureRecord) => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function RefusalBranchPanel({
  context,
  journey,
  onAcknowledge,
  onSign,
  onAccessibilityChange,
}: RefusalBranchPanelProps) {
  const { language, textSize, highContrast } = journey.accessibility;
  const [acknowledged, setAcknowledged] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signerName, setSignerName] = useState(context.patientName);

  if (!acknowledged) {
    return (
      <div className={`max-w-2xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
        <div className="flex items-center justify-between">
          <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Refusal acknowledgment", "إقرار الرفض")}</h2>
          <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />
        </div>
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-900">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div className={textSizeClass(textSize)}>
              {t(language, `I understand that refusing ${context.procedureName} may result in worsening of my condition or limited treatment options. I have discussed this with ${context.physicianName}.`, `أفهم أن رفض ${context.procedureName} قد يؤدي إلى تفاقم حالتي أو خيارات علاج محدودة. لقد ناقشت هذا مع ${context.physicianName}.`)}
            </div>
          </div>
        </div>
        <label className="flex items-start gap-3 p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 w-4 h-4 accent-[var(--wc-blue)]"
          />
          <span className={textSizeClass(textSize)}>
            {t(language, "I acknowledge the consequences of refusal.", "أقر بعواقب الرفض.")}
          </span>
        </label>
        <button
          type="button"
          onClick={() => {
            setAcknowledged(true);
            onAcknowledge();
          }}
          disabled={!acknowledged}
          className="w-full py-3 rounded-lg bg-red-700 text-white font-bold disabled:opacity-40"
        >
          {t(language, "Continue to refusal signature", "المتابعة إلى توقيع الرفض")}
        </button>
      </div>
    );
  }

  if (!signed) {
    return (
      <div className={`max-w-2xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
        <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Refusal signature", "توقيع الرفض")}</h2>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder={t(language, "Full name", "الاسم الكامل")}
          className="w-full p-2.5 rounded-lg border border-[var(--wc-border)] text-sm"
        />
        <div className={`p-4 rounded-lg border border-dashed border-red-300 bg-red-50 text-red-900 text-center ${textSizeClass(textSize)}`}>
          <PenLine className="w-6 h-6 mx-auto mb-2" />
          {t(language, "Tap below to capture refusal signature (simulated).", "اضغط أدناه لالتقاط توقيع الرفض (محاكاة).")}
        </div>
        <button
          type="button"
          onClick={() => {
            const record: SignatureRecord = {
              role: "patient",
              signerName,
              signedAt: new Date().toISOString(),
              signatureData: "data:image/png;base64,REFUSAL_MOCK",
            };
            setSigned(true);
            onSign(record);
          }}
          disabled={!signerName}
          className="w-full py-3 rounded-lg bg-red-700 text-white font-bold disabled:opacity-40"
        >
          {t(language, "Sign refusal", "وقع الرفض")}
        </button>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto space-y-6 text-center ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-700">
        <FileX className="w-8 h-8" />
      </div>
      <h2 className={`font-extrabold ${headingSizeClass(textSize)}`}>{t(language, "Refusal recorded", "تم تسجيل الرفض")}</h2>
      <p className={textSizeClass(textSize)}>
        {t(language, "Your decision has been documented. Your care team will discuss alternatives with you.", "تم توثيق قرارك. سيناقش فريق الرعاية البدائل معك.")}
      </p>
      <div className="p-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] text-sm text-left space-y-2">
        <InfoRow label={t(language, "Reference", "المرجع")} value={context.consentReference} />
        <InfoRow label={t(language, "Decision", "القرار")} value={t(language, "Refused", "مرفوض")} />
        <InfoRow label={t(language, "Signed by", "وقع بواسطة")} value={signerName} />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[var(--wc-text-muted)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
