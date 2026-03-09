import type { Prisma } from "@prisma/client";
import { generateLegalDocument } from "@/lib/server/platform/document-automation";
import type { SignatureMethod } from "@/lib/server/platform/types";

export async function runRefusalEngine(input: {
  tenantId: string;
  actorUserId: string;
  caseId?: string;
  payload: Prisma.InputJsonValue;
  signatureMethod: SignatureMethod;
  signatureRecord: string;
  requestIp: string | null;
  deviceInfo: string | null;
}) {
  const templateKey = (input.payload as Record<string, unknown> | null)?.document_kind === "financial_notice"
    ? "financial_liability_notice"
    : "refusal_of_discharge";

  return generateLegalDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    caseId: input.caseId,
    payload: input.payload,
    templateKey,
    title: "Discharge Refusal Legal Document",
    titleAr: "وثيقة الرفض الطبي القانونية",
    signatureMethod: input.signatureMethod,
    signatureRecord: input.signatureRecord,
    requestIp: input.requestIp,
    deviceInfo: input.deviceInfo,
  });
}
