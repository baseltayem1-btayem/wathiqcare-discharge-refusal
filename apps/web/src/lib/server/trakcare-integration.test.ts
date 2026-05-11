import assert from "node:assert/strict";
import test from "node:test";

import { getTrakCareConfig, getTrakCareReadiness } from "@/lib/server/trakcare/config";
import { mapEncounter, mapPatient, mapResourceList } from "@/lib/server/trakcare/mapper";

const ORIGINAL_ENV = { ...process.env };

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
}

test("trakcare readiness reports pending when live flag is disabled", () => {
  resetEnv();
  process.env.FF_ENABLE_TRAKCARE_LIVE = "false";
  process.env.TRAKCARE_LIVE_ENABLED = "false";

  const config = getTrakCareConfig();
  const readiness = getTrakCareReadiness(config);

  assert.equal(readiness.ready, false);
  assert.equal(readiness.reason.includes("Pending Live Credentials"), true);
});

test("trakcare readiness is ready with live oauth2 credentials", () => {
  resetEnv();
  process.env.FF_ENABLE_TRAKCARE_LIVE = "true";
  process.env.TRAKCARE_LIVE_ENABLED = "true";
  process.env.TRAKCARE_API_BASE_URL = "https://trakcare.example.com/api";
  process.env.TRAKCARE_AUTH_URL = "https://trakcare.example.com/oauth/token";
  process.env.TRAKCARE_CLIENT_ID = "client-id";
  process.env.TRAKCARE_CLIENT_SECRET = "client-secret";

  const config = getTrakCareConfig();
  const readiness = getTrakCareReadiness(config);

  assert.equal(readiness.ready, true);
  assert.equal(readiness.baseUrlConfigured, true);
  assert.equal(readiness.authConfigured, true);
});

test("trakcare mapper normalizes patient payload", () => {
  const patient = mapPatient({
    patientId: "p-1",
    medicalRecordNo: "MRN-123",
    fullName: "Ahmed Mohammed",
    dob: "1985-03-15",
    nationalID: "1000000000",
  });

  assert.equal(patient.id, "p-1");
  assert.equal(patient.mrn, "MRN-123");
  assert.equal(patient.name, "Ahmed Mohammed");
  assert.equal(patient.dateOfBirth, "1985-03-15");
  assert.equal(patient.nationalId, "1000000000");
});

test("trakcare mapper normalizes encounter and resource lists", () => {
  const encounter = mapEncounter({
    id: "enc-1",
    encounterNumber: "ENC-001",
    doctorName: "Dr. Sami",
    diagnosis: "Appendicitis",
  });

  assert.equal(encounter.id, "enc-1");
  assert.equal(encounter.encounterId, "ENC-001");
  assert.equal(encounter.physician, "Dr. Sami");
  assert.equal(encounter.diagnosis, "Appendicitis");

  const resources = mapResourceList(
    {
      items: [{ id: "a1", description: "Penicillin", code: "ALG-01" }],
    },
    "allergy",
  );

  assert.equal(resources.length, 1);
  assert.equal(resources[0]?.id, "a1");
  assert.equal(resources[0]?.label, "Penicillin");
  assert.equal(resources[0]?.code, "ALG-01");
});
