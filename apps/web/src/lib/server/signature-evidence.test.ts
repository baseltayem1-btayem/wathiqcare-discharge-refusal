import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDigitalPersonaEvidenceResult,
  captureFingerprintVerification,
  detectDigitalPersona4500,
  rejectRawBiometricPayload,
} from "@/lib/signature/digitalpersona-local-agent";
import {
  buildBiometricSignatureEvidence,
  buildConsentSignaturePersistencePayload,
  buildSignatureEvidenceSummary,
  buildTabletSignatureEvidence,
} from "@/lib/signature/signature-evidence";
import { resolveConsentSignaturePresentation } from "@/lib/signature/signature-display";

const VALID_SIGNATURE_DATA_URL = `data:image/png;base64,${Buffer.from("tablet-signature".repeat(16)).toString("base64")}`;

test("tablet signature validation rejects empty payloads", () => {
  assert.throws(
    () => buildTabletSignatureEvidence({
      signerRole: "PATIENT",
      signerName: "Ahmad",
      signatureDataUrl: "data:image/png;base64,AAAA",
      acknowledgmentAccepted: true,
    }),
    /empty or incomplete/,
  );
});

test("tablet signature capture requires patient acknowledgment", () => {
  assert.throws(
    () => buildTabletSignatureEvidence({
      signerRole: "PATIENT",
      signerName: "Ahmad",
      signatureDataUrl: VALID_SIGNATURE_DATA_URL,
      acknowledgmentAccepted: false,
    }),
    /acknowledgment is required/,
  );
});

test("signature evidence hash is generated for tablet capture", () => {
  const evidence = buildTabletSignatureEvidence({
    signerRole: "PATIENT",
    signerName: "Ahmad",
    signatureDataUrl: VALID_SIGNATURE_DATA_URL,
    acknowledgmentAccepted: true,
    otpVerified: true,
    deviceLabel: "Ward Tablet 4",
  });

  assert.equal(evidence.method, "combined-tablet-and-otp");
  assert.equal(evidence.evidenceHash.length, 64);
  assert.equal(evidence.metadata.acknowledgmentAccepted, true);
});

test("biometric capture rejects raw biometric material", () => {
  assert.throws(
    () => buildBiometricSignatureEvidence({
      signerRole: "PATIENT",
      signerName: "Ahmad",
      acknowledgmentAccepted: true,
      verificationResult: buildDigitalPersonaEvidenceResult({
        verified: true,
        deviceReference: "BIO-01",
        transactionId: "TX-1001",
        method: "biometric-fingerprint",
      }),
      rawFingerprintTemplate: "forbidden",
    }),
    /Raw biometric payload/,
  );
});

test("biometric signature flag remains disabled by default", async () => {
  const flags = await import("@/lib/config/feature-flags");
  assert.equal(flags.ENABLE_BIOMETRIC_SIGNATURE, false);
});

test("signature persistence payload and PDF summary expose only sanitized metadata", () => {
  const evidence = buildBiometricSignatureEvidence({
    signerRole: "PATIENT",
    signerName: "Ahmad",
    acknowledgmentAccepted: true,
    verificationResult: buildDigitalPersonaEvidenceResult({
      verified: true,
      deviceReference: "BIO-02",
      transactionId: "TX-2002",
      method: "combined-biometric-and-otp",
    }),
    otpVerified: true,
  });

  const persisted = buildConsentSignaturePersistencePayload(evidence);
  const summary = buildSignatureEvidenceSummary(persisted.metadata);

  assert.equal(persisted.signatureMethod, "OTP");
  assert.equal(summary.some((item) => item.label === "Method" && item.value === "combined-biometric-and-otp"), true);
  assert.equal(summary.some((item) => item.label === "Transaction ID" && item.value === "TX-2002"), true);
  assert.equal(JSON.stringify(persisted.metadata).includes("rawFingerprint"), false);
  assert.equal(summary.some((item) => item.label === "SDK Provider" && item.value === "HID DigitalPersona"), true);
});

test("PDF signature metadata mapping uses sanitized evidence fields", () => {
  const evidence = buildTabletSignatureEvidence({
    signerRole: "PATIENT",
    signerName: "Ahmad",
    signatureDataUrl: VALID_SIGNATURE_DATA_URL,
    acknowledgmentAccepted: true,
    otpVerified: true,
    staffWitnessName: "Nurse Amal",
  });

  const presentation = resolveConsentSignaturePresentation({
    metadata: buildConsentSignaturePersistencePayload(evidence).metadata,
    signatureMethod: "OTP",
    signedAt: "2026-05-18T10:15:00.000Z",
    signerName: "Ahmad",
  });

  assert.equal(presentation.method, "combined-tablet-and-otp");
  assert.equal(presentation.evidenceId?.startsWith("sig-tbl-"), true);
  assert.equal(presentation.signatureImageDataUrl?.startsWith("data:image/png;base64,"), true);
});

test("DigitalPersona evidence result normalizes HID payload shape", () => {
  const result = buildDigitalPersonaEvidenceResult({
    verified: true,
    deviceReference: "DP4500-01",
    transactionId: "TX-DP-01",
    method: "biometric-fingerprint",
  });

  assert.equal(result.sdkProvider, "HID DigitalPersona");
  assert.equal(result.deviceModel, "DigitalPersona 4500");
  assert.equal(result.verificationHash.length, 64);
});

test("rejectRawBiometricPayload blocks prohibited biometric material", () => {
  assert.throws(
    () => rejectRawBiometricPayload({ minutiaeData: "forbidden" }),
    /Raw biometric payload is not allowed/,
  );
});

test("detectDigitalPersona4500 falls back to mock availability for UAT", async () => {
  const detection = await detectDigitalPersona4500({ endpoint: "http://127.0.0.1:1/biometric/verify", mockMode: true });
  assert.equal(detection.available, true);
  assert.equal(detection.sdkProvider, "HID DigitalPersona");
});

test("captureFingerprintVerification returns mock HID payload when local agent is unavailable", async () => {
  const result = await captureFingerprintVerification({ endpoint: "http://127.0.0.1:1/biometric/verify", mockMode: true });
  assert.equal(result.verified, true);
  assert.equal(result.sdkProvider, "HID DigitalPersona");
  assert.equal(result.deviceModel, "DigitalPersona 4500");
});