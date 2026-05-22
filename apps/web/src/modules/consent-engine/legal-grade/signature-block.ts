/**
 * Legal-Grade Consent — Signature Block Module
 *
 * Renders signature zones (patient, physician, witness, translator, SDM)
 * with timestamp placeholders. No real signature capture occurs here.
 */

import { escapeHtml } from "@/modules/consent-engine/legal-grade/escape";

export interface SignatureZoneDescriptor {
  key: string;
  roleEn: string;
  roleAr: string;
  nameEn?: string;
  nameAr?: string;
  identifier?: string;
}

export function renderSignatureZone(zone: SignatureZoneDescriptor): string {
  const idLine = zone.identifier
    ? `<div style="font-size:9.5px;color:var(--lg-color-text-muted);font-family:var(--lg-font-mono)">${escapeHtml(zone.identifier)}</div>`
    : "";
  const nameLine = zone.nameEn
    ? `<div class="lg-signature-name">${escapeHtml(zone.nameEn)}${zone.nameAr ? ` &middot; <span style="font-family:var(--lg-font-arabic)">${escapeHtml(zone.nameAr)}</span>` : ""}</div>`
    : `<div class="lg-signature-name" style="color:var(--lg-color-text-muted);font-style:italic">(name on record)</div>`;
  return `
    <div class="lg-signature-block" data-zone="${escapeHtml(zone.key)}">
      <div>
        <div class="lg-signature-role">${escapeHtml(zone.roleEn)}</div>
        <div class="lg-signature-role-ar">${escapeHtml(zone.roleAr)}</div>
      </div>
      <div>
        ${nameLine}
        ${idLine}
      </div>
      <div class="lg-signature-line" aria-label="signature line"></div>
      <div class="lg-signature-stamp">
        <span><strong>التاريخ</strong> __________________</span>
        <span><strong>الوقت</strong> __________________</span>
      </div>
    </div>
  `;
}

export function renderSignatureGrid(zones: SignatureZoneDescriptor[]): string {
  if (zones.length === 0) return "";
  return `
    <section class="lg-signatures">
      <div class="lg-section-heading">
        <h3 class="lg-section-heading-en">Signatures &amp; Witness Attestations</h3>
        <h3 class="lg-section-heading-ar">التوقيعات والإقرارات</h3>
      </div>
      <div class="lg-signature-grid">${zones.map((z) => renderSignatureZone(z)).join("\n")}</div>
    </section>
  `;
}
