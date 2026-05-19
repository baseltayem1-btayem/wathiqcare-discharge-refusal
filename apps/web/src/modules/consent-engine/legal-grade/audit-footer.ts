/**
 * Legal-Grade Consent — Audit Footer Module
 *
 * Renders a forensic-style footer with evidence ID, template version,
 * generation timestamp, and an audit hash. Includes a QR placeholder
 * (NOT a real QR code yet — no external libraries used).
 */

import type { DynamicConsentAuditSnapshot } from "@/modules/consent-engine/engine/types";
import { CONSENT_BRANDING } from "@/modules/consent-engine/design-system";
import { escapeHtml } from "@/modules/consent-engine/legal-grade/escape";

export interface AuditFooterInput {
  audit: DynamicConsentAuditSnapshot;
  evidenceId?: string | null;
  templateId: string;
  templateVersion: string;
  generatedAt: string;
}

export function renderAuditFooter(input: AuditFooterInput): string {
  const evidenceId = input.evidenceId ?? `EV-${input.audit.payloadFingerprint.slice(0, 12).toUpperCase()}`;
  const hashShort = input.audit.hash.slice(0, 16);
  const qrText = `WC|${evidenceId}|${hashShort}`;

  return `
    <section class="lg-audit-footer" aria-label="audit-and-evidence">
      <div class="lg-audit-meta">
        <span class="lg-audit-label">Evidence ID</span>
        <span class="lg-audit-value">${escapeHtml(evidenceId)}</span>
        <span class="lg-audit-label">Template</span>
        <span class="lg-audit-value">${escapeHtml(input.templateId)} v${escapeHtml(input.templateVersion)}</span>
        <span class="lg-audit-label">Generated</span>
        <span class="lg-audit-value">${escapeHtml(input.generatedAt)}</span>
        <span class="lg-audit-label">Audit Hash</span>
        <span class="lg-audit-value">${escapeHtml(input.audit.hash)}</span>
        <span class="lg-audit-label">Payload Fingerprint</span>
        <span class="lg-audit-value">${escapeHtml(input.audit.payloadFingerprint)}</span>
      </div>
      <div class="lg-qr-placeholder" aria-label="qr-placeholder" title="${escapeHtml(qrText)}">
        QR<br/>RESERVED<br/>${escapeHtml(hashShort)}
      </div>
    </section>
    <div class="lg-evidence-strip">
      <span>${escapeHtml(CONSENT_BRANDING.evidenceFooter)}</span>
      <span>${escapeHtml(CONSENT_BRANDING.evidenceFooterAr)}</span>
    </div>
  `;
}
