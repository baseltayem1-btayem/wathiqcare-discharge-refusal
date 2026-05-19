import { escapeHtml } from "@/lib/pdf-engine/core/pdf-layout";

export interface WathiqCareFooterProps {
  legalFooterText: string;
  qrPayload: string | null;
  documentHash: string | null;
  evidenceId: string;
  auditReferenceId: string | null;
  immutableSeal?: string | null;
  forensicChainReference?: string | null;
  evidenceVerificationStatus?: string | null;
  legalRetentionNotice?: string | null;
  retentionClass?: string | null;
  archiveReference?: string | null;
  forensicVerificationReference?: string | null;
  judicialExportReference?: string | null;
  verificationIntegrityIndicator?: string | null;
}

export function renderWathiqCareFooter(props: WathiqCareFooterProps): string {
  return `
    <footer class="wc-pdf-footer">
      <div class="wc-pdf-footer-title">Legal Evidence Footer</div>
      <div class="wc-pdf-footer-row"><strong>QR Verification:</strong> ${escapeHtml(props.qrPayload || "QR verification placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>SHA-256:</strong> ${escapeHtml(props.documentHash || "Pending")}</div>
      <div class="wc-pdf-footer-row"><strong>Evidence ID:</strong> ${escapeHtml(props.evidenceId)}</div>
      <div class="wc-pdf-footer-row"><strong>Audit Ref:</strong> ${escapeHtml(props.auditReferenceId || "Pending")}</div>
      <div class="wc-pdf-footer-row"><strong>Immutable Seal:</strong> ${escapeHtml(props.immutableSeal || "Immutable seal placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Forensic Chain:</strong> ${escapeHtml(props.forensicChainReference || "Forensic chain placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Verification Status:</strong> ${escapeHtml(props.evidenceVerificationStatus || "Verification status placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Retention Class:</strong> ${escapeHtml(props.retentionClass || "Retention class placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Archive Ref:</strong> ${escapeHtml(props.archiveReference || "Archive reference placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Forensic Ref:</strong> ${escapeHtml(props.forensicVerificationReference || "Forensic verification reference placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Judicial Export Ref:</strong> ${escapeHtml(props.judicialExportReference || "Judicial export reference placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Integrity Indicator:</strong> ${escapeHtml(props.verificationIntegrityIndicator || "Integrity indicator placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Retention Notice:</strong> ${escapeHtml(props.legalRetentionNotice || "Legal retention notice placeholder")}</div>
      <div class="wc-pdf-footer-row"><strong>Page:</strong> <span class="pageNumber"></span> / <span class="totalPages"></span></div>
      <div class="wc-pdf-legal-footer">${escapeHtml(props.legalFooterText)}</div>
    </footer>`;
}