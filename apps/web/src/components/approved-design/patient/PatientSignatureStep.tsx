"use client";

import { Lock, PenTool, ShieldCheck } from "lucide-react";
import { Alert, Card, cls, PatientIdentityCard, type Lang } from "../shared";
import { SignaturePad, type SignaturePadHandle } from "./SignaturePad";

export function PatientSignatureStep({
  lang,
  patientName,
  patientMrn,
  signerName,
  setSignerName,
  padRef,
  hasInk,
  setHasInk,
  onSubmit,
  submitting,
  error,
  mode = "consent",
  onBack,
}: {
  lang: Lang;
  patientName: string;
  patientMrn: string;
  signerName: string;
  setSignerName: (v: string) => void;
  padRef: React.MutableRefObject<SignaturePadHandle | null>;
  hasInk: boolean;
  setHasInk: (v: boolean) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  mode?: "consent" | "refusal";
  onBack?: () => void;
}) {
  const isAr = lang === "ar";
  const isRefusal = mode === "refusal";

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cls(
          "flex flex-col gap-2",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <h1 className="text-2xl font-bold text-[#102c56]">
          {isRefusal
            ? isAr
              ? "توقيع نموذج الرفض"
              : "Sign Refusal Form"
            : isAr
              ? "توقيع الموافقة"
              : "Sign Consent"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isRefusal
            ? isAr
              ? "ارسم توقيعك أدناه لتأكيد قرار الرفض."
              : "Draw your signature below to confirm the refusal."
            : isAr
              ? "أدخل اسمك وارسم توقيعك كما سيظهر في سجل الموافقة الإلكتروني."
              : "Enter your name and draw your signature exactly as it will appear in the electronic consent record."}
        </p>
      </div>

      <Card className="rounded-[24px] border border-[#dbe7f4] bg-[linear-gradient(135deg,#0e2f5a_0%,#184675_100%)] p-4 text-white shadow-[0_24px_50px_rgba(10,31,63,0.16)]">
        <div className={cls("flex items-center gap-3", isAr ? "flex-row-reverse" : "flex-row")}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#f3d792]">
            <PenTool size={20} />
          </div>
          <div className={isAr ? "text-right" : "text-left"}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
              {isAr ? "التوقيع الإلكتروني" : "Electronic signature"}
            </p>
            <p className="mt-1 text-sm leading-7 text-white/85">
              {isRefusal
                ? isAr
                  ? "سيتم ربط توقيع الرفض بجلسة التحقق الحالية وسجل المراجعة القانوني."
                  : "The refusal signature will be linked to the current verification session and legal audit trail."
                : isAr
                  ? "سيتم ربط هذا التوقيع بجلسة OTP الحالية والوثيقة المعتمدة وسجل المراجعة."
                  : "This signature will be linked to the current OTP session, approved document, and audit trail."}
            </p>
          </div>
        </div>
      </Card>

      <div className="rounded-[20px] border border-[#dbe7f4] bg-white p-1.5 shadow-[0_12px_28px_rgba(12,39,74,0.05)]">
        <PatientIdentityCard lang={lang} name={patientName} mrn={patientMrn} />
      </div>

      <Card className="rounded-[24px] border border-[#dbe7f4] p-4 shadow-[0_18px_36px_rgba(12,39,74,0.06)]">
        <div className="flex flex-col gap-4">
          <div>
            <label
              className={cls(
                "text-xs font-semibold uppercase tracking-wide text-[#4f78a6]",
                isAr ? "text-right" : "text-left",
              )}
            >
              {isAr ? "الاسم الكامل للموقّع" : "Signer full name"}
            </label>
            <input
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={isAr ? "أدخل اسمك الكامل" : "Enter full name"}
              className="mt-2 w-full rounded-[16px] border-2 border-[#dbe7f4] bg-white px-4 py-3 text-sm text-foreground focus:border-[#1f5fae] focus:outline-none"
            />
          </div>

          <div className={cls("flex items-center gap-2 text-xs text-slate-500", isAr ? "flex-row-reverse" : "flex-row")}>
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>
              {isAr
                ? "تأكد من أن التوقيع واضح ويطابق اسمك كما هو مسجل لدى المنشأة."
                : "Ensure the signature is clear and matches your registered name with the facility."}
            </span>
          </div>

          <SignaturePad lang={lang} padRef={padRef} onChange={setHasInk} />
        </div>
      </Card>

      {hasInk ? (
        <button
          type="button"
          onClick={() => padRef.current?.clear()}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline self-center"
        >
          {isAr ? "مسح التوقيع" : "Clear signature"}
        </button>
      ) : null}

      <div
        className={cls(
          "flex items-start gap-2 rounded-[18px] border border-[#dbe7f4] bg-[#f8fbff] p-3 text-xs text-slate-600",
          isAr ? "flex-row-reverse text-right" : "flex-row",
        )}
      >
        <Lock size={12} className="shrink-0 mt-0.5" />
        <span>
          {isAr
            ? "توقيعك مرتبط ببصمة OTP وسلسلة مراجعة قانونية."
            : "Your signature is bound to the OTP hash and a legal audit chain."}
        </span>
      </div>

      {error ? <Alert type="warning" lang={lang}>{error}</Alert> : null}

      <div className="flex flex-col gap-2 mt-auto">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="w-full rounded-[18px] border border-[#dbe7f4] py-3 text-sm font-semibold text-foreground transition-colors hover:bg-slate-50"
          >
            {isAr ? "رجوع" : "Back"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !hasInk || !signerName.trim()}
          className={cls(
            "w-full rounded-[18px] py-4 text-sm font-semibold transition-colors",
            submitting || !hasInk || !signerName.trim()
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : isRefusal
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-[#1f5fae] text-white hover:bg-[#184d90] shadow-[0_16px_28px_rgba(31,95,174,0.24)]",
          )}
        >
          {submitting
            ? isAr
              ? "جارٍ التسجيل…"
              : "Submitting…"
            : isRefusal
              ? isAr
                ? "تأكيد الرفض"
                : "Confirm Refusal"
              : isAr
                ? "تأكيد التوقيع"
                : "Confirm Signature"}
        </button>
      </div>
    </div>
  );
}
