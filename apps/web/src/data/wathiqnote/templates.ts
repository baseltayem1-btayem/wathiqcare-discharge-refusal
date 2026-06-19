import templatePack from "@/data/wathiqnote/production-template-pack.json";

export type WathiqNoteTemplateStatus =
  | "Draft"
  | "Legal Review"
  | "Finance Review"
  | "Insurance Review"
  | "DPO/IT Review"
  | "Approved"
  | "Published"
  | "Suspended"
  | "Archived";

export type WathiqNoteTemplate = {
  code: string;
  nameAr: string;
  nameEn: string;
  category: string;
  ownerDepartment: string;
  requiredApprovals: string[];
  status: WathiqNoteTemplateStatus | string;
  purposeAr: string;
  allowedUseCases?: string[];
  prohibitedUseCases?: string[];
  requiredFields: string[];
  clauseAr: string;
  clauseEn: string;
  operationalRuleAr: string;
};

export const wathiqNoteProductionTemplates =
  templatePack as WathiqNoteTemplate[];

export const publishedWathiqNoteTemplates =
  wathiqNoteProductionTemplates.filter(
    (template) => template.status === "Published"
  );

export const draftWathiqNoteTemplates =
  wathiqNoteProductionTemplates.filter(
    (template) => template.status !== "Published"
  );

export function getWathiqNoteTemplateByCode(code: string) {
  return wathiqNoteProductionTemplates.find(
    (template) => template.code === code
  );
}
