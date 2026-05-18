import type {
  DynamicConsentBuildResult,
  DynamicConsentPayload,
  DynamicConsentSection,
  DynamicConsentTemplateDefinition,
} from "@/modules/consent-engine/engine/types";
import { buildDynamicConsentAuditSnapshot } from "@/modules/consent-engine/audit/dynamic-consent-audit";
import { buildDynamicConsentRenderedDocument } from "@/modules/consent-engine/pdf/dynamic-consent-pdf";
import { renderDynamicConsentHtml } from "@/modules/consent-engine/renderers/html-renderer";
import { listDynamicConsentRisksForSpecialty } from "@/modules/consent-engine/risk-library/catalog";
import { DEFAULT_DYNAMIC_ALTERNATIVES } from "@/modules/consent-engine/i18n/copy";
import { normalizeDynamicConsentPayload, validateDynamicConsentPayload } from "@/modules/consent-engine/validators/payload-validator";

function interpolate(template: string, payload: DynamicConsentPayload): string {
  return template
    .replaceAll("{{patientName}}", payload.patient.name)
    .replaceAll("{{physicianName}}", payload.physician.name)
    .replaceAll("{{diagnosis}}", payload.diagnosis)
    .replaceAll("{{procedure}}", payload.procedure)
    .replaceAll("{{specialty}}", payload.specialty);
}

function buildBlueprintSections(template: DynamicConsentTemplateDefinition, payload: DynamicConsentPayload): DynamicConsentSection[] {
  return template.sectionBlueprints.map((item) => ({
    id: item.id,
    key: item.key,
    kind: item.kind,
    titleAr: item.titleAr,
    titleEn: item.titleEn,
    bodyAr: interpolate(item.bodyArTemplate, payload),
    bodyEn: interpolate(item.bodyEnTemplate, payload),
    required: item.required,
    layer: item.layer,
    order: item.order,
  }));
}

export function buildDynamicConsentDocument(input: {
  template: DynamicConsentTemplateDefinition;
  payload: DynamicConsentPayload;
}): DynamicConsentBuildResult {
  const normalizedPayload = normalizeDynamicConsentPayload(input.payload);
  const warnings = validateDynamicConsentPayload(normalizedPayload);
  const sections = [...buildBlueprintSections(input.template, normalizedPayload), ...normalizedPayload.legalStatements]
    .sort((left, right) => left.order - right.order);
  const risks = normalizedPayload.risks.length > 0
    ? normalizedPayload.risks
    : listDynamicConsentRisksForSpecialty(normalizedPayload.specialty, input.template.defaultRiskCodes);
  const alternatives = normalizedPayload.alternatives.length > 0 ? normalizedPayload.alternatives : DEFAULT_DYNAMIC_ALTERNATIVES;
  const generatedAt = normalizedPayload.audit?.generatedAt || new Date().toISOString();
  const html = renderDynamicConsentHtml({
    template: input.template,
    sections,
    risks,
    alternatives,
    generatedAt,
  });
  const audit = buildDynamicConsentAuditSnapshot({
    payload: normalizedPayload,
    sections,
    template: input.template,
    generatedAt,
  });
  const rendered = buildDynamicConsentRenderedDocument({
    template: input.template,
    payload: normalizedPayload,
    sections,
    risks,
    alternatives,
    warnings,
    generatedAt,
    html,
  });

  return {
    template: input.template,
    payload: normalizedPayload,
    sections,
    risks,
    alternatives,
    warnings,
    rendered,
    audit,
    generatedAt,
  };
}