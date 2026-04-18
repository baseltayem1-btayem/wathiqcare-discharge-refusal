import assert from "node:assert/strict";
import test from "node:test";

import { validateDischargeRefusalGeneration } from "@/lib/validators/dischargeRefusal.validator";

test("validator accepts physician and timestamp aliases", () => {
  const result = validateDischargeRefusalGeneration({
    patientName: "Patient One",
    patientIdNumber: "10203040",
    medicalRecordNumber: "MRN-100",
    roomNumber: "402",
    treatingPhysician: "Dr. Ashraf Amir",
    incidentTimestamp: "2026-04-17T12:30:00.000Z",
    refusalReason: "Patient refused discharge",
  });

  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
});

test("validator rejects placeholder physician and invalid timestamp", () => {
  const result = validateDischargeRefusalGeneration({
    patientName: "Patient One",
    patientIdNumber: "10203040",
    medicalRecordNumber: "MRN-100",
    roomNumber: "402",
    doctorName: "N/A",
    eventDate: "not-a-date",
    refusalReason: "Patient refused discharge",
  });

  assert.equal(result.valid, false);
  assert.ok(result.missing.includes("attendingPhysicianName"));
  assert.ok(result.missing.includes("dischargeDecisionAt"));
});
