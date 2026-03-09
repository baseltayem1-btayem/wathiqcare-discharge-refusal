"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { apiFetch } from "@/utils/api";

type MethodItem = {
  method: "SMS_OTP" | "NAFATH" | "TABLET_SIGNATURE";
  available: boolean;
  label_ar: string;
  reason?: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  SMS_OTP: "رسالة نصية",
  NAFATH: "نفاذ",
  TABLET_SIGNATURE: "توقيع على الجهاز اللوحي",
};

const CONSENT_FALLBACK_HTML = `
  <div style="font-family: Arial, sans-serif; line-height: 1.7; color: #0f172a;">
    <h2 style="margin: 0 0 8px;">Informed Consent</h2>
    <p style="margin: 0 0 10px;">الموافقة المستنيرة</p>
    <p>أقر أنا/ولي أمر المريض أنني استلمت شرحاً واضحاً عن الخطة العلاجية والفوائد والمخاطر والبدائل، وتمت الإجابة على جميع الاستفسارات قبل التوقيع.</p>
    <p>I acknowledge that the treatment plan, benefits, risks, and alternatives were explained clearly and all questions were answered before signing.</p>
  </div>
`;

export default function InformedConsentPage() {
  const params = useParams<{ id: string }>();
  const caseId = params?.id || "";

  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [method, setMethod] = useState<MethodItem["method"]>("SMS_OTP");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [signaturePayload, setSignaturePayload] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [nafathStatus, setNafathStatus] = useState("pending");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("بانتظار التحقق");
  const [debugCode, setDebugCode] = useState("");
  const [previewHtml, setPreviewHtml] = useState(CONSENT_FALLBACK_HTML);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!caseId) {
      return;
    }

    void apiFetch<{ methods: MethodItem[] }>(`/api/discharge/cases/${caseId}/acknowledgment/methods`)
      .then((res) => {
        setMethods(res.methods || []);
        const firstAvailable = (res.methods || []).find((item) => item.available);
        if (firstAvailable) {
          setMethod(firstAvailable.method);
        }
      })
      .catch((err: Error) => setMessage(err.message));

    // Fallback HTML is used until informed-consent backend template is fully wired.
    void apiFetch<{ html_content: string }>(`/api/discharge/cases/${caseId}/workflow/preview`, {
      method: "POST",
      body: JSON.stringify({ template_key: "informed_consent", payload: {} }),
    })
      .then((res) => {
        if (res?.html_content) {
          setPreviewHtml(res.html_content);
        }
      })
      .catch(() => {
        setPreviewHtml(CONSENT_FALLBACK_HTML);
      });
  }, [caseId]);

  const selectedMethod = useMemo(() => methods.find((item) => item.method === method), [methods, method]);

  const startFlow = async () => {
    setMessage("");

    try {
      const payload: Record<string, unknown> = {};
      if (method === "SMS_OTP") {
        payload.phone_number = phoneNumber;
      }
      if (method === "TABLET_SIGNATURE") {
        payload.witness_name = witnessName;
      }

      const res = await apiFetch<{
        session_id: string;
        verification_status: string;
        provider_result?: { otp_debug_code?: string };
      }>(`/api/discharge/cases/${caseId}/acknowledgment/start`, {
        method: "POST",
        body: JSON.stringify({
          document_type: "informed_consent",
          method,
          payload,
        }),
      });

      setSessionId(res.session_id);
      setStatus(res.verification_status === "verified" ? "تم التحقق" : "بانتظار التحقق");
      if (res.provider_result?.otp_debug_code) {
        setDebugCode(res.provider_result.otp_debug_code);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تعذر بدء جلسة التوقيع.");
    }
  };

  const verifyFlow = async () => {
    if (!sessionId) {
      setMessage("ابدأ العملية أولاً");
      return;
    }

    setMessage("");
    try {
      const payload: Record<string, unknown> = {};
      if (method === "SMS_OTP") {
        payload.otp_code = otpCode;
      }
      if (method === "NAFATH") {
        payload.nafath_status = nafathStatus;
      }
      if (method === "TABLET_SIGNATURE") {
        payload.signature_payload = signaturePayload;
        payload.witness_name = witnessName;
      }

      const res = await apiFetch<{ verification_status: string }>(
        `/api/discharge/cases/${caseId}/acknowledgment/${sessionId}/verify`,
        {
          method: "POST",
          body: JSON.stringify({ payload }),
        },
      );

      setStatus(res.verification_status === "verified" ? "تم التحقق" : "بانتظار التحقق");
      if (res.verification_status === "verified") {
        setMessage("تم إكمال الموافقة المستنيرة بنجاح.");
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "تعذر التحقق من التوقيع.");
    }
  };

  return (
    <AuthGuard>
      <AppShell
        title="Informed Consent"
        subtitle="الموافقة المستنيرة - التوقيع الإلكتروني"
        actions={
          <Link href={`/cases/${caseId}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            العودة إلى الحالة
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">النص الرسمي المعتمد</h2>
            <div className="mt-3 max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">طريقة الإقرار / التوقيع</h2>
            <div className="mt-3 grid gap-2">
              {methods.map((item) => (
                <label key={item.method} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{METHOD_LABELS[item.method] || item.label_ar}</span>
                  <input
                    type="radio"
                    name="method"
                    checked={method === item.method}
                    disabled={!item.available}
                    onChange={() => setMethod(item.method)}
                  />
                </label>
              ))}
              {!selectedMethod?.available && selectedMethod?.reason ? (
                <p className="text-xs text-amber-700">{selectedMethod.reason}</p>
              ) : null}
            </div>

            {method === "SMS_OTP" ? (
              <div className="mt-4 grid gap-2">
                <label className="text-sm text-slate-700">رقم الجوال</label>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
                <label className="text-sm text-slate-700">رمز التحقق</label>
                <input value={otpCode} onChange={(e) => setOtpCode(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
                {debugCode ? <p className="text-xs text-slate-500">رمز تحقق بيئة التطوير: {debugCode}</p> : null}
              </div>
            ) : null}

            {method === "NAFATH" ? (
              <div className="mt-4 grid gap-2">
                <label className="text-sm text-slate-700">حالة نفاذ (بيئة الاختبار)</label>
                <select value={nafathStatus} onChange={(e) => setNafathStatus(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                  <option value="pending">بانتظار التحقق</option>
                  <option value="approved">تم التحقق</option>
                </select>
              </div>
            ) : null}

            {method === "TABLET_SIGNATURE" ? (
              <div className="mt-4 grid gap-2">
                <label className="text-sm text-slate-700">توقيع المريض (Base64)</label>
                <textarea
                  value={signaturePayload}
                  onChange={(e) => setSignaturePayload(e.target.value)}
                  rows={5}
                  className="rounded-lg border px-3 py-2 text-sm"
                  placeholder="ألصق بيانات التوقيع"
                />
                <label className="text-sm text-slate-700">اسم الشاهد</label>
                <input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button onClick={startFlow} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">بدء التحقق</button>
              <button onClick={verifyFlow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">تأكيد</button>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p>الحالة: {status}</p>
              {sessionId ? <p className="text-xs text-slate-500">معرّف الجلسة: {sessionId}</p> : null}
            </div>

            {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
