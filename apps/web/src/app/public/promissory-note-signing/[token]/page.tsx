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
        throw new Error(typeof data.error === "string" ? data.error : "╪¬╪╣╪░╪▒ ┘ü╪¬╪¡ ╪¼┘ä╪│╪⌐ ╪º┘ä╪¬┘ê┘é┘è╪╣.");
      }

      setPreview(data as SigningPreview);
      setOtpVerified(Boolean(data.otpVerified));
      setSigned(Boolean(data.signed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "╪¬╪╣╪░╪▒ ┘ü╪¬╪¡ ╪¼┘ä╪│╪⌐ ╪º┘ä╪¬┘ê┘é┘è╪╣.");
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
        throw new Error(typeof data.error === "string" ? data.error : "╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é ╪║┘è╪▒ ╪╡╪¡┘è╪¡.");
      }

      setOtpVerified(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é ╪║┘è╪▒ ╪╡╪¡┘è╪¡.");
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
        throw new Error(typeof data.error === "string" ? data.error : "╪¬╪╣╪░╪▒ ╪¬╪╡╪»┘è┘é ╪º┘ä╪│┘å╪».");
      }

      setSigned(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "╪¬╪╣╪░╪▒ ╪¬╪╡╪»┘è┘é ╪º┘ä╪│┘å╪».");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-xl p-8 text-center">
          <ShieldCheck className="w-10 h-10 text-[#1976D2] mx-auto mb-4" />
          <div className="text-[#002B5C] font-semibold">╪¼╪º╪▒┘è ╪¬╪¡┘à┘è┘ä ╪¼┘ä╪│╪⌐ ╪¬┘ê┘é┘è╪╣ ╪º┘ä╪│┘å╪»...</div>
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
              <h1 className="text-2xl font-semibold text-[#002B5C]">╪¬╪╡╪»┘è┘é ┘ê╪¬┘ê┘é┘è╪╣ ╪º┘ä╪│┘å╪» ┘ä╪ú┘à╪▒</h1>
              <p className="text-sm text-slate-500">┘è╪▒╪¼┘ë ╪º┘ä╪¬╪¡┘é┘é ┘à┘å ╪º┘ä╪¿┘è╪º┘å╪º╪¬ ╪½┘à ╪Ñ╪»╪«╪º┘ä ╪▒┘à╪▓ OTP ╪º┘ä┘à╪▒╪│┘ä ╪Ñ┘ä┘ë ╪¼┘ê╪º┘ä┘â.</p>
            </div>
          </div>
        </div>

        {preview ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="╪▒┘é┘à ╪º┘ä╪│┘å╪»" value={preview.noteNumber} />
              <Info label="╪º╪│┘à ╪º┘ä┘à╪»┘è┘å" value={preview.debtorName} />
              <Info label="╪▒┘é┘à ╪º┘ä┘ç┘ê┘è╪⌐" value={preview.debtorIdNumber || "ΓÇö"} />
              <Info label="╪º┘ä┘à╪¿┘ä╪║" value={`${preview.amount} ${preview.currency}`} />
              <Info label="╪¬╪º╪▒┘è╪« ╪º┘ä╪º╪│╪¬╪¡┘é╪º┘é" value={new Date(preview.dueDate).toLocaleDateString("ar-SA")} />
              <Info label="╪¡╪º┘ä╪⌐ ╪º┘ä╪¬┘ê┘é┘è╪╣" value={signed ? "╪¬┘à ╪º┘ä╪¬┘ê┘é┘è╪╣" : otpVerified ? "╪¬┘à ╪º┘ä╪¬╪¡┘é┘é ┘à┘å OTP" : "╪¿╪º┘å╪¬╪╕╪º╪▒ ╪º┘ä╪¬╪¡┘é┘é"} />
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm leading-7 text-slate-700">
              ╪ú┘é╪▒┘æ ╪¿╪╡┘ü╪¬┘è ╪º┘ä┘à╪»┘è┘å ╪¿╪ú┘å┘å┘è ╪º╪╖┘ä╪╣╪¬ ╪╣┘ä┘ë ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪│┘å╪» ┘ä╪ú┘à╪▒ ╪ú╪╣┘ä╪º┘ç╪î ┘ê╪ú┘ê╪º┘ü┘é ╪╣┘ä┘ë ╪¬╪╡╪»┘è┘é┘ç ┘ê╪¬┘ê┘é┘è╪╣┘ç ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º┘ï ╪╣╪¿╪▒ ┘à┘å╪╡╪⌐ ┘ê╪º╪½┘é ┘â┘è╪▒ ╪¿╪º╪│╪¬╪«╪»╪º┘à ╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é ╪º┘ä┘à╪▒╪│┘ä ╪Ñ┘ä┘ë ╪▒┘é┘à ╪º┘ä╪¼┘ê╪º┘ä ╪º┘ä┘à╪│╪¼┘ä.
            </div>

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {!otpVerified && !signed ? (
              <div className="mt-6">
                <label className="mb-2 block text-sm font-semibold text-slate-700">╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é OTP</label>
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
                  {busy ? "╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘é┘é..." : "╪¬╪¡┘é┘é ┘à┘å ╪º┘ä╪▒┘à╪▓"}
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
                {busy ? "╪¼╪º╪▒┘è ╪º┘ä╪¬╪╡╪»┘è┘é..." : "╪¬╪╡╪»┘è┘é ┘ê╪¬┘ê┘é┘è╪╣ ╪º┘ä╪│┘å╪» ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º┘ï"}
              </button>
            ) : null}

            {signed ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-800">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10" />
                <div className="font-semibold">╪¬┘à ╪¬┘ê┘é┘è╪╣ ╪º┘ä╪│┘å╪» ┘ä╪ú┘à╪▒ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪º┘ï ╪¿┘å╪¼╪º╪¡.</div>
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
