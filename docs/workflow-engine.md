# Workflow Engine

## Objective
Provide deterministic, auditable stage transitions for refusal cases, with role-based control and optional automated work creation.

## Data Structures
- Definition layer:
  - `Workflow`
  - `WorkflowVersion`
  - `WorkflowStage`
  - `WorkflowTransition`
  - `WorkflowTransitionRole`
- Runtime layer:
  - `RefusalCase.currentStageId` / `currentStageCode`
  - `CaseStageHistory`
  - `Task` and `Notification` (optional transition side-effects)

## Selection of Available Transitions
In `WorkflowsService.availableTransitions`:
1. Load case and current stage.
2. Fetch transitions where:
   - same workflow version
   - `fromStageId` equals case current stage
   - `active = true`
3. Resolve request user roles to role IDs.
4. Filter transitions by `WorkflowTransitionRole` mapping.
5. Super-admin bypass is supported.

## Transition Execution Rules
In `WorkflowsService.executeTransition`, the service validates:
- transition is currently available for stage + role
- required fields based on transition metadata:
  - `requiresComment`
  - `requiresReason`
  - `requiresDocument`

If valid, a transaction performs:
1. Case stage/status update.
2. Stage history insert.
3. Optional auto-task creation (`autoCreateTask`).
4. Optional notification enqueue for created task.

After commit, an audit event (`workflow_transition_executed`) is written.

## Status Behavior
- When destination stage is terminal, case status moves to `CLOSED` and `closedAt` is set.
- Non-terminal transitions move status to `IN_PROGRESS`.

## Extension Points
- Add SLA metadata to transitions/stages.
- Add transition predicates (time rules, policy checks, document signatures).
- Add multi-recipient task routing from role groups.
- Add escalation scheduler based on due dates and inactivity windows.

## Test Coverage
Current tests cover:
- role-gated available transition filtering
- required transition fields validation
- auto task and notification side-effects
- forbidden transitions for unauthorized role/stage context
