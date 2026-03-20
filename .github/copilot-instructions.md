# Wathiq Care Agent Execution Policy

Status: Mandatory (Go/No-Go Authority)
Effective date: 2026-03-13
Scope: Any frontend/UI proposal, generation, modification, or review in this repository

## Trigger Scope (Frontend-Governed Work)

This policy is mandatory for any task related to frontend, UI, design-system, template, layout, component, dashboard, form, table, dialog, chart, i18n, RTL, or UX.

## Binding Governance Sources

For all frontend/UI work, the following repository-root documents are binding and higher-priority implementation constraints:
- FRONTEND_ARCHITECTURE_RULES.md
- RTL_I18N_REQUIREMENTS.md
- UI_TEMPLATE_SELECTION_RULES.md

These are mandatory authorities, not optional guidance.

## Mandatory Enforcement Rules

1. The agent MUST read all three governance documents before proposing, generating, modifying, or reviewing any frontend/UI code.
2. The agent MUST NOT implement frontend/UI code unless compliance with all governance gates is confirmed first.
3. The agent MUST produce, in order, a Compliance Check Summary, Gap Analysis, and Go/No-Go Decision before any frontend code generation.
4. If any requested implementation conflicts with governance, the agent MUST stop and issue a non-compliance report.
5. The agent MUST treat governance documents as go/no-go authorities.
6. The agent MUST NOT bypass Angular architecture, bilingual support, RTL/LTR requirements, licensing rules, or template acceptance gates.
7. Any exception requires explicit written approval in repository documentation before implementation.
8. The agent MUST NOT assume partial compliance is acceptable.
9. The agent MUST NOT use CSS hacks as substitutes for native RTL support.
10. The agent MUST NOT adopt React, Vue, or static HTML templates unless explicitly allowed by architecture rules.
11. The agent MUST NOT proceed with template-based implementation unless licensing, scalability, and usability gates are satisfied.

## Required Frontend Preflight (Before Code Changes)

The agent SHALL complete this sequence before editing frontend/UI code:

1. Read:
   - FRONTEND_ARCHITECTURE_RULES.md
   - RTL_I18N_REQUIREMENTS.md
   - UI_TEMPLATE_SELECTION_RULES.md
2. Produce a Compliance Check Summary covering:
   - Angular-only conformance
   - Bilingual Arabic/English conformance
   - RTL (Arabic) and LTR (English) conformance
   - Scalability and healthcare workflow suitability
   - Required base layout capability fit
   - Licensing/commercial deployment validity
   - Responsive and tablet suitability
   - Governance acceptance-gate status (pass/fail)
3. Produce a Gap Analysis that identifies:
   - Any unmet governance requirement
   - The specific conflicting rule or gate
   - Impact/risk of proceeding without remediation
   - Required remediation actions to reach compliance
4. Produce a Go/No-Go Decision:
   - GO: all required gates pass
   - NO-GO: any required gate fails

## Required Execution Sequence (Mandatory Order)

For every frontend/UI implementation request, the agent SHALL follow this order:

1. Read the three governance documents.
2. Publish Compliance Check Summary.
3. Publish Gap Analysis.
4. Publish Go/No-Go Decision.
5. Only if status is GO: propose implementation plan.
6. Only after plan approval by governance status GO: start code changes.

If status is NO-GO, the agent MUST not propose implementation code or perform code edits.

## Frontend Implementation Blocking Condition

Before any frontend code generation or modification, all of the following MUST be completed:
1. Confirm review of all three governance documents.
2. Publish a written Compliance Check Summary.
3. Publish explicit mismatch findings (or explicitly state none).
4. Publish a clear GO/NO-GO decision.

If any required item above is missing, frontend implementation is blocked.

## Required Non-Compliance Report (When Any Rule Fails)

When non-compliance exists, the agent MUST provide:
- Requested change summary
- Conflicting governance rule(s)
- Why the request is non-compliant
- Risk/impact if implemented as requested
- Remediation options to become compliant
- Final decision: NO-GO

## Review Behavior

For frontend/UI code reviews, the agent SHALL:
- Evaluate changes against all three governance documents first
- Flag each violation with explicit gate impact
- Mark the review as non-compliant when any mandatory rule is broken

## Exception Handling

No governance exception is allowed unless explicit written approval exists in repository documentation.
Until such approval exists, the default decision remains NO-GO for conflicting implementations.
