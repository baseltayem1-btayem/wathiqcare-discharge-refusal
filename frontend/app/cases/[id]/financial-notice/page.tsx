"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import TabletSignaturePad from "@/components/forms/TabletSignaturePad";
import { useI18n } from "@/i18n/I18nProvider";
import { apiFetch } from "@/utils/api";

type MethodItem = {
  method: "TABLET_SIGNATURE" | "EMAIL_NOTICE";
  available: boolean;
  label_ar: string;
  reason?: string | null;
};

export default function FinancialNoticeSignaturePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const caseId = params?.id || "";
  const requestedMethod = searchParams.get("method");
  const mobileLinked = searchParams.get("mobile_link") === "1";
  const { lang, t } = useI18n();

  const [methods, setMethods] = useState<MethodItem[]>([]);
  const [method, setMethod] = useState<MethodItem["method"]>("TABLET_SIGNATURE");
  const [email, setEmail] = useState("");
  const [signaturePayload, setSignaturePayload] = useState("");
  const [witnessName, setWitnessName] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [status, setStatus] = useState(() => t("signaturePage.status.waiting"));
  const [previewHtml, setPreviewHtml] = useState("");
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
          if (mobileLinked) setMessage(t("signaturePage.message.tabletActivated"));
        } else if (firstAvailable) {
          setMethod(firstAvailable.method);
        }
      })
      .catch((err: Error) => setMessage(err.message));

    void apiFetch<{ html_content: string }>(`/api/discharge/cases/${caseId}/workflow/preview`, {
      method: "POST",
      body: JSON.stringify({ template_key: "financial_responsibility_notice", payload: {}, locale: lang === "ar" ? "ar" : "en" }),
    })
      .then((res) => setPreviewHtml(res.html_content || ""))
      .catch((err: Error) => setMessage(err.message));
  }, [caseId, lang, mobileLinked, requestedMethod, t]);

  const selectedMethod = useMemo(() => methods.find((item) => item.method === method), [methods, method]);

  const resolveStatusLabel = (verificationStatus: string, deliveryStatus?: string | null) => {
    if (verificationStatus === "verified") {
      return t("signaturePage.status.verified");
    }

    if (verificationStatus === "notification_sent") {
      return deliveryStatus === "sent"
        ? t("signaturePage.status.notificationSent")
        : t("signaturePage.status.notificationRegistered");
    }

    return t("signaturePage.status.waiting");
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
        provider_result?: Record<string, unknown>;
      }>(`/api/discharge/cases/${caseId}/acknowledgment/start`, {
        method: "POST",
        body: JSON.stringify({
          document_type: "financial_responsibility_notice",
          method,
          payload,
        }),
      });

      setSessionId(res.session_id);
      setStatus(resolveStatusLabel(res.verification_status, res.delivery_status));

      if (res.verification_status === "notification_sent") {
        if (res.delivery_status === "sent") {
          setMessage(t("signaturePage.message.emailSent"));
        } else {
          setMessage(t("signaturePage.message.emailRegistered"));
        }
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  const verifyFlow = async () => {
    if (!sessionId) {
      setMessage(t("signaturePage.message.startFirst"));
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
        }
      );

      setStatus(resolveStatusLabel(res.verification_status, res.delivery_status));
      if (res.verification_status === "verified") {
        setMessage(t("signaturePage.message.finalCreated"));
      } else if (res.verification_status === "notification_sent" && res.delivery_status === "sent") {
        setMessage(t("signaturePage.message.emailSent"));
      } else if (res.verification_status === "notification_sent") {
        setMessage(t("signaturePage.message.emailRegistered"));
      }
    } catch (err) {
      setMessage((err as Error).message);
    }
  };

  return (
    <AuthGuard>
      <AppShell
        title={t("signaturePage.financialNotice.title")}
        subtitle={t("signaturePage.financialNotice.subtitle")}
        workflowCaseNav={{
          caseId,
          currentStage: "official_notification",
          escalationRequired: false,
        }}
        actions={
          <Link href={`/cases/${caseId}`} className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            {t("signaturePage.backToCase")}
          </Link>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">{t("signaturePage.officialText")}</h2>
            <div className="mt-3 max-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {previewHtml ? <div dangerouslySetInnerHTML={{ __html: previewHtml }} /> : <p className="text-sm text-slate-500">{t("signaturePage.loading")}</p>}
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">{t("signaturePage.methodSection")}</h2>
            <div className="mt-3 grid gap-2">
              {methods.map((item) => (
                <label key={item.method} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                  <span>{t(`signaturePage.method.${item.method}`)}</span>
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
                <label className="text-sm text-slate-700">{t("signaturePage.emailLabel")}</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </div>
            ) : null}

            {method === "TABLET_SIGNATURE" ? (
              <div className="mt-4 grid gap-2">
                <label className="text-sm text-slate-700">{t("signaturePage.tabletLabel")}</label>
                <TabletSignaturePad value={signaturePayload} onChange={setSignaturePayload} />
                <label className="text-sm text-slate-700">{t("signaturePage.witnessLabel")}</label>
                <input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button onClick={startFlow} className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">{t("signaturePage.startBtn")}</button>
              <button onClick={verifyFlow} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{t("signaturePage.confirmBtn")}</button>
            </div>

            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p>{t("signaturePage.statusLabel")} {status}</p>
              {sessionId ? <p className="text-xs text-slate-500">{t("signaturePage.sessionIdLabel")} {sessionId}</p> : null}
            </div>

            {message ? <p className="mt-2 text-sm text-slate-700">{message}</p> : null}
          </section>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
