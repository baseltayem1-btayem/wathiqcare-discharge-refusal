"use client";

import EnterpriseCard from "@/components/enterprise/EnterpriseCard";
import EnterpriseStatusPill, {
  type EnterpriseStatus,
} from "@/components/enterprise/EnterpriseStatusPill";
import type { EvidenceOtpAttempt } from "./types";

export type OtpLogCardProps = {
  attempts: EvidenceOtpAttempt[];
};

const statusToTone: Record<EvidenceOtpAttempt["status"], EnterpriseStatus> = {
  sent: "info",
  delivered: "info",
  verified: "ok",
  expired: "warn",
  failed: "err",
};

export default function OtpLogCard({ attempts }: OtpLogCardProps) {
  const failures = attempts.filter((a) => a.status === "failed").length;
  return (
    <EnterpriseCard
      testId="otp-log-card"
      header={{
        title: "OTP Verification Log",
        subtitle: `${attempts.length} attempts · ${failures} failed`,
        status:
          failures === 0
            ? { label: "Clean", tone: "ok" }
            : { label: `${failures} failed`, tone: "warn" },
      }}
    >
      {attempts.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--wc-ent-fg-muted)" }}>
          No OTP attempts captured yet.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              className="wc-ent-row-dense flex items-center justify-between gap-3 rounded border px-2"
              style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
              data-testid="otp-log-row"
            >
              <span
                className="font-mono text-[11px]"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {attempt.timestamp}
              </span>
              <span className="text-xs uppercase tracking-wide">
                {attempt.channel}
              </span>
              <span className="font-mono text-xs">
                {attempt.destinationMasked}
              </span>
              <span
                className="font-mono text-[10px]"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {attempt.ip ?? "—"}
              </span>
              <EnterpriseStatusPill
                status={statusToTone[attempt.status]}
                label={attempt.status}
              />
              {attempt.failureReason ? (
                <span
                  className="text-[11px]"
                  style={{ color: "var(--wc-ent-state-err-fg)" }}
                >
                  {attempt.failureReason}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </EnterpriseCard>
  );
}
