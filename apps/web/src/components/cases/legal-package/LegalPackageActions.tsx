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
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !canGenerate} onClick={() => void onGenerate()}>
        إصدار الحزمة القانونية
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => void onSendForSignature()}>
        إرسال للتوقيع
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => void onRefreshSignature()}>
        تحديث حالة التوقيع
      </Button>
      <Button variant="outline" disabled={!hasSignedDownload} onClick={onDownloadSigned}>
        تحميل النسخة الموقعة
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => void onGenerateCourtBundle()}>
        توليد ملف المحكمة
      </Button>
      <Button variant="outline" disabled={!hasCourtDownload} onClick={onDownloadCourtBundle}>
        تحميل ملف المحكمة
      </Button>
    </div>
  );
}
