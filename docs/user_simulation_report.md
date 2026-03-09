# User Simulation Report

Date: 2026-03-09
Evidence source: `docs/test_documents/user_simulation_result.json`, `user_simulation_doctor_signature.json`

## Simulated Roles
- Doctor
- Nurse
- Legal Officer

## Scenario Outcomes
- Doctor login: PASS
- Doctor workflow start action: returned `400` (workflow precondition not satisfied for tested endpoint sequence)
- Doctor signature journey (start + verify): PASS (`200/200`)
- Nurse login: PASS
- Nurse signature start action: `403` (role boundary enforced)
- Legal Officer login: PASS
- Legal escalate action: `400` (state precondition not met)
- Legal archive action: PASS (`200`)

## UAT Interpretation
- Authentication and role isolation behave as expected.
- Positive end-user document signing path is validated.
- Some role actions require explicit workflow stage preparation before acceptance criteria can be marked complete.

## Next UAT Pass Recommendations
- Prepare case states per role script before executing role-specific actions.
- Expand nurse-positive scenarios limited to permitted operations.
- Add UI-level UAT recording (screen capture + operator notes) for training handover.
