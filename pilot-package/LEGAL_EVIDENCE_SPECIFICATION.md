# LEGAL EVIDENCE SPECIFICATION

**Audience:** Legal counsel, compliance, engineering.
**Release:** v1.0.1
**Purpose:** Normative specification of what constitutes a complete, defensible evidence package for a WathiqCare informed consent (or refusal).

---

## 1. Principles

1. **Append-only.** Once written, audit records are not modified or deleted.
2. **Complete.** Missing any required artifact invalidates the package.
3. **Reproducible.** Evidence can be re-validated from the raw audit data without recourse to volatile state.
4. **Tenant-scoped.** Every artifact is bound to a tenant; cross-tenant artifacts are forbidden.
5. **Privacy-respecting.** PII is masked on display surfaces; full PII is retained only where strictly necessary, subject to §9.

---

## 2. Audit Chain (canonical order)

The following events MUST appear once each, in this order, for any executed consent:

| # | Event | Required fields |
|---|---|---|
| 1 | `DISPATCHED` | `documentId`, `tenantId`, `patientId`, `physicianId`, `templateId`, `templateVersion`, `dispatchedAt`, `tokenFingerprint` |
| 2 | `EDUCATION_VIEWED` | `documentId`, `educationPackageId`, `educationPackageVersion`, `viewedAt`, `actor` |
| 3 | `DECISION_ACCEPTED` **or** `DECISION_REFUSED` | `documentId`, `decision`, `decidedAt`, `actor` |
| 3a | `REFUSAL_ACKNOWLEDGED` (refusal path only) | `documentId`, `acknowledgedAt`, `actor` |
| 4 | `OTP_REQUESTED` | `documentId`, `requestedAt`, `maskedPhone`, `deliveryStatus`, `providerReference` |
| 5 | `OTP_VERIFIED` | `documentId`, `verifiedAt`, `attemptCount`, `bindingHash` |
| 6 | `SIGNATURE_CAPTURED` | `documentId`, `capturedAt`, `signatureArtifactHash`, `inputMethod` |
| 7 | `PDF_FINALIZED` | `documentId`, `finalizedAt`, `pdfHash`, `pdfStorageRef`, `templateVersion`, `localeRendered` |

Additional non-blocking events that MAY appear: `OTP_REQUEST_THROTTLED`, `OTP_VERIFICATION_FAILED` (with counter only — never the code), `REVOKED`, `EXPIRED`, `SESSION_TIMED_OUT`.

---

## 3. Timestamps

- Format: ISO 8601 with UTC offset (`Z`).
- Source: server-authoritative time. Client timestamps are not authoritative.
- Monotonicity: each event's timestamp ≥ the previous event's timestamp.
- Plausibility windows (validated during audit review):
  - `OTP_VERIFIED` − `OTP_REQUESTED` ≤ configured OTP TTL.
  - `SIGNATURE_CAPTURED` − `OTP_VERIFIED` ≤ configured signing session TTL.
  - `PDF_FINALIZED` − `SIGNATURE_CAPTURED` ≤ a small generation budget (configurable; typical: seconds).

Clock skew remediation: NTP-synchronized application servers; clock-skew alerts feed the operations channel.

---

## 4. OTP Evidence

The audit chain stores **proof of verification**, not the code itself.

- Stored: `requestedAt`, `verifiedAt`, `maskedPhone`, `deliveryStatus`, `providerReference`, `attemptCount`, `bindingHash`.
- `bindingHash` = hash over `(documentId || sessionId || verifiedAt)` — used to bind verification to the specific session and document.
- `providerReference` = SMS provider's message ID (where supplied) for delivery confirmation/audit with the carrier.
- The plaintext OTP code is **never** persisted beyond its TTL; it is held only as long as required to validate and then purged.

---

## 5. PDF Hash

- Algorithm: SHA-256 over the final PDF byte stream.
- Stored: `pdfHash` (hex), `pdfStorageRef` (immutable storage handle), `finalizedAt`.
- Verification: a reviewer can recompute the hash from the stored bytes; equality is required.
- Tampering posture: the storage handle is treated as immutable; any mismatch is a P1 incident.

---

## 6. Consent Versioning

- Every consent document is bound to a `templateId` and `templateVersion` at dispatch time.
- The PDF embeds the `templateVersion` (header/footer/appendix) so that human inspection can confirm concordance with the audit row.
- Template updates do NOT retroactively alter executed consents. A new version applies to new dispatches only.
- The template registry is append-only: prior versions remain retrievable for the lifetime of any consent that referenced them.

---

## 7. Education Evidence

- The educational materials presented to the patient are recorded as `educationPackageId` + `educationPackageVersion` with `viewedAt`.
- Materials are drawn from an approved registry; the registry is append-only with versioning matching §6.
- The evidence package can reconstruct the **exact** materials shown to the patient at the time of consent.

---

## 8. Device & Network Metadata

Recorded on the relevant audit rows:

| Field | Stored value | Notes |
|---|---|---|
| `userAgentRaw` | Original UA string | Stored within the audit row only. |
| `userAgentSummary` | Parsed family + OS class | Used for analytics / display. |
| `ipAddress` | Full IP at the time of signing | Retained in the audit row; access-controlled. |
| `ipClass` | Network-class form (e.g., /24 for IPv4, /48 for IPv6) | Used for analytics / longer-term retention. |
| `geoCountry` | Coarse geolocation country only | Optional. No fine-grained location. |
| `inputMethod` | `finger` / `stylus` / `unknown` | For UX analytics; no biometric content. |

Display surfaces do not show the full IP or raw UA to clinicians.

---

## 9. Retention Policy

| Data class | Retention | Notes |
|---|---|---|
| Final PDF + hash + audit chain | Per IMC medical-records retention policy (typically 15 years, or statutory minimum if greater). | Immutable. |
| Decision, OTP audit fields, signature artifact hash | Same as PDF + audit chain. | Append-only. |
| OTP plaintext code | Held in volatile/short-lived store; purged at TTL end. | Never long-term. |
| Full IP address | Retained in the audit row for the lifetime of the audit chain. | Access-controlled. |
| Coarser `ipClass` for analytics outside the audit row | Up to 90 days; truncated/removed thereafter. | Configurable. |
| `userAgentRaw` | Lifetime of audit chain. | Access-controlled. |
| Signing-session cookies | Session lifetime only. | Not persisted server-side beyond session state. |
| Backups | Per IMC backup policy. | Encrypted at rest. |

Deviations from this table require Compliance Reviewer sign-off and an updated revision of this document.

---

## 10. Tenant Binding

- Every audit row carries `tenantId`.
- Every storage handle is namespaced by tenant.
- Cross-tenant queries are not permitted by API contract or by the data access layer.
- Smoke harness includes (or will include in a future revision) a negative test confirming cross-tenant resolution is impossible (see `PILOT_TEST_SCENARIOS.md` S10).

---

## 11. Evidence Package — Export Format

For external review (legal, regulatory), an evidence package export contains:

```
/<documentId>/
  audit-chain.json            # All audit events in canonical order
  decision.json               # Decision record
  otp.json                    # OTP audit fields (no plaintext)
  signature.json              # Signature artifact metadata + hash
  template.json               # templateId, templateVersion, locale
  education.json              # educationPackageId, version, viewedAt
  device.json                 # UA, IP, geoCountry, inputMethod
  consent.pdf                 # Final PDF bytes
  consent.pdf.sha256          # Hex hash, equal to audit-row pdfHash
  manifest.json               # Index + integrity hashes of all of the above
  README.txt                  # Human-readable summary
```

All JSON files are UTF-8, sorted keys, stable serialization for hash reproducibility.

---

## 12. Conformance

A package conforms to this specification only if **all** of the following hold:

- All §2 events present, in order, with §3 timestamp properties.
- §4 OTP evidence present, no plaintext code stored beyond TTL.
- §5 PDF hash present and verifiable against bytes.
- §6 template versioning concordance verifiable.
- §7 education evidence references the approved registry.
- §8 device/network fields present per the recorded surface.
- §9 retention configuration matches the deployed environment.
- §10 tenant binding intact.
- §11 export reproduces all of the above with a valid manifest.

Non-conformance is a Rollback §5.1 candidate per `PILOT_READINESS_MASTER.md`.

---

## 13. Change control

This specification is versioned alongside the platform. Any change requires:

- Legal Reviewer sign-off.
- Compliance Reviewer sign-off.
- Engineering implementation + smoke harness update.
- Communication to all pilot stakeholders before activation.

This document supersedes any earlier informal evidence descriptions in `LEGAL_WITNESS_INTEGRITY_FRAMEWORK` / `EVIDENCE_PACKAGE_*` notes where they conflict.
