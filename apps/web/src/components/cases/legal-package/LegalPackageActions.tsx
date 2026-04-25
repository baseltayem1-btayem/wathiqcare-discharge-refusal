"use client";

import { Button } from "@/components/design-system/button";

type Props = {
  busy: boolean;
  canGenerate: boolean;
  hasSignedDownload: boolean;
  hasCourtDownload: boolean;
  onGenerate: () => Promise<void>;
  onSendForSignature: () => Promise<void>;
  onRefreshSignature: () => Promise<void>;
  onDownloadSigned: () => void;
  onGenerateCourtBundle: () => Promise<void>;
  onDownloadCourtBundle: () => void;
};

export default function LegalPackageActions({
  busy,
  canGenerate,
  hasSignedDownload,
  hasCourtDownload,
  onGenerate,
  onSendForSignature,
  onRefreshSignature,
  onDownloadSigned,
  onGenerateCourtBundle,
  onDownloadCourtBundle,
}: Props) {
  const generateDisabledReason = !canGenerate ? "لا يمكن إنشاء الحزمة حتى اكتمال المتطلبات القانونية" : undefined;
  const signedDownloadReason = !hasSignedDownload ? "النسخة الموقعة غير متاحة بعد" : undefined;
  const courtDownloadReason = !hasCourtDownload ? "ملف المحكمة غير متاح بعد" : undefined;

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !canGenerate} title={busy ? "العملية قيد التنفيذ" : generateDisabledReason} onClick={() => void onGenerate()}>
        إصدار الحزمة القانونية
      </Button>
      <Button variant="outline" disabled={busy} title={busy ? "العملية قيد التنفيذ" : undefined} onClick={() => void onSendForSignature()}>
        إرسال للتوقيع
      </Button>
      <Button variant="outline" disabled={busy} title={busy ? "العملية قيد التنفيذ" : undefined} onClick={() => void onRefreshSignature()}>
        تحديث حالة التوقيع
      </Button>
      <Button variant="outline" disabled={!hasSignedDownload} title={signedDownloadReason} onClick={onDownloadSigned}>
        تحميل النسخة الموقعة
      </Button>
      <Button variant="outline" disabled={busy} title={busy ? "العملية قيد التنفيذ" : undefined} onClick={() => void onGenerateCourtBundle()}>
        توليد ملف المحكمة
      </Button>
      <Button variant="outline" disabled={!hasCourtDownload} title={courtDownloadReason} onClick={onDownloadCourtBundle}>
        تحميل ملف المحكمة
      </Button>
    </div>
  );
}
