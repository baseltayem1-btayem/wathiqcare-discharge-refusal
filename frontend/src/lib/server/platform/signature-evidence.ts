import type { SignatureEvidence, SignatureMethod } from "@/lib/server/platform/types";

export function buildSignatureEvidence(args: {
  signatureRecord: string;
  signatureMethod: SignatureMethod;
  ipAddress: string | null;
  deviceInfo: string | null;
}): SignatureEvidence {
  return {
    signature_record: args.signatureRecord,
    verification_timestamp: new Date().toISOString(),
    verification_method: args.signatureMethod,
    ip_address: args.ipAddress,
    device_info: args.deviceInfo,
  };
}
