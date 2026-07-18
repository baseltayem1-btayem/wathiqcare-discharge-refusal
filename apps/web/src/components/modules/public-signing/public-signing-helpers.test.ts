import assert from "node:assert/strict";
import test from "node:test";
import {
  computeStageIndex,
  formatMaskedPhone,
  getDeliveryEndpoint,
  getFinalPdfUrl,
  getSignaturePadLabel,
  getSignerLabels,
  getStageLabels,
  getUiLang,
  isRtlLang,
  resolveWorkflowLang,
} from "./public-signing-helpers";

test("resolveWorkflowLang returns ar, en, or bilingual", () => {
  assert.equal(resolveWorkflowLang("ar", "en"), "ar");
  assert.equal(resolveWorkflowLang("en", "ar"), "en");
  assert.equal(resolveWorkflowLang(undefined, "ar"), "ar");
  assert.equal(resolveWorkflowLang(null, undefined), "bilingual");
  assert.equal(resolveWorkflowLang("invalid", "en"), "bilingual");
});

test("getUiLang returns ar only when workflow lang is ar", () => {
  assert.equal(getUiLang("ar"), "ar");
  assert.equal(getUiLang("en"), "en");
  assert.equal(getUiLang("bilingual"), "en");
});

test("isRtlLang treats ar and bilingual as RTL", () => {
  assert.equal(isRtlLang("ar"), true);
  assert.equal(isRtlLang("bilingual"), true);
  assert.equal(isRtlLang("en"), false);
});

test("getSignerLabels distinguishes guardian from patient", () => {
  const guardianEn = getSignerLabels("GUARDIAN", "en");
  assert.ok(guardianEn.title.toLowerCase().includes("guardian"));
  assert.ok(guardianEn.ariaLabel.toLowerCase().includes("guardian"));

  const patientEn = getSignerLabels("PATIENT", "en");
  assert.ok(patientEn.title.toLowerCase().includes("patient"));
  assert.ok(!patientEn.title.toLowerCase().includes("guardian"));

  const guardianAr = getSignerLabels("guardian", "ar");
  assert.ok(guardianAr.title.includes("ولي"));

  const patientAr = getSignerLabels("patient", "ar");
  assert.ok(patientAr.title.includes("المريض"));
});

test("getSignaturePadLabel never assigns guardian text to patient role", () => {
  const patient = getSignaturePadLabel("PATIENT", "en");
  assert.ok(patient.toLowerCase().includes("patient"));
  assert.ok(!patient.toLowerCase().includes("guardian"));

  const guardian = getSignaturePadLabel("GUARDIAN", "en");
  assert.ok(guardian.toLowerCase().includes("guardian"));
  assert.ok(!guardian.toLowerCase().includes("patient"));
});

test("getStageLabels includes identity and adapts to refusal path", () => {
  const normal = getStageLabels(true, false, "en");
  assert.ok(normal.includes("Identity"));
  assert.ok(normal.includes("Education"));

  const refusal = getStageLabels(true, true, "en");
  assert.ok(refusal.includes("Refusal Acknowledgement"));
  assert.ok(refusal.includes("Refusal Signature"));

  const ar = getStageLabels(false, false, "ar");
  assert.ok(ar.includes("الهوية"));
});

test("formatMaskedPhone masks all but last four digits", () => {
  assert.equal(formatMaskedPhone("+966555123456"), "****3456");
  assert.equal(formatMaskedPhone(null), "—");
});

test("getFinalPdfUrl builds patient-copy download URL with encoding", () => {
  const url = getFinalPdfUrl("token-123", { copy: "PATIENT_COPY", lang: "en", disposition: "attachment" });
  assert.ok(url.startsWith("/api/public/informed-consents/signing/token-123/final-pdf?"));
  assert.ok(url.includes("copy=PATIENT_COPY"));
  assert.ok(url.includes("lang=en"));
  assert.ok(url.includes("disposition=attachment"));
});

test("getDeliveryEndpoint encodes token", () => {
  assert.equal(getDeliveryEndpoint("token/abc"), "/api/public-signing/document/token%2Fabc/deliver");
});

test("computeStageIndex respects identity before OTP and OTP before education", () => {
  const stages = getStageLabels(true, false, "en");
  assert.equal(
    computeStageIndex(stages, {
      identityConfirmed: false,
      otpVerified: false,
      educationAcknowledged: false,
      decisionStatus: "UNDECIDED",
      refusalAcknowledged: false,
      signatureCaptured: false,
      educationRequired: true,
      isRefusalPath: false,
    }),
    stages.indexOf("Identity"),
  );

  assert.equal(
    computeStageIndex(stages, {
      identityConfirmed: true,
      otpVerified: false,
      educationAcknowledged: false,
      decisionStatus: "UNDECIDED",
      refusalAcknowledged: false,
      signatureCaptured: false,
      educationRequired: true,
      isRefusalPath: false,
    }),
    stages.indexOf("OTP Verification"),
  );

  assert.equal(
    computeStageIndex(stages, {
      identityConfirmed: true,
      otpVerified: true,
      educationAcknowledged: false,
      decisionStatus: "UNDECIDED",
      refusalAcknowledged: false,
      signatureCaptured: false,
      educationRequired: true,
      isRefusalPath: false,
    }),
    stages.indexOf("Education"),
  );
});

test("computeStageIndex lands on confirmation after signature", () => {
  const stages = getStageLabels(true, false, "en");
  assert.equal(
    computeStageIndex(stages, {
      identityConfirmed: true,
      otpVerified: true,
      educationAcknowledged: true,
      decisionStatus: "CONSENT_ACCEPTED",
      refusalAcknowledged: false,
      signatureCaptured: true,
      educationRequired: true,
      isRefusalPath: false,
    }),
    stages.indexOf("Confirmation"),
  );
});

test("computeStageIndex handles refusal acknowledgement before refusal signature", () => {
  const stages = getStageLabels(true, true, "en");
  assert.equal(
    computeStageIndex(stages, {
      identityConfirmed: true,
      otpVerified: true,
      educationAcknowledged: true,
      decisionStatus: "CONSENT_REFUSED",
      refusalAcknowledged: false,
      signatureCaptured: false,
      educationRequired: true,
      isRefusalPath: true,
    }),
    stages.indexOf("Refusal Acknowledgement"),
  );
});
