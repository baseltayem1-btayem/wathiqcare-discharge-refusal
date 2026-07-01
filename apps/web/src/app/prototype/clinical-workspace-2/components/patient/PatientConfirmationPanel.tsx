"use client";

import { CheckCircle2, FileX, FileDown, Clock } from "lucide-react";
import type { PatientJourneyContext, PatientJourneyState } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";

interface PatientConfirmationPanelProps {
  context: PatientJourneyContext;
  journey: PatientJourneyState;
}

export function PatientConfirmationPanel({ context, journey }: PatientConfirmationPanelProps) {
  const { language, textSize, highContrast } = journey.accessibility;
  const patientSignature = journey.signatures.find((s) => s.role === "patient");
  const isRefused = journey.decision === "refused";

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="text-center space-y-3">
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${isRefused ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
          {isRefused ? <FileX className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        </div>
        <h2 className={`font-extrabold ${headingSizeClass(textSize)}`}>
          {t(language, isRefused ? "Refusal recorded" : "Consent completed", isRefused ? "تم تسجيل الرفض" : "اكتملت الموافقة")}
        </h2>
        <p className={textSizeClass(textSize)}>
          {t(
            language,
            isRefused
              ? "Your decision has been documented. Your care team will discuss alternatives with you."
              : "Thank you. Your consent has been recorded securely.",
            isRefused
              ? "تم توثيق قرارك. سيناقش فريق الرعاية البدائل معك."
              : "شكراً لك. تم تسجيل موافقتك بأمان.",
          )}
        </p>
      </div>

      <div className="p-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] space-y-2">
        <InfoRow label={t(language, "Reference", "المرجع")} value={context.consentReference} />
        <InfoRow label={t(language, "Patient", "المريض")} value={`${context.patientName} (${context.mrn})`} />
        <InfoRow label={t(language, "Procedure", "الإجراء")} value={context.procedureName} />
        <InfoRow label={t(language, "Decision", "القرار")} value={t(language, isRefused ? "Refused" : "Accepted", isRefused ? "مرفوض" : "موافق")} />
        <InfoRow label={t(language, "Signed by", "وقع بواسطة")} value={patientSignature?.signerName ?? context.patientName} />
        <InfoRow
          label={t(language, "Timestamp", "الوقت")}
          value={patientSignature ? new Date(patientSignature.signedAt).toLocaleString(language) : "—"}
        />
        <InfoRow
          label={t(language, "Evidence hash", "هاش الدليل")}
          value={`sha256-${(patientSignature?.signedAt ?? context.consentReference).slice(-16)}`}
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-[var(--wc-text-muted)]">
        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
        <span>{t(language, "A copy has been saved to your clinical record. You can download your patient copy below.", "تم حفظ نسخة في سجلك الطبي. يمكنك تنزيل نسختك أدناه.")}</span>
      </div>

      <button
        type="button"
        disabled
        className="w-full py-3 rounded-lg border border-[var(--wc-border)] bg-white text-[var(--wc-text)] font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        <FileDown className="w-5 h-5" /> {t(language, "Download patient copy (mock)", "تنزيل نسخة المريض (محاكاة)")}
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-[var(--wc-text-muted)]">{label}</span>
      <span className="font-semibold text-right">{value}</span>
    </div>
  );
}
