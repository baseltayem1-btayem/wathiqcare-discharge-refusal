"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import TabletSignaturePad from "@/components/forms/TabletSignaturePad";
import { apiFetch } from "@/utils/api";

type MethodItem = {
  method: "TABLET_SIGNATURE" | "EMAIL_NOTICE";
  available: boolean;
  label_ar: string;
  reason?: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  TABLET_SIGNATURE: "توقيع على الجهاز اللوحي",
  EMAIL_NOTICE: "إرسال إشعار عبر البريد الإلكتروني",
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
  const searchParams = useSearchParams();
  const caseId = params?.id || "";
  const requestedMethod = searchParams.get("method");
  const mobileLinked = searchParams.get("mobile_link") === "1";

  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [method, setMethod] = useState<MethodItem["method"]>("TABLET_SIGNATURE");
  const [email, setEmail] = useState("");
  const [signaturePayload, setSignaturePayload] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState("بانتظار التحقق");
  const [previewHtml, setPreviewHtml] = useState(CONSENT_FALLBACK_HTML);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!caseId) {
      return;
    }

    void apiFetch<{ methods: MethodItem[] }>(`/api/discharge/cases/${caseId}/acknowledgment/methods`)
      .then((res) => {
        setMethods(res.methods || []);
        const availableMethods = res.methods || [];
        const preferredTablet = requestedMethod === "TABLET_SIGNATURE"
          ? availableMethods.find((item) => item.method === "TABLET_SIGNATURE" && item.available)
          : null;
        const firstAvailable = availableMethods.find((item) => item.available);
        if (preferredTablet) {
          setMethod("TABLET_SIGNATURE");
          if (mobileLinked) setMessage("تم تفعيل وضع توقيع التابلت.");
        } else if (firstAvailable) {
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
  }, [caseId, mobileLinked, requestedMethod]);

  const selectedMethod = useMemo(() => methods.find((item) => item.method === method), [methods, method]);

  const resolveStatusLabel = (verificationStatus: string, deliveryStatus?: string | null) => {
    if (verificationStatus === "verified") {
      return "تم التحقق";
    }

    if (verificationStatus === "notification_sent") {
      return deliveryStatus === "sent"
        ? "تم إرسال إشعار البريد الإلكتروني"
        : "تم تسجيل إشعار البريد (قيد التحقق من التسليم)";
    }

    return "بانتظار التحقق";
  };

  const startFlow = async () => {
    setMessage("");

    try {
      const payload: Record<string, unknown> = {};
      if (method === "TABLET_SIGNATURE") {
        payload.witness_name = witnessName;
      }
      if (method === "EMAIL_NOTICE") {
        payload.email = email;
      }

      const res = await apiFetch<{
        session_id: string;
        verification_status: string;
        delivery_status?: string | null;
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
      setStatus(resolveStatusLabel(res.verification_status, res.delivery_status));

      if (res.verification_status === "notification_sent") {
        if (res.delivery_status === "sent") {
          setMessage("تم إرسال إشعار للمريض عبر البريد الإلكتروني.");
        } else {
          setMessage("تم تسجيل إشعار البريد، وجار التحقق من حالة التسليم.");
        }
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
      if (method === "TABLET_SIGNATURE") {
        payload.signature_payload = signaturePayload;
        payload.witness_name = witnessName;
      }

      const res = await apiFetch<{ verification_status: string; delivery_status?: string | null }>(
        `/api/acknowledgment/cases/${caseId}/${sessionId}/verify`,
        {
          method: "POST",
          body: JSON.stringify({ payload }),
        },
      );

      setStatus(resolveStatusLabel(res.verification_status, res.delivery_status));
      if (res.verification_status === "verified") {
        setMessage("تم إكمال الموافقة المستنيرة بنجاح.");
      } else if (res.verification_status === "notification_sent" && res.delivery_status === "sent") {
        setMessage("تم إرسال إشعار للمريض عبر البريد الإلكتروني.");
      } else if (res.verification_status === "notification_sent") {
        setMessage("تم تسجيل إشعار البريد، وجار التحقق من حالة التسليم.");
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
        workflowCaseNav={{
          caseId,
          currentStage: "support_and_intervention",
          escalationRequired: false,
        }}
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

            {method === "EMAIL_NOTICE" ? (
              <div className="mt-4 grid gap-2">
                <label className="text-sm text-slate-700">البريد الإلكتروني للمريض</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </div>
            ) : null}

            {method === "TABLET_SIGNATURE" ? (
              <div className="mt-4 grid gap-2">
                <label className="text-sm text-slate-700">توقيع المريض على التابلت</label>
                <TabletSignaturePad value={signaturePayload} onChange={setSignaturePayload} />
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
