import assert from "node:assert/strict";
import test from "node:test";

import {
  PATIENT_DECLARATION_KEYS,
} from "@/lib/server/patient-declarations-service";
import {
  allDeclarationsAccepted,
  buildDeclarationsPayload,
  PATIENT_DECLARATION_ITEMS,
} from "@/components/approved-design/patient/PatientDeclarationsPanel";
import { mapPublicSignRequestBody } from "@/lib/server/public-signing-sign-body";

const ARABIC_RE = /[؀-ۿ]/;
// Mojibake markers: Latin-1 bytes / Greek chars produced by broken UTF-8.
const MOJIBAKE_RE = /[ØÙâΓ]/;

test("panel items exactly match the service declaration keys", () => {
  const itemKeys = PATIENT_DECLARATION_ITEMS.map((item) => item.key);
  assert.equal(itemKeys.length, 7);
  assert.equal(itemKeys.length, PATIENT_DECLARATION_KEYS.length);
  assert.deepEqual(
    [...itemKeys].sort(),
    [...PATIENT_DECLARATION_KEYS].sort(),
  );
});

test("every declaration item has bilingual labels", () => {
  for (const item of PATIENT_DECLARATION_ITEMS) {
    assert.ok(item.labelAr.trim().length > 0, `missing Arabic label for ${item.key}`);
    assert.ok(item.labelEn.trim().length > 0, `missing English label for ${item.key}`);
  }
});

test("arabic labels contain Arabic Unicode and no mojibake", () => {
  for (const item of PATIENT_DECLARATION_ITEMS) {
    assert.ok(
      ARABIC_RE.test(item.labelAr),
      `Arabic label for ${item.key} contains no Arabic characters`,
    );
    assert.ok(
      !MOJIBAKE_RE.test(item.labelAr),
      `Arabic label for ${item.key} contains mojibake: ${item.labelAr}`,
    );
  }
});

test("allDeclarationsAccepted accepts only a complete set", () => {
  assert.equal(allDeclarationsAccepted([...PATIENT_DECLARATION_KEYS]), true);
  assert.equal(allDeclarationsAccepted([]), false);
  assert.equal(
    allDeclarationsAccepted([...PATIENT_DECLARATION_KEYS.slice(0, 6)]),
    false,
  );
  // Unknown keys do not count toward completeness.
  assert.equal(allDeclarationsAccepted(["UNKNOWN_KEY"]), false);
  // Extra unknown keys alongside a complete set still pass.
  assert.equal(
    allDeclarationsAccepted([...PATIENT_DECLARATION_KEYS, "EXTRA"]),
    true,
  );
});

test("buildDeclarationsPayload bypasses declarations on the refusal path", () => {
  assert.deepEqual(
    buildDeclarationsPayload([...PATIENT_DECLARATION_KEYS], "refusal"),
    [],
  );
  assert.deepEqual(buildDeclarationsPayload([], "refusal"), []);
});

test("buildDeclarationsPayload returns accepted keys on the consent path", () => {
  const accepted = ["IDENTITY_AND_CAPACITY", "INFORMATION_REVIEWED"];
  assert.deepEqual(buildDeclarationsPayload(accepted, "consent"), accepted);
  // Unknown keys are filtered out so the payload stays within the service domain.
  assert.deepEqual(
    buildDeclarationsPayload([...accepted, "UNKNOWN_KEY"], "consent"),
    accepted,
  );
});

test("sign request body mapper forwards declarations to the service", () => {
  const args = mapPublicSignRequestBody(
    {
      signerName: "Patient Name",
      signatureDataUrl: "data:image/png;base64,abc",
      declarations: [...PATIENT_DECLARATION_KEYS],
    },
    "token-123",
  );
  assert.equal(args.token, "token-123");
  assert.equal(args.signerName, "Patient Name");
  assert.equal(args.signatureDataUrl, "data:image/png;base64,abc");
  assert.deepEqual(args.declarations, [...PATIENT_DECLARATION_KEYS]);
});

test("sign request body mapper preserves missing declarations as undefined", () => {
  const args = mapPublicSignRequestBody({ signerName: "X" }, "token-123");
  assert.equal(args.declarations, undefined);
  assert.equal(args.signatureDataUrl, undefined);
});

test("sign request body mapper tolerates null/empty bodies", () => {
  const args = mapPublicSignRequestBody(null, "token-123");
  assert.equal(args.token, "token-123");
  assert.equal(args.signerName, undefined);
  assert.equal(args.declarations, undefined);
});
