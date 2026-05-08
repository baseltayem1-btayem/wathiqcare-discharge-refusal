# WathiqCare Operational Escalation Matrix

## Purpose

This matrix defines first-response ownership for production monitoring events that can affect legal defensibility, audit continuity, or controlled rollout safety.

## Escalation Matrix

| Monitoring Surface | Primary Owner | Secondary Owner | Escalate When | Required Evidence | Initial Response Target |
| --- | --- | --- | --- | --- | --- |
| Authentication and session failures (`AUTH_STATE_FAILURE`, `AUTH_POLICY_FAILURE`, `API_FAILURE`) | Platform Operations | Application Engineering | Repeated 401/403/500 spikes, failed admin recovery, or route-level auth instability | UTC timestamp, route, tenant/user scope, trace ID, deployment ID if available | 15 minutes |
| OTP dispatch and verification (`ACKNOWLEDGMENT_OTP_DISPATCH`, `ACKNOWLEDGMENT_OTP_VERIFY`) | Application Engineering | Clinical Operations | Missing OTP runtime markers during controlled tests, repeated verification failures, or case/session mismatch | UTC timestamp, case ID, session ID, tenant ID, acknowledgment method, challenge ID if present | 15 minutes |
| Audit persistence and chain continuity | Application Engineering | Quality and Compliance | `audit chain append failed (non-fatal)` appears, audit writes fail, or case evidence becomes non-reconstructable | UTC timestamp, case ID, tenant ID, affected action, surrounding API trace | 15 minutes |
| PDF and legal package generation | Application Engineering | Legal and Compliance | `pdf_generation_failed`, legal package generation failure, malformed Arabic output, or missing artifact metadata | UTC timestamp, case ID, document type, artifact version, API trace ID | 30 minutes |
| Secure-link public access and decision capture | Platform Operations | Legal and Compliance | Repeated rejected access spikes, public decision failures, or abnormal token expiry/revocation pattern | UTC timestamp, event name, case ID, token/link ID when available, tenant scope | 15 minutes |
| Backend platform availability (Railway/FastAPI) | Platform Operations | Application Engineering | Health degradation, repeated 5xx responses, startup crash, or log stream interruption | UTC timestamp, service name, deployment/version, health probe result, error payload | 15 minutes |
| Production rollout governance | Incident Commander | Quality and Compliance | Any issue threatens legal defensibility, audit continuity, patient-facing acknowledgment capture, or verified release baseline | Incident log, event timeline, deployment identifiers, affected workflows, decision record | Immediate |

## Severity Rules

- Treat any event that affects legal evidence, Arabic PDF integrity, or audit continuity as Sev-1.
- Treat repeated OTP verification failures during live acknowledgment handling as Sev-2 until disproven as user-entry error.
- Treat isolated user input errors without workflow blockage as Sev-3 unless the rate changes materially.

## Required Escalation Recipients

- Platform Operations
- Application Engineering
- Quality and Compliance
- Legal and Compliance when document integrity or evidentiary chain is affected
- Clinical Operations when patient-facing acknowledgment capture is degraded

## Evidence Handling

- Record every incident using `docs/governance/incident-log-template.md`.
- Preserve UTC timestamps, case IDs, session IDs, trace IDs, deployment identifiers, and screenshots or exported log snippets when available.
- Do not redact operational identifiers needed to reconstruct legal workflow state; redact direct PII instead.