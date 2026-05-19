/**
 * Legal-Grade Consent — Master HTML Renderer
 *
 * Produces an enterprise medico-legal HTML document for the dynamic
 * consent PREVIEW only. Does NOT replace the production renderer
 * (`renderers/html-renderer.ts`). Behind feature flag + query opt-in.
 *
 * Pure function. No I/O. No external network calls.
 */

import type {
  DynamicConsentAlternativeItem,
  DynamicConsentAuditSnapshot,
  DynamicConsentLanguage,
  DynamicConsentPayload,
  DynamicConsentRiskItem,
  DynamicConsentSection,
  DynamicConsentTemplateDefinition,
} from "@/modules/consent-engine/engine/types";
import {
  CONSENT_BRANDING,
  bilingualGridColumns,
  shouldRenderArabic,
  shouldRenderEnglish,
} from "@/modules/consent-engine/design-system";
import { buildLegalGradeStylesheet } from "@/modules/consent-engine/legal-grade/stylesheet";
import { renderRiskList } from "@/modules/consent-engine/legal-grade/risk-visualization";
import {
  renderSignatureGrid,
  type SignatureZoneDescriptor,
} from "@/modules/consent-engine/legal-grade/signature-block";
import { renderAuditFooter } from "@/modules/consent-engine/legal-grade/audit-footer";
import { escapeHtml } from "@/modules/consent-engine/legal-grade/escape";

export interface LegalGradeRendererInput {
  template: DynamicConsentTemplateDefinition;
  payload: DynamicConsentPayload;
  sections: DynamicConsentSection[];
  risks: DynamicConsentRiskItem[];
  alternatives: DynamicConsentAlternativeItem[];
  warnings: string[];
  audit: DynamicConsentAuditSnapshot;
  generatedAt: string;
  language?: DynamicConsentLanguage;
}

function renderMetaCell(label: string, value: string): string {
  return `<div class="lg-meta-cell"><span class="lg-meta-label">${escapeHtml(label)}</span><span class="lg-meta-value">${escapeHtml(value)}</span></div>`;
}

function renderHeader(
  template: DynamicConsentTemplateDefinition,
  payload: DynamicConsentPayload,
): string {
  return `
    <header class="lg-header">
      <div class="lg-brand">
        ${CONSENT_BRANDING.logoMarkSvg}
        <div class="lg-brand-text">
          <span class="lg-brand-product">${escapeHtml(CONSENT_BRANDING.productName)}</span>
          <span class="lg-brand-partner">${escapeHtml(CONSENT_BRANDING.partnerLabel)} &middot; ${escapeHtml(CONSENT_BRANDING.partnerShort)}</span>
        </div>
      </div>
      <div class="lg-classification">
        <strong>${escapeHtml(CONSENT_BRANDING.documentClassification)}</strong>
        <span>${escapeHtml(CONSENT_BRANDING.documentClassificationAr)}</span>
      </div>
      <div class="lg-badges">
        <span class="lg-badge">${escapeHtml(template.consentType)}</span>
        <span class="lg-badge lg-badge-specialty">${escapeHtml(payload.specialty || template.specialty)}</span>
        <span class="lg-badge">v${escapeHtml(template.version)}</span>
      </div>
    </header>
  `;
}

function renderTitleBlock(
  template: DynamicConsentTemplateDefinition,
  payload: DynamicConsentPayload,
  language: DynamicConsentLanguage,
): string {
  const showEn = shouldRenderEnglish(language);
  const showAr = shouldRenderArabic(language);
  const titleEn = showEn
    ? `<h1 class="lg-title-en">${escapeHtml(template.displayNameEn)}</h1>`
    : "";
  const titleAr = showAr
    ? `<h1 class="lg-title-ar">${escapeHtml(template.displayNameAr)}</h1>`
    : "";
  return `
    <div class="lg-title-block">
      ${titleEn}
      ${titleAr}
      <div class="lg-meta-grid">
        ${renderMetaCell("Patient / المريض", payload.patient.name || "—")}
        ${renderMetaCell("MRN", payload.patient.identifier || "—")}
        ${renderMetaCell("Case / الحالة", payload.encounter.caseNumber || "—")}
        ${renderMetaCell("Encounter", payload.encounter.encounterNumber || "—")}
        ${renderMetaCell("Department", payload.encounter.department || payload.specialty || "—")}
        ${renderMetaCell("Diagnosis", payload.diagnosis || "—")}
        ${renderMetaCell("Procedure", payload.procedure || "—")}
        ${renderMetaCell("Physician", payload.physician.name || "—")}
      </div>
    </div>
  `;
}

function renderSection(
  section: DynamicConsentSection,
  index: number,
  language: DynamicConsentLanguage,
): string {
  const showEn = shouldRenderEnglish(language);
  const showAr = shouldRenderArabic(language);
  const gridClass = language === "bilingual" ? "bilingual" : "single";
  const sectionNum = String(index + 1).padStart(2, "0");
  const headingEn = showEn
    ? `<h3 class="lg-section-heading-en"><span class="lg-section-num">§${sectionNum}</span>${escapeHtml(section.titleEn)}</h3>`
    : "";
  const headingAr = showAr
    ? `<h3 class="lg-section-heading-ar">${escapeHtml(section.titleAr)}</h3>`
    : "";
  const bodyEn = showEn
    ? `<p class="lg-copy-en">${escapeHtml(section.bodyEn)}</p>`
    : "";
  const bodyAr = showAr
    ? `<p class="lg-copy-ar">${escapeHtml(section.bodyAr)}</p>`
    : "";
  return `
    <section class="lg-section" data-layer="${section.layer}" data-kind="${escapeHtml(section.kind)}">
      <div class="lg-section-heading">
        ${headingEn}
        ${headingAr}
      </div>
      <div class="lg-copy-grid ${gridClass}">
        ${bodyEn}
        ${bodyAr}
      </div>
    </section>
  `;
}

function renderAlternatives(
  alternatives: DynamicConsentAlternativeItem[],
  language: DynamicConsentLanguage,
): string {
  const showEn = shouldRenderEnglish(language);
  const showAr = shouldRenderArabic(language);
  if (alternatives.length === 0) return "";
  const gridClass = language === "bilingual" ? "bilingual" : "single";
  const items = alternatives
    .map((alt) => {
      const en = showEn ? `<p class="lg-copy-en">${escapeHtml(alt.textEn)}</p>` : "";
      const ar = showAr ? `<p class="lg-copy-ar">${escapeHtml(alt.textAr)}</p>` : "";
      return `<li class="lg-legal-item"><div class="lg-copy-grid ${gridClass}">${en}${ar}</div></li>`;
    })
    .join("\n");
  return `
    <section class="lg-section" data-kind="alternatives">
      <div class="lg-section-heading">
        <h3 class="lg-section-heading-en">Treatment Alternatives</h3>
        <h3 class="lg-section-heading-ar">البدائل العلاجية</h3>
      </div>
      <ul class="lg-legal-list">${items}</ul>
    </section>
  `;
}

function renderRisks(
  risks: DynamicConsentRiskItem[],
  language: DynamicConsentLanguage,
): string {
  return `
    <section class="lg-section" data-kind="risks">
      <div class="lg-section-heading">
        <h3 class="lg-section-heading-en">Material Risks &amp; Possible Complications</h3>
        <h3 class="lg-section-heading-ar">المخاطر الجوهرية والمضاعفات المحتملة</h3>
      </div>
      ${renderRiskList(risks, {
        showEnglish: shouldRenderEnglish(language),
        showArabic: shouldRenderArabic(language),
      })}
    </section>
  `;
}

function renderAnesthesia(
  payload: DynamicConsentPayload,
  language: DynamicConsentLanguage,
): string {
  const a = payload.anesthesia;
  if (!a || !a.required) return "";
  const showEn = shouldRenderEnglish(language);
  const showAr = shouldRenderArabic(language);
  const gridClass = language === "bilingual" ? "bilingual" : "single";
  const en = showEn && a.notesEn ? `<p class="lg-copy-en"><strong>Anesthesia:</strong> ${escapeHtml(a.type || "—")}. ${escapeHtml(a.notesEn)}</p>` : "";
  const ar = showAr && a.notesAr ? `<p class="lg-copy-ar"><strong>التخدير:</strong> ${escapeHtml(a.type || "—")}. ${escapeHtml(a.notesAr)}</p>` : "";
  if (!en && !ar) return "";
  return `
    <section class="lg-section" data-kind="anesthesia">
      <div class="lg-section-heading">
        <h3 class="lg-section-heading-en">Anesthesia Plan</h3>
        <h3 class="lg-section-heading-ar">خطة التخدير</h3>
      </div>
      <div class="lg-copy-grid ${gridClass}">${en}${ar}</div>
    </section>
  `;
}

function renderDeclaration(language: DynamicConsentLanguage): string {
  const showEn = shouldRenderEnglish(language);
  const showAr = shouldRenderArabic(language);
  const en = showEn
    ? `<p>I confirm that I have read and understood every section above. I have had the opportunity to ask questions, and my questions have been answered to my satisfaction. I voluntarily consent to the proposed procedure, having been informed of its purpose, expected benefits, material risks, possible complications, and reasonable alternatives.</p>`
    : "";
  const ar = showAr
    ? `<p dir="rtl" style="font-family:var(--lg-font-arabic);line-height:1.95">أقرّ بأنني قرأت وفهمت جميع الأقسام أعلاه، وأُتيحت لي فرصة طرح الأسئلة وتم الإجابة عليها بصورة مرضية. وأوافق طوعاً على الإجراء المقترح بعد إحاطتي بهدفه وفوائده المتوقعة ومخاطره الجوهرية ومضاعفاته المحتملة وبدائله المعقولة.</p>`
    : "";
  return `
    <section class="lg-declaration" data-kind="acknowledgment">
      <h4>Patient Declaration / إقرار المريض</h4>
      ${en}
      ${ar}
    </section>
  `;
}

function buildSignatureZones(
  payload: DynamicConsentPayload,
): SignatureZoneDescriptor[] {
  const sig = payload.signatures ?? {};
  const zones: SignatureZoneDescriptor[] = [];

  if (sig.patientRequired !== false) {
    zones.push({
      key: "patient",
      roleEn: "Patient / Substitute Decision-Maker",
      roleAr: "المريض / صاحب القرار البديل",
      nameEn: payload.patient.name,
      identifier: payload.patient.identifier ?? undefined,
    });
  }
  if (sig.physicianRequired !== false) {
    zones.push({
      key: "physician",
      roleEn: "Treating Physician",
      roleAr: "الطبيب المعالج",
      nameEn: payload.physician.name,
      identifier: payload.physician.identifier ?? undefined,
    });
  }
  if (sig.interpreterRequired) {
    zones.push({
      key: "interpreter",
      roleEn: "Certified Interpreter",
      roleAr: "المترجم المعتمد",
    });
  }
  if (sig.witnessRequired) {
    zones.push({
      key: "witness",
      roleEn: "Independent Witness",
      roleAr: "الشاهد المستقل",
    });
  }
  return zones;
}

function renderWarningsPanel(warnings: string[]): string {
  if (!warnings || warnings.length === 0) return "";
  const items = warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("");
  return `
    <section class="lg-warning lg-no-print" data-kind="preview-warnings">
      <h4>Preview validation warnings</h4>
      <ul style="margin:0;padding-left:18px">${items}</ul>
    </section>
  `;
}

export function renderLegalGradeConsentHtml(input: LegalGradeRendererInput): string {
  const language: DynamicConsentLanguage = input.language ?? input.payload.language ?? "bilingual";
  const dir = language === "ar" ? "rtl" : "ltr";
  const stylesheet = buildLegalGradeStylesheet();
  const sortedSections = [...input.sections].sort((a, b) => a.order - b.order);

  const sectionsHtml = sortedSections
    .map((section, idx) => renderSection(section, idx, language))
    .join("\n");

  const signatureZones = buildSignatureZones(input.payload);

  // Document-level lang attribute: bilingual defaults to en for tooling parity.
  const docLang = language === "ar" ? "ar" : "en";

  return `<!DOCTYPE html>
<html lang="${docLang}" dir="${dir}" data-lg-engine="legal-grade-preview">
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(input.template.displayNameEn)} — ${escapeHtml(CONSENT_BRANDING.productName)}</title>
    <style>${stylesheet}</style>
    <style>
      /* Per-render dynamic overrides */
      .lg-copy-grid.bilingual { grid-template-columns: ${bilingualGridColumns("bilingual")}; }
    </style>
  </head>
  <body>
    <main class="lg-page">
      <article class="lg-document" data-template="${escapeHtml(input.template.id)}" data-version="${escapeHtml(input.template.version)}" data-specialty="${escapeHtml(input.payload.specialty)}">
        ${renderHeader(input.template, input.payload)}
        ${renderTitleBlock(input.template, input.payload, language)}
        ${sectionsHtml}
        ${renderAnesthesia(input.payload, language)}
        ${renderRisks(input.risks, language)}
        ${renderAlternatives(input.alternatives, language)}
        ${renderDeclaration(language)}
        ${renderSignatureGrid(signatureZones)}
        ${renderAuditFooter({
          audit: input.audit,
          evidenceId: input.payload.audit?.evidenceId ?? null,
          templateId: input.template.id,
          templateVersion: input.template.version,
          generatedAt: input.generatedAt,
        })}
        ${renderWarningsPanel(input.warnings)}
      </article>
    </main>
  </body>
</html>`;
}
