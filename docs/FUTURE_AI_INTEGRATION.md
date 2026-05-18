# Future AI Integration

## Principle

AI may assist the dynamic consent engine in the future, but it must never silently replace governed legal or clinical wording. AI outputs should be advisory, reviewable, and attributable.

## Allowed Future Roles

- Suggesting specialty-relevant risk candidates from a governed library.
- Recommending missing disclosure sections based on procedure context.
- Proposing lay-language explanation variants for clinician review.
- Identifying payload gaps before consent generation.

## Disallowed Roles Without Additional Governance

- Final legal wording generation without reviewer approval.
- Signature or evidence decisions.
- Clinical recommendations that alter the physician plan.
- Automatic replacement of approved template sections.

## Technical Integration Direction

- AI should plug into `service.ts` through isolated suggestion providers.
- Inputs must be minimized and logged.
- Approved template/risk content should remain the authoritative corpus.
- AI suggestions should be stored separately from final rendered content.

## Release Conditions

- Legal, medical, compliance, and cybersecurity review.
- Clear tenant-level activation controls.
- Audit events showing when AI influenced a draft.
- Safe fallback to deterministic non-AI rendering.