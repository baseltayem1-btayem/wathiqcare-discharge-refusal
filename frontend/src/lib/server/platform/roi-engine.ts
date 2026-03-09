import type { Prisma } from "@prisma/client";
import { generateLegalDocument } from "@/lib/server/platform/document-automation";
import type { SignatureMethod } from "@/lib/server/platform/types";

export async function runRoiEngine(input: {
  tenantId: string;
  actorUserId: string;
  caseId?: string;
  payload: Prisma.InputJsonValue;
  signatureMethod: SignatureMethod;
  signatureRecord: string;
  requestIp: string | null;
  deviceInfo: string | null;
}) {
  return generateLegalDocument({
    tenantId: input.tenantId,
    actorUserId: input.actorUserId,
    caseId: input.caseId,
    payload: input.payload,
    templateKey: "roi_authorization",
    title: "Release of Information Authorization",
    titleAr: "تفويض الإفصاح عن المعلومات",
    signatureMethod: input.signatureMethod,
    signatureRecord: input.signatureRecord,
    requestIp: input.requestIp,
    deviceInfo: input.deviceInfo,
  });
}
