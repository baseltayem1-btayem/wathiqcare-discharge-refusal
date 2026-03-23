import type { ValidationResult } from "@/lib/validators/dischargeRefusal.validator";

export const DOCUMENT_TEMPLATE_KEYS = {
  dischargeRefusalForm: "discharge_refusal_form",
  financialResponsibilityNotice: "financial_responsibility_notice",
} as const;

export const DOCUMENT_CODES = {
  dischargeRefusalForm: "IMC-PAT-DIS-REF-01",
  financialResponsibilityNotice: "IMC-PAT-DIS-NOT-01",
} as const;

export type DocumentTemplateLocale = "ar" | "en";

export type DocumentTemplateRenderOptions = {
  locale?: DocumentTemplateLocale;
  tenantName?: string | null;
};

export interface DocumentTemplate<TPayload> {
  key: "discharge_refusal_form" | "financial_responsibility_notice";
  documentCode: string;
  titleEn: string;
  titleAr: string;
  validate(payload: TPayload): ValidationResult;
  renderHtml(payload: TPayload, options?: DocumentTemplateRenderOptions): string;
  buildFileName(payload: TPayload): string;
}

const templateRegistry = new Map<string, DocumentTemplate<unknown>>();

export function registerDocumentTemplate<TPayload>(template: DocumentTemplate<TPayload>): void {
  templateRegistry.set(template.key, template as DocumentTemplate<unknown>);
}

export function getDocumentTemplate<TPayload>(
  key: "discharge_refusal_form" | "financial_responsibility_notice"
): DocumentTemplate<TPayload> | null {
  const result = templateRegistry.get(key);
  if (!result) {
    return null;
  }
  return result as DocumentTemplate<TPayload>;
}

export function listDocumentTemplates(): DocumentTemplate<unknown>[] {
  return Array.from(templateRegistry.values());
}
