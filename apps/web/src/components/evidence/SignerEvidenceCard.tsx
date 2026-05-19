"use client";

import EnterpriseCard from "@/components/enterprise/EnterpriseCard";
import EnterpriseStatusPill from "@/components/enterprise/EnterpriseStatusPill";
import type { EvidenceSignerSummary } from "./types";

export type SignerEvidenceCardProps = {
  signers: EvidenceSignerSummary[];
};

function methodLabel(method?: EvidenceSignerSummary["method"]): string {
  if (!method) return "—";
  if (method === "tablet-drawn-signature") return "Tablet signature";
  if (method === "combined-tablet-and-otp") return "Tablet + OTP";
  if (method === "biometric-fingerprint") return "Biometric";
  if (method === "combined-biometric-and-otp") return "Biometric + OTP";
  return "OTP";
}

function roleLabel(role: EvidenceSignerSummary["role"]): string {
  switch (role) {
    case "patient":
      return "Patient";
    case "guardian":
      return "Guardian";
    case "physician":
      return "Physician";
    case "witness":
      return "Witness";
    case "interpreter":
      return "Interpreter";
  }
}

export default function SignerEvidenceCard({ signers }: SignerEvidenceCardProps) {
  const totalSigned = signers.filter((s) => Boolean(s.signedAt)).length;
  return (
    <EnterpriseCard
      testId="signer-evidence-card"
      header={{
        title: "Signer Evidence",
        subtitle: `${totalSigned}/${signers.length} signatures captured`,
        status:
          totalSigned === signers.length
            ? { label: "Complete", tone: "ok" }
            : { label: "Pending", tone: "warn" },
      }}
    >
      <table className="w-full text-left text-xs">
        <thead style={{ color: "var(--wc-ent-fg-muted)" }}>
          <tr>
            <th className="py-1 font-medium">Role</th>
            <th className="py-1 font-medium">Name</th>
            <th className="py-1 font-medium">Method</th>
            <th className="py-1 font-medium whitespace-nowrap">Signed at</th>
            <th className="py-1 font-medium whitespace-nowrap">Hash</th>
            <th className="py-1 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {signers.map((signer, idx) => (
            <tr
              key={`${signer.role}-${idx}`}
              className="wc-ent-row-dense border-t"
              style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
            >
              <td className="py-1 font-medium">{roleLabel(signer.role)}</td>
              <td className="py-1">{signer.displayName}</td>
              <td className="py-1">{methodLabel(signer.method)}</td>
              <td className="py-1 whitespace-nowrap" style={{ color: "var(--wc-ent-fg-muted)" }}>
                {signer.signedAt ? <bdi dir="ltr">{signer.signedAt}</bdi> : "—"}
              </td>
              <td
                className="py-1 font-mono text-[10px] whitespace-nowrap"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {signer.signatureHash ? (
                  <bdi dir="ltr">{`${signer.signatureHash.slice(0, 10)}…`}</bdi>
                ) : (
                  "—"
                )}
              </td>
              <td className="py-1">
                {signer.signedAt ? (
                  <EnterpriseStatusPill status="ok" label="Signed" />
                ) : (
                  <EnterpriseStatusPill status="warn" label="Pending" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </EnterpriseCard>
  );
}
