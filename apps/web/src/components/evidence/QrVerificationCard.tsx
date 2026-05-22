"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import EnterpriseCard from "@/components/enterprise/EnterpriseCard";
import EnterpriseStatusPill from "@/components/enterprise/EnterpriseStatusPill";
import type { EvidenceQrPayload } from "./types";

export type QrVerificationCardProps = {
  qr: EvidenceQrPayload | undefined;
};

export default function QrVerificationCard({ qr }: QrVerificationCardProps) {
  const [generatedQr, setGeneratedQr] = useState<{
    verificationUrl: string;
    dataUrl: string | null;
  } | null>(null);

  useEffect(() => {
    if (!qr?.verificationUrl) {
      return;
    }
    let cancelled = false;
    const verificationUrl = qr.verificationUrl;
    QRCode.toDataURL(verificationUrl, {
      width: 144,
      margin: 1,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) {
          setGeneratedQr({ verificationUrl, dataUrl: url });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneratedQr({ verificationUrl, dataUrl: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [qr?.verificationUrl]);

  const dataUrl =
    qr?.verificationUrl && generatedQr?.verificationUrl === qr.verificationUrl
      ? generatedQr.dataUrl
      : null;

  return (
    <EnterpriseCard
      testId="qr-verification-card"
      header={{
        title: "QR Verification",
        subtitle: qr?.shortCode ? `Code ${qr.shortCode}` : "Public verification artifact",
        status: qr
          ? { label: "Available", tone: "ok" }
          : { label: "Not generated", tone: "neutral" },
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex h-36 w-36 items-center justify-center rounded border"
          style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
          data-testid="qr-verification-image"
        >
          {dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="QR verification code" width={144} height={144} />
          ) : (
            <span className="text-[11px]" style={{ color: "var(--wc-ent-fg-muted)" }}>
              {qr ? "Rendering…" : "No QR"}
            </span>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-1.5 text-xs">
          <div>
            <dt
              className="text-[10px] uppercase tracking-wide"
              style={{ color: "var(--wc-ent-fg-muted)" }}
            >
              Verification URL
            </dt>
            <dd
              className="wc-ent-break font-mono text-[11px]"
              style={{ color: "var(--wc-ent-fg-default)" }}
            >
              {qr?.verificationUrl ? (
                <bdi dir="ltr">{qr.verificationUrl}</bdi>
              ) : (
                "\u2014"
              )}
            </dd>
          </div>
          <div>
            <dt
              className="text-[10px] uppercase tracking-wide"
              style={{ color: "var(--wc-ent-fg-muted)" }}
            >
              Document hash
            </dt>
            <dd className="wc-ent-break font-mono text-[11px]">
              {qr?.documentHash ? <bdi dir="ltr">{qr.documentHash}</bdi> : "\u2014"}
            </dd>
          </div>
          <div>
            <EnterpriseStatusPill
              status={qr?.documentHash ? "ok" : "neutral"}
              label={qr?.documentHash ? "Hash bound" : "Hash pending"}
            />
          </div>
        </dl>
      </div>
    </EnterpriseCard>
  );
}
