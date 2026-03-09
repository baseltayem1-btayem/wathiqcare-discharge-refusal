import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";

export type IssuedGovernancePdf = {
  fileName: string;
  storagePath: string;
  integrityHash: string;
  issuedAt: string;
  payload: Prisma.InputJsonValue;
};

export function issueGovernancePdf(
  prefix: string,
  payload: Prisma.InputJsonValue,
): IssuedGovernancePdf {
  const issuedAt = new Date().toISOString();
  const serialized = JSON.stringify(payload);
  const integrityHash = crypto.createHash("sha256").update(serialized).digest("hex");
  const fileName = `${prefix}_${Date.now()}.pdf`;

  return {
    fileName,
    storagePath: `/generated/governance/${fileName}`,
    integrityHash,
    issuedAt,
    payload,
  };
}
