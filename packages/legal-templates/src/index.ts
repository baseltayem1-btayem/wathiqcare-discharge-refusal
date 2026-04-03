import type { DocumentType } from "@wathiqcare/types";

export interface LegalTemplate {
    key: DocumentType | string;
    version: string;
    language: "ar" | "en";
    title: string;
    subtitle?: string;
    warning_header?: string;
    body: string[];
    signature_declaration: string;
    legal_footer: string;
    variables: string[];
}

// ── Arabic Templates (v1.0.0) ─────────────────────────────────────────

export const arDischargeNotice = require("./ar/discharge_notice_acknowledgment.json") as LegalTemplate;
export const arHomeCareAgreement = require("./ar/home_care_agreement.json") as LegalTemplate;
export const arEquipmentReceipt = require("./ar/equipment_receipt_and_training_acknowledgment.json") as LegalTemplate;
export const arRefusalLiability = require("./ar/refusal_of_discharge_and_financial_liability_acknowledgment.json") as LegalTemplate;

// ── Registry ──────────────────────────────────────────────────────────

const REGISTRY: Record<string, LegalTemplate> = {
    discharge_notice_acknowledgment: arDischargeNotice,
    home_care_agreement: arHomeCareAgreement,
    equipment_receipt_and_training_acknowledgment: arEquipmentReceipt,
    refusal_of_discharge_and_financial_liability_acknowledgment: arRefusalLiability,
};

/**
 * Retrieve a versioned legal template by document type and language.
 * Throws if the template is not found.
 */
export function getTemplate(
    type: DocumentType,
    language: "ar" | "en" = "ar"
): LegalTemplate {
    const key = `${type}_${language}`;
    const byLang = REGISTRY[key];
    if (byLang) return byLang;
    // Fall back to default (Arabic)
    const fallback = REGISTRY[type];
    if (fallback) return fallback;
    throw new Error(`Legal template not found: ${type} (${language})`);
}

/**
 * Render a template body by substituting {{variable}} placeholders.
 */
export function renderTemplate(
    template: LegalTemplate,
    variables: Record<string, string>
): string {
    const lines = template.body.map((line) =>
        line.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `[${key}]`)
    );
    return lines.join("\n");
}
