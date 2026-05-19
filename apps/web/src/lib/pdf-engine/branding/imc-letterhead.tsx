import { escapeHtml } from "@/lib/pdf-engine/core/pdf-layout";

export interface ImcLetterheadProps {
  hospitalName: string;
  department: string;
  referenceNumber: string;
  version: string;
  generatedAt: string;
  logoLabel?: string;
}

export function renderImcLetterhead(props: ImcLetterheadProps): string {
  return `
    <header class="wc-pdf-letterhead">
      <div class="wc-pdf-letterhead-cluster">
        <div class="wc-pdf-letterhead-logo">${escapeHtml(props.logoLabel || "IMC logo placeholder")}</div>
        <div>
          <div class="wc-pdf-hospital-name">${escapeHtml(props.hospitalName)}</div>
          <div class="wc-pdf-department">${escapeHtml(props.department)}</div>
        </div>
      </div>
      <div class="wc-pdf-brand-panel">
        <div class="wc-pdf-brand-name">WathiqCare™</div>
        <div class="wc-pdf-brand-subtitle">Enterprise Healthcare Legal Automation Platform</div>
        <div class="wc-pdf-brand-meta">Ref: ${escapeHtml(props.referenceNumber)}</div>
        <div class="wc-pdf-brand-meta">Version: ${escapeHtml(props.version)}</div>
        <div class="wc-pdf-brand-meta">Generated: ${escapeHtml(props.generatedAt)}</div>
      </div>
    </header>`;
}