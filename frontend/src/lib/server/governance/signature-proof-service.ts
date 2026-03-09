import crypto from "node:crypto";
import { GovernanceSignatureMethod, SignatureProofStatus } from "@prisma/client";

export type SignatureInitArgs = {
  method: GovernanceSignatureMethod;
  mobileNumber?: string | null;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export type SignatureInitResult = {
  status: SignatureProofStatus;
  providerSummary: string;
  otpReference?: string;
  otpCodeHash?: string;
  phoneMasked?: string;
};

export function initializeSignatureProof(args: SignatureInitArgs): SignatureInitResult {
  if (args.method === GovernanceSignatureMethod.SMS_OTP) {
    const code = process.env.NODE_ENV === "production" ? `${Math.floor(100000 + Math.random() * 900000)}` : "123456";
    const otpReference = `otp_${Date.now()}`;
    const otpCodeHash = crypto.createHash("sha256").update(code).digest("hex");
    const phoneMasked = args.mobileNumber
      ? args.mobileNumber.replace(/.(?=.{4})/g, "*")
      : undefined;

    return {
      status: SignatureProofStatus.PENDING,
      providerSummary: "SMS OTP initialized (mock-safe mode)",
      otpReference,
      otpCodeHash,
      phoneMasked,
    };
  }

  if (args.method === GovernanceSignatureMethod.NAFATH) {
    return {
      status: SignatureProofStatus.PENDING,
      providerSummary: "Nafath provider is feature-gated and currently running in placeholder mode",
    };
  }

  return {
    status: SignatureProofStatus.SIGNED,
    providerSummary: "Tablet signature captured",
  };
}

export function verifyOtpCode(expectedHash: string | null, providedCode: string): boolean {
  if (!expectedHash) {
    return false;
  }
  const providedHash = crypto.createHash("sha256").update(providedCode).digest("hex");
  return providedHash === expectedHash;
}
