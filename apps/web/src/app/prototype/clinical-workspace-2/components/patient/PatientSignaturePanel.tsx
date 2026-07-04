"use client";

import { useRef, useEffect, useState } from "react";
import { PenLine, UserCheck } from "lucide-react";
import type { PatientJourneyContext, PatientJourneyState, SignatureRole, SignatureRecord } from "../../types/workspace";
import { t, textSizeClass, headingSizeClass } from "../../lib/i18n-helpers";
import { AccessibilityControls } from "./AccessibilityControls";

interface PatientSignaturePanelProps {
  context: PatientJourneyContext;
  journey: PatientJourneyState;
  onSign: (signature: SignatureRecord) => void;
  onRequestOtp: () => void;
  onAccessibilityChange: (accessibility: Partial<PatientJourneyState["accessibility"]>) => void;
}

export function PatientSignaturePanel({
  context,
  journey,
  onSign,
  onRequestOtp,
  onAccessibilityChange,
}: PatientSignaturePanelProps) {
  const { language, textSize, highContrast } = journey.accessibility;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signed, setSigned] = useState(false);
  const [role, setRole] = useState<SignatureRole>("patient");
  const [signerName, setSignerName] = useState(context.patientName);
  const [relationship, setRelationship] = useState("");

  useEffect(() => {
    if (!canvasRef.current || signed) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = highContrast ? "#ffffff" : "#0F172A";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, 80);
    ctx.bezierCurveTo(70, 50, 120, 110, 180, 70);
    ctx.bezierCurveTo(240, 40, 260, 100, 320, 80);
    ctx.stroke();
  }, [signed, highContrast]);

  const handleSign = () => {
    const dataUrl = canvasRef.current?.toDataURL() ?? "";
    const record: SignatureRecord = {
      role,
      signerName,
      relationship: role === "guardian" || role === "interpreter" ? relationship : undefined,
      signedAt: new Date().toISOString(),
      signatureData: dataUrl,
    };
    setSigned(true);
    onSign(record);
  };

  const roles: { value: SignatureRole; labelEn: string; labelAr: string }[] = [
    { value: "patient", labelEn: "Patient", labelAr: "المريض" },
    { value: "guardian", labelEn: "Guardian / Representative", labelAr: "ولي الأمر / الممثل" },
    { value: "witness", labelEn: "Witness", labelAr: "الشاهد" },
    { value: "interpreter", labelEn: "Interpreter", labelAr: "المترجم" },
  ];

  return (
    <div className={`max-w-2xl mx-auto space-y-5 ${highContrast ? "bg-black text-white p-6 rounded-xl" : ""}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-bold ${headingSizeClass(textSize)}`}>{t(language, "Signature", "التوقيع")}</h2>
        <AccessibilityControls accessibility={journey.accessibility} onChange={onAccessibilityChange} />
      </div>

      {!journey.otpVerified && (
        <div className="p-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] text-center">
          <p className={textSizeClass(textSize)}>{t(language, "To protect your identity, please verify the OTP sent to your mobile.", "لحماية هويتك، يرجى التحقق من رمز التحقق المرسل إلى هاتفك.")}</p>
          <button
            type="button"
            onClick={onRequestOtp}
            className="mt-2 px-4 py-2 rounded-lg bg-[var(--wc-navy)] text-white text-sm font-semibold"
          >
            {t(language, "Verify OTP", "التحقق من الرمز")}
          </button>
        </div>
      )}

      <div className="space-y-2">
        <label className={`text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)] ${textSizeClass(textSize)}`}>
          {t(language, "Signing as", "التوقيع بصفتي")}
        </label>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                role === r.value
                  ? "bg-[var(--wc-navy)] text-white border-[var(--wc-navy)]"
                  : "bg-white text-[var(--wc-text)] border-[var(--wc-border)] hover:bg-[var(--wc-surface-2)]"
              }`}
            >
              {language === "ar" ? r.labelAr : r.labelEn}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">{t(language, "Full name", "الاسم الكامل")}</label>
        <input
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          className="w-full p-2.5 rounded-lg border border-[var(--wc-border)] text-sm"
        />
      </div>

      {(role === "guardian" || role === "interpreter") && (
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">
            {t(language, "Relationship / Language", "العلاقة / اللغة")}
          </label>
          <input
            type="text"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder={role === "guardian" ? t(language, "e.g. Parent", "مثال: والد") : t(language, "e.g. Arabic", "مثال: العربية")}
            className="w-full p-2.5 rounded-lg border border-[var(--wc-border)] text-sm"
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--wc-text-muted)]">{t(language, "Signature", "التوقيع")}</label>
        <canvas
          ref={canvasRef}
          width={400}
          height={160}
          className={`w-full rounded-lg border border-[var(--wc-border)] ${highContrast ? "bg-black border-white" : "bg-[var(--wc-surface-2)]"}`}
        />
        <div className="text-xs text-[var(--wc-text-muted)]">{t(language, "Draw your signature above.", "ارسم توقيعك أعلاه.")}</div>
      </div>

      <div className="flex items-start gap-2 text-xs text-[var(--wc-text-muted)]">
        <UserCheck className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          {t(language, "By signing, you confirm that you have read and understood the consent and agree voluntarily.", "بالتوقيع، تؤكد أنك قرأت وفهمت الموافقة وتوافق طوعاً.")}
        </span>
      </div>

      <button
        type="button"
        onClick={handleSign}
        disabled={!journey.otpVerified || signed || !signerName}
        className="w-full py-3 rounded-lg bg-green-700 text-white font-bold text-base disabled:opacity-40"
      >
        <PenLine className="w-5 h-5 inline-block align-text-bottom mr-1" />
        {signed ? t(language, "Signed", "تم التوقيع") : t(language, "Sign consent", "وقع الموافقة")}
      </button>
    </div>
  );
}
