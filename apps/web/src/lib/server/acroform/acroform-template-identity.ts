/**
 * Canonical identity resolver for AcroForm-backed approved consent templates.
 *
 * The physician workspace and field-mapping API may receive any of several
 * legitimate identifiers for the same approved template (manifest id, manifest
 * slug, human template code, or a linked database id). This module collapses
 * those aliases to one canonical form identity so that mapping readiness,
 * AcroForm diagnostics, and the rendering pipeline all agree.
 *
 * Resolution is intentionally deterministic and template-specific. No broad
 * fuzzy matching is performed; an identifier either matches a registered
 * alias set or it does not.
 */

import { AMPUTATION_FIELD_MAPPING } from "@/lib/server/consent-field-mappings/amputation.mapping";

export type CanonicalAcroFormTemplateIdentity = {
  canonicalFormId: string;
  slug: string;
  titleEn: string;
  titleAr?: string;
  templateCode?: string;
  layoutFamily: string;
};

type AliasRule = {
  canonicalFormId: string;
  slug: string;
  titleEn: string;
  titleAr?: string;
  templateCode?: string;
  layoutFamily: string;
  aliases: string[];
};

function normalizeAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\s\-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ACROFORM_TEMPLATE_ALIAS_RULES: AliasRule[] = [
  {
    canonicalFormId: AMPUTATION_FIELD_MAPPING.formId,
    slug: AMPUTATION_FIELD_MAPPING.slug,
    titleEn: AMPUTATION_FIELD_MAPPING.titleEn,
    titleAr: "البتر",
    templateCode: "IMC MR 1135",
    layoutFamily: AMPUTATION_FIELD_MAPPING.layoutFamily,
    aliases: [
      AMPUTATION_FIELD_MAPPING.formId,
      AMPUTATION_FIELD_MAPPING.slug,
      "imc mr 1135",
      "mr 1135",
      "mr1135",
      "imc-mr-1135",
      "amputation consent",
      "بتر",
    ],
  },
];

const ALIAS_INDEX: Map<string, AliasRule> = new Map();
for (const rule of ACROFORM_TEMPLATE_ALIAS_RULES) {
  for (const alias of rule.aliases) {
    ALIAS_INDEX.set(normalizeAlias(alias), rule);
  }
  ALIAS_INDEX.set(normalizeAlias(rule.canonicalFormId), rule);
  ALIAS_INDEX.set(normalizeAlias(rule.slug), rule);
  if (rule.templateCode) {
    ALIAS_INDEX.set(normalizeAlias(rule.templateCode), rule);
  }
}

/**
 * Resolve a form identifier to a canonical AcroForm template identity.
 * Returns null when the identifier is not a registered alias for any
 * AcroForm-backed template.
 */
export function resolveCanonicalAcroFormTemplateId(formId: string): CanonicalAcroFormTemplateIdentity | null {
  if (!formId || typeof formId !== "string") return null;
  const rule = ALIAS_INDEX.get(normalizeAlias(formId));
  if (!rule) return null;
  return {
    canonicalFormId: rule.canonicalFormId,
    slug: rule.slug,
    titleEn: rule.titleEn,
    titleAr: rule.titleAr,
    templateCode: rule.templateCode,
    layoutFamily: rule.layoutFamily,
  };
}

/**
 * Return true if the supplied identifier resolves to a known AcroForm-backed
 * consent template.
 */
export function isAcroFormBackedTemplate(formId: string): boolean {
  return resolveCanonicalAcroFormTemplateId(formId) !== null;
}
