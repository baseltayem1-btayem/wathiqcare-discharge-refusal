import type { Prisma } from "@prisma/client";
import { generateLegalDocument } from "@/lib/server/platform/document-automation";
import type { SignatureMethod } from "@/lib/server/platform/types";

export async function runAgreementEngine(input: {
  tenantId: string;
  actorUserId: string;
  caseId?: string;
  payload: Prisma.InputJsonValue;
  signatureMethod: SignatureMethod;
  signatureRecord: string;
  requestIp: string | null;
  deviceInfo: string | null;
}) {
  const subtype = (input.payload as Record<string, unknown> | null)?.agreement_type;
  const templateKey = subtype === "medical_equipment" ? "medical_equipment_agreement" : "home_care_agreement";

  return generateLegalDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    caseId: input.caseId,
    payload: input.payload,
    templateKey,
    title: "Medico-Legal Agreement",
    titleAr: "اتفاقية طبية قانونية",
    signatureMethod: input.signatureMethod,
    signatureRecord: input.signatureRecord,
    requestIp: input.requestIp,
    deviceInfo: input.deviceInfo,
  });
}
