"use client";

import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";

type SignatureRequest = {
  signature_status: "PENDING" | "SENT" | "SIGNED" | "FAILED";
  pdffiller_signature_request_id: string | null;
  signer_mobile: string | null;
  sms_sent_at: string | null;
  signed_at: string | null;
  signing_link: string | null;
  external_message: string | null;
};

type IntegrationStatus = {
  pdffiller_configured: boolean;
  taqnyat_configured: boolean;
};

type Props = {
  packageStatus: string;
  signature: SignatureRequest;
  integrationStatus?: IntegrationStatus;
};

export default function SignatureStatusCard({ packageStatus, signature, integrationStatus }: Props) {
  const statusVariant =
    signature.signature_status === "SIGNED"
      ? "success"
      : signature.signature_status === "FAILED"
        ? "warning"
        : "outline";

  function copyLink() {
    if (signature.signing_link) {
      void navigator.clipboard.writeText(signature.signing_link);
    }
  }

  function openLink() {
    if (signature.signing_link) {
      window.open(signature.signing_link, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-3 text-sm space-y-3">
      {/* Integration status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800">حالة التكاملات</span>
        {integrationStatus ? (
          <>
            <Badge variant={integrationStatus.pdffiller_configured ? "success" : "warning"}>
              PDFfiller: {integrationStatus.pdffiller_configured ? "مفعل" : "غير مفعل"}
            </Badge>
            <Badge variant={integrationStatus.taqnyat_configured ? "success" : "outline"}>
              تقنيات: {integrationStatus.taqnyat_configured ? "مفعل" : "غير مفعل"}
            </Badge>
          </>
        ) : null}
      </div>

      {/* Signature status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-800">حالة التوقيع</span>
        <Badge variant={statusVariant}>{signature.signature_status}</Badge>
        <Badge variant="outline">{packageStatus}</Badge>
      </div>

      <div className="space-y-1 text-slate-600">
        <div>رقم الطلب: {signature.pdffiller_signature_request_id || "—"}</div>
        <div>رقم المُوقِّع: {signature.signer_mobile || "—"}</div>
        <div>إرسال SMS: {signature.sms_sent_at || "—"}</div>
        <div>تاريخ التوقيع: {signature.signed_at || "—"}</div>
      </div>

      {/* External message (Taqnyat not configured / no direct link info) */}
      {signature.external_message ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 text-xs leading-relaxed" dir="rtl">
          {signature.external_message}
        </div>
      ) : null}

      {/* Signing link */}
      {signature.signing_link ? (
        <div className="space-y-2">
          <div className="font-semibold text-slate-800">رابط التوقيع</div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs break-all text-slate-700 select-all" dir="ltr">
            {signature.signing_link}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copyLink}>
              نسخ رابط التوقيع
            </Button>
            <Button size="sm" variant="outline" onClick={openLink}>
              فتح رابط التوقيع
            </Button>
          </div>
        </div>
      ) : signature.signature_status === "SENT" && !signature.signing_link ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 text-xs" dir="rtl">
          تم إنشاء طلب التوقيع، ولكن لم يتم إرجاع رابط مباشر من PDFfiller. يرجى فتح الطلب من حساب PDFfiller.
        </div>
      ) : null}
    </div>
  );
}
