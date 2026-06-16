"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

type SigningPreview = {
  noteNumber: string;
  debtorName: string;
  debtorIdNumber: string | null;
  amount: string;
  currency: string;
  dueDate: string;
  status: string;
  expiresAt: string;
  otpVerified: boolean;
  signed: boolean;
};

export default function PublicPromissoryNoteSigningPage() {
  const { token } = useParams<{ token: string }>();

  const [preview, setPreview] = useState<SigningPreview | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [signed, setSigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async function loadPreview() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/promissory-note-signing/${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "تعذر فتح جلسة التوقيع.");
      }

      setPreview(data as SigningPreview);
      setOtpVerified(Boolean(data.otpVerified));
      setSigned(Boolean(data.signed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر فتح جلسة التوقيع.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      void loadPreview();
    }
  }, [token, loadPreview]);

  async function verifyOtp() {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/promissory-note-signing/${encodeURIComponent(token)}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpCode }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "رمز التحقق غير صحيح.");
      }

      setOtpVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "رمز التحقق غير صحيح.");
    } finally {
      setBusy(false);
    }
  }

  async function signNote() {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/promissory-note-signing/${encodeURIComponent(token)}/sign`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "تعذر تصديق السند.");
      }

      setSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تصديق السند.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-[#1976D2] mx-auto mb-4" />
          <div className="text-[#002B5C] font-semibold">جاري تحميل جلسة توقيع السند...</div>
        </div>
      </main>
    );
  }

  if (error && !preview) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg rounded-3xl bg-white border border-red-200 shadow-xl p-8 text-center">
          <div className="text-red-700 font-semibold">{error}</div>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[#1976D2]">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#002B5C]">تصديق وتوقيع السند لأمر</h1>
              <p className="text-sm text-slate-500">يرجى التحقق من البيانات ثم إدخال رمز OTP المرسل إلى جوالك.</p>
            </div>
          </div>
        </div>

        {preview ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="رقم السند" value={preview.noteNumber} />
              <Info label="اسم المدين" value={preview.debtorName} />
              <Info label="رقم الهوية" value={preview.debtorIdNumber || "—"} />
              <Info label="المبلغ" value={`${preview.amount} ${preview.currency}`} />
              <Info label="تاريخ الاستحقاق" value={new Date(preview.dueDate).toLocaleDateString("ar-SA")} />
              <Info label="حالة التوقيع" value={signed ? "تم التوقيع" : otpVerified ? "تم التحقق من OTP" : "بانتظار التحقق"} />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm leading-7 text-slate-700">
              أقرّ بصفتي المدين بأنني اطلعت على بيانات السند لأمر أعلاه، وأوافق على تصديقه وتوقيعه إلكترونياً عبر منصة واثق كير باستخدام رمز التحقق المرسل إلى رقم الجوال المسجل.
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!otpVerified && !signed ? (
              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">رمز التحقق OTP</label>
                <input
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.35em] outline-none focus:border-[#1976D2] focus:ring-4 focus:ring-blue-100"
                  placeholder="------"
                />

                <button
                  onClick={verifyOtp}
                  disabled={busy || otpCode.length !== 6}
                  className="mt-4 w-full rounded-2xl bg-[#002B5C] px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                >
                  {busy ? "جاري التحقق..." : "تحقق من الرمز"}
                </button>
              </div>
            ) : null}

            {otpVerified && !signed ? (
              <button
                onClick={signNote}
                disabled={busy}
                className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                {busy ? "جاري التصديق..." : "تصديق وتوقيع السند إلكترونياً"}
              </button>
            ) : null}

            {signed ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10" />
                <div className="font-semibold">تم توقيع السند لأمر إلكترونياً بنجاح.</div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#002B5C]">{value}</div>
    </div>
  );
}