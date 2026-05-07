# Full Production Activation Checklist

## Activation Rule

Full production activation is not allowed until all preconditions below are satisfied and approved.

## Preconditions

- operational observation period completed
- feedback cycle completed
- no critical or high incidents remain open
- PDF and legal package generation remain stable
- OTP remains stable
- audit logging remains stable
- backup and restore procedure confirmed
- stakeholder approval received

## Go-Live Approval

- Release owner approval: Pending / Complete
- Legal Affairs approval: Pending / Complete
- Medical Director approval: Pending / Complete
- Quality/Compliance approval: Pending / Complete
- IT approval: Pending / Complete
- Operations approval: Pending / Complete

## Rollback Readiness

- previous known-good deployment identified
- rollback owner assigned
- rollback SOP reviewed
- restore path for configuration and database verified

## Monitoring Readiness

- web and API logs accessible
- alert watch list assigned
- secure-link, OTP, PDF, legal package, and audit failure signals reviewed
- first 24-hour observation schedule assigned

## Support Ownership

- primary support owner assigned
- after-hours escalation owner assigned
- incident communication channel established

## User Onboarding Readiness

- approved user import or invite list ready
- invite-only controls remain in place where required
- onboarding instructions distributed

## Incident Response Readiness

- incident severity owners assigned
- rollback trigger conditions understood
- legal-defensibility incident handling path confirmed

## Retention Readiness

- legal evidence retention readiness confirmed
- audit retention readiness confirmed
- backup retention and restore evidence recorded

## Final Recommendation

Choose one only after evidence review:

- `HOLD`
- `PROCEED WITH LIMITED ROLLOUT`
- `PROCEED WITH FULL PRODUCTION ACTIVATION`

## Reasoning Record

- Recommendation: ____________________
- Reasons for recommendation: ____________________
- Unresolved risks: ____________________
- Required approvals still pending: ____________________
