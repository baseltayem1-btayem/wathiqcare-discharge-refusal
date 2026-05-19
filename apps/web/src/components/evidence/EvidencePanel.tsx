"use client";

import SignerEvidenceCard from "./SignerEvidenceCard";
import OtpLogCard from "./OtpLogCard";
import AuditTrailCard from "./AuditTrailCard";
import QrVerificationCard from "./QrVerificationCard";
import ForensicMetadataCard from "./ForensicMetadataCard";
import type { EvidencePanelData } from "./types";

export type EvidencePanelProps = {
  data: EvidencePanelData;
  layout?: "stacked" | "two-column";
};

export default function EvidencePanel({
  data,
  layout = "two-column",
}: EvidencePanelProps) {
  const grid =
    layout === "two-column"
      ? "grid gap-3 lg:grid-cols-2"
      : "flex flex-col gap-3";
  return (
    <div className={grid} data-testid="evidence-panel">
      <SignerEvidenceCard signers={data.signers ?? []} />
      <OtpLogCard attempts={data.otp ?? []} />
      <AuditTrailCard events={data.audit ?? []} />
      <QrVerificationCard qr={data.qr} />
      <ForensicMetadataCard forensic={data.forensic} />
    </div>
  );
}
