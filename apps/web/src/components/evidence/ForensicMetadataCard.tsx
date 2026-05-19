"use client";

import EnterpriseCard from "@/components/enterprise/EnterpriseCard";
import EnterpriseStatusPill from "@/components/enterprise/EnterpriseStatusPill";
import type { EvidenceForensicMetadata } from "./types";

export type ForensicMetadataCardProps = {
  forensic: EvidenceForensicMetadata | undefined;
};

function Row({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3 py-1 text-xs">
      <dt
        className="text-[10px] uppercase tracking-wide"
        style={{ color: "var(--wc-ent-fg-muted)" }}
      >
        {label}
      </dt>
      <dd
        className={`break-all ${mono ? "font-mono text-[11px]" : ""}`}
        style={{ color: value ? "var(--wc-ent-fg-default)" : "var(--wc-ent-fg-muted)" }}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default function ForensicMetadataCard({ forensic }: ForensicMetadataCardProps) {
  const sealed = Boolean(forensic?.legalSealReference);
  const geoText = forensic?.geo
    ? `${forensic.geo.latitude ?? "—"}, ${forensic.geo.longitude ?? "—"}${
        forensic.geo.accuracyM ? ` (±${forensic.geo.accuracyM}m)` : ""
      }`
    : undefined;

  return (
    <EnterpriseCard
      testId="forensic-metadata-card"
      header={{
        title: "Forensic Metadata",
        subtitle: "Capture environment + integrity bindings",
        status: sealed
          ? { label: "Sealed", tone: "ok" }
          : { label: "Awaiting seal", tone: "neutral" },
      }}
    >
      <dl>
        <Row label="Captured at" value={forensic?.capturedAt} />
        <Row label="IP address" value={forensic?.ip} mono />
        <Row label="User agent" value={forensic?.userAgent} />
        <Row label="Geolocation" value={geoText} />
        <Row label="Signature manifest" value={forensic?.signatureManifestHash} mono />
        <Row label="PDF binary hash" value={forensic?.pdfBinaryHash} mono />
        <Row label="Evidence bundle ID" value={forensic?.evidenceBundleId} mono />
        <Row label="Legal seal reference" value={forensic?.legalSealReference} mono />
      </dl>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <EnterpriseStatusPill
          status={forensic?.signatureManifestHash ? "ok" : "neutral"}
          label="Manifest"
        />
        <EnterpriseStatusPill
          status={forensic?.pdfBinaryHash ? "ok" : "neutral"}
          label="PDF hash"
        />
        <EnterpriseStatusPill
          status={forensic?.evidenceBundleId ? "ok" : "neutral"}
          label="Bundle"
        />
        <EnterpriseStatusPill
          status={sealed ? "ok" : "neutral"}
          label={sealed ? "Sealed" : "Not sealed"}
        />
      </div>
    </EnterpriseCard>
  );
}
