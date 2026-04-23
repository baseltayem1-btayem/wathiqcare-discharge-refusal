export type DemoRiskItem = {
  category: string;
  level: "Low" | "Medium" | "High";
  summary: string;
};

export type DemoFinding = {
  id: string;
  category: string;
  title: string;
  outcome: "Satisfied" | "Required Element Not Satisfied";
  reasoning: string;
  remediation: string;
};

export type DemoAuditEvent = {
  when: string;
  actor: string;
  action: string;
  detail: string;
};

export const legalDemoCase = {
  caseReference: "IMC-DR-2026-0042",
  patientLabel: "Patient A.H.",
  mrn: "MRN-884231",
  facility: "International Medical Center",
  legalCounselFormat: "Legal Affairs Department",
  attendingConsultant: "Dr. Basel Tayem",
  clinicalSummary:
    "Adult inpatient discharge refusal following documented explanation of post-procedural risk, expected complications, and advised continuation of supervised care.",
  readinessDecision: {
    label: "Legally Eligible to Proceed",
    percentage: 92,
    blockers: 1,
    riskLevel: "Medium",
    opinion:
      "The file is materially complete for enterprise legal review; final issuance remains subject to completion of one residual documentary control.",
  },
  nextAction:
    "Issue the final legal package immediately upon confirmation of the final PDF control and archive the matter under the enterprise medico-legal register.",
};

export const legalDemoRiskBreakdown: DemoRiskItem[] = [
  {
    category: "Documentation",
    level: "Medium",
    summary: "Core refusal materials are present, but the final PDF control remains pending issuance.",
  },
  {
    category: "Consent",
    level: "Low",
    summary: "Consent evidence, signer identity, and processing rationale are recorded in a defensible form.",
  },
  {
    category: "Witness",
    level: "Low",
    summary: "Witness sufficiency, role composition, and attestation integrity are satisfied.",
  },
  {
    category: "Compliance",
    level: "Medium",
    summary: "Audit continuity is established; one final document readiness control remains open prior to issue.",
  },
];

export const legalDemoFindings: DemoFinding[] = [
  {
    id: "RULE-DOC-002",
    category: "Documentation",
    title: "Final case PDF control",
    outcome: "Required Element Not Satisfied",
    reasoning:
      "The final case PDF has not yet been issued in locked form, which prevents the matter from being treated as fully concluded for enterprise archive purposes.",
    remediation:
      "Generate and lock the final legal PDF, then append the issued version to the matter bundle.",
  },
  {
    id: "RULE-CNS-001",
    category: "Consent",
    title: "Consent evidentiary sufficiency",
    outcome: "Satisfied",
    reasoning:
      "The file contains a recorded consent method, lawful basis statement, and signer evidence sufficient for review.",
    remediation:
      "No further consent remediation presently required.",
  },
  {
    id: "RULE-WIT-001",
    category: "Witness",
    title: "Witness threshold and integrity",
    outcome: "Satisfied",
    reasoning:
      "Two compliant witnesses are recorded with verified identity markers and completed attestations.",
    remediation:
      "Maintain witness records as part of the locked evidence set.",
  },
  {
    id: "RULE-CMP-002",
    category: "Compliance",
    title: "Audit chain verification",
    outcome: "Satisfied",
    reasoning:
      "Chronology and chain verification appear internally consistent for enterprise review and inspection presentation.",
    remediation:
      "No further compliance remediation presently required.",
  },
];

export const legalDemoAuditTimeline: DemoAuditEvent[] = [
  {
    when: "23 Apr 2026, 09:08",
    actor: "Attending Consultant",
    action: "Clinical explanation recorded",
    detail: "Material risks of early discharge and recommended continuation of supervised care were documented.",
  },
  {
    when: "23 Apr 2026, 09:21",
    actor: "Authorized Signer",
    action: "Patient position captured",
    detail: "Refusal position and signer identity were recorded after explanation in English and Arabic.",
  },
  {
    when: "23 Apr 2026, 09:27",
    actor: "Witness Panel",
    action: "Witness attestations completed",
    detail: "Clinical and non-clinical witnesses completed attestation with verified identity markers.",
  },
  {
    when: "23 Apr 2026, 09:35",
    actor: "Legal Operations",
    action: "Consent evidence appended",
    detail: "Consent basis, document version, and evidentiary references were appended to the file.",
  },
  {
    when: "23 Apr 2026, 09:44",
    actor: "Compliance Review",
    action: "Audit chain verified",
    detail: "Hash chain continuity confirmed across reviewed events for internal assurance purposes.",
  },
  {
    when: "23 Apr 2026, 09:52",
    actor: "Legal Officer",
    action: "Finalization held pending document issue",
    detail: "Matter left in controlled pending state until the final PDF control is issued and locked.",
  },
];