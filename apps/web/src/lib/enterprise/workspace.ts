import type { CanonicalUserRole } from "@/lib/server/roles";
import { canonicalizeUserRole } from "@/lib/server/roles";
import {
  getAccessibleModules,
  getModuleDefinition,
  type ModuleAccessContext,
  type ModuleDefinition,
  type ModuleKey,
} from "@/lib/modules/catalog";

export const ENTERPRISE_SECTION_KEYS = [
  "overview",
  "workflow",
  "documents",
  "audit-trail",
  "signatures",
  "timeline",
  "risk-analysis",
] as const;

export type EnterpriseSectionKey = (typeof ENTERPRISE_SECTION_KEYS)[number];

export type EnterpriseWorkflowState =
  | "draft"
  | "submitted"
  | "under-review"
  | "pending-approval"
  | "returned-for-revision"
  | "approved"
  | "rejected"
  | "archived"
  | "escalated"
  | "expired";

type EnterpriseActionDefinition = {
  key: string;
  label: string;
  description: string;
  href: string;
  roles: readonly CanonicalUserRole[];
  stages: readonly EnterpriseWorkflowState[];
  modules?: readonly ModuleKey[];
  priority: number;
};

export type EnterpriseWorkspaceSummaryCard = {
  label: string;
  value: string;
  tone: "primary" | "success" | "warning" | "danger";
  detail: string;
};

export type EnterpriseWorkflowStep = {
  key: EnterpriseWorkflowState;
  label: string;
  status: "completed" | "current" | "pending" | "escalated" | "overdue";
  detail: string;
};

export type EnterpriseTimelineEvent = {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  comments: string;
  attachment: string;
  ipAddress: string;
  device: string;
};

export type EnterpriseApprovalStep = {
  label: string;
  approver: string;
  role: string;
  status: "approved" | "pending" | "delegated" | "rejected" | "escalated";
  detail: string;
};

export type EnterpriseSidebarGroup = {
  title: string;
  items: Array<{
    label: string;
    href: string;
    current?: boolean;
  }>;
};

export type EnterpriseSearchRecord = {
  id: string;
  label: string;
  href: string;
  meta: string;
};

export type EnterpriseWorkspaceView = {
  moduleDefinition: ModuleDefinition;
  viewerRole: CanonicalUserRole;
  currentSection: EnterpriseSectionKey;
  activeState: EnterpriseWorkflowState;
  summaryCards: EnterpriseWorkspaceSummaryCard[];
  workflowSteps: EnterpriseWorkflowStep[];
  timeline: EnterpriseTimelineEvent[];
  contextActions: EnterpriseActionDefinition[];
  quickActions: EnterpriseActionDefinition[];
  approvalSteps: EnterpriseApprovalStep[];
  sidebarGroups: EnterpriseSidebarGroup[];
  sectionTabs: Array<{
    key: EnterpriseSectionKey;
    label: string;
    href: string;
    active: boolean;
  }>;
  searchPlaceholder: string;
  searchRecords: EnterpriseSearchRecord[];
  permissionHighlights: string[];
  auditHighlights: string[];
  evidenceHighlights: string[];
  notificationChannels: string[];
  approvalMode: string;
  workspaceLabel: string;
};

type ModuleScenario = {
  state: EnterpriseWorkflowState;
  approvalMode: string;
  workspaceLabel: string;
  summaryCards: EnterpriseWorkspaceSummaryCard[];
  permissionHighlights: string[];
  auditHighlights: string[];
  evidenceHighlights: string[];
  notificationChannels: string[];
  searchRecords: EnterpriseSearchRecord[];
};

const WORKFLOW_SEQUENCE: EnterpriseWorkflowState[] = [
  "draft",
  "submitted",
  "under-review",
  "pending-approval",
  "approved",
  "archived",
];

const SECTION_LABELS: Record<EnterpriseSectionKey, string> = {
  overview: "Overview",
  workflow: "Workflow",
  documents: "Documents",
  "audit-trail": "Audit Trail",
  signatures: "Signatures",
  timeline: "Timeline",
  "risk-analysis": "Risk Analysis",
};

// Timeline event IDs use a short module prefix to keep audit tokens compact but still readable across modules.
const MODULE_PREFIX_LENGTH = 4;

const ROLE_LABELS: Record<CanonicalUserRole, string> = {
  platform_superadmin: "Platform Super Admin",
  platform_admin: "Platform Admin",
  tenant_owner: "Tenant Owner",
  tenant_admin: "Tenant Admin",
  legal_admin: "Legal Affairs",
  medical_director: "Medical Director",
  doctor: "Physician",
  nursing: "Nurse",
  compliance: "Compliance",
  quality: "Quality",
  risk_manager: "Risk Manager",
  finance_officer: "Finance",
  patient_affairs: "Patient Relations",
  external_reviewer: "External Reviewer",
  read_only_auditor: "Read-Only Auditor",
  auditor: "Auditor",
  social_services: "Social Services",
  lab_tech: "Lab Tech",
  pharmacist: "Pharmacist",
  reception: "Reception",
  it_admin: "IT Admin",
  bed_manager: "Bed Manager",
  read_only_manager: "Read-Only Manager",
  viewer: "Viewer",
};

const ACTION_DEFINITIONS: EnterpriseActionDefinition[] = [
  {
    key: "submit",
    label: "Submit",
    description: "Send the record into governed enterprise review.",
    href: "#submit",
    roles: ["doctor", "medical_director", "tenant_admin", "tenant_owner"],
    stages: ["draft", "returned-for-revision"],
    priority: 1,
  },
  {
    key: "sign",
    label: "Sign",
    description: "Capture the authenticated signer event.",
    href: "#sign",
    roles: ["doctor", "nursing", "external_reviewer"],
    stages: ["submitted", "under-review", "returned-for-revision"],
    priority: 2,
  },
  {
    key: "witness-sign-only",
    label: "Witness Sign Only",
    description: "Restricted witness acknowledgment without edit rights.",
    href: "#witness",
    roles: ["nursing", "external_reviewer"],
    stages: ["submitted", "under-review"],
    priority: 3,
  },
  {
    key: "assign-reviewer",
    label: "Assign Reviewer",
    description: "Route the case to the next accountable reviewer.",
    href: "#assign-reviewer",
    roles: ["tenant_admin", "tenant_owner", "legal_admin", "risk_manager"],
    stages: ["submitted", "under-review", "pending-approval"],
    priority: 4,
  },
  {
    key: "final-legal-approval",
    label: "Final Legal Approval",
    description: "Record the terminal legal approval decision.",
    href: "#final-legal-approval",
    roles: ["legal_admin"],
    stages: ["pending-approval", "escalated"],
    priority: 5,
  },
  {
    key: "legal-hold",
    label: "Legal Hold",
    description: "Freeze progression while preserving immutable evidence.",
    href: "#legal-hold",
    roles: ["legal_admin", "compliance", "risk_manager"],
    stages: ["under-review", "pending-approval", "escalated"],
    priority: 6,
  },
  {
    key: "approve",
    label: "Approve",
    description: "Approve the active workflow step.",
    href: "#approve",
    roles: ["legal_admin", "medical_director", "finance_officer", "quality", "compliance", "risk_manager"],
    stages: ["pending-approval", "under-review", "escalated"],
    priority: 7,
  },
  {
    key: "reject",
    label: "Reject",
    description: "Reject the active workflow step with evidence.",
    href: "#reject",
    roles: ["legal_admin", "medical_director", "finance_officer", "quality", "compliance", "risk_manager"],
    stages: ["pending-approval", "under-review", "escalated"],
    priority: 8,
  },
  {
    key: "return-for-revision",
    label: "Return for Revision",
    description: "Send back to the owner with mandatory remediation notes.",
    href: "#return",
    roles: ["legal_admin", "medical_director", "quality", "compliance", "risk_manager"],
    stages: ["under-review", "pending-approval"],
    priority: 9,
  },
  {
    key: "escalate",
    label: "Escalate",
    description: "Escalate to backup or supervisory approval path.",
    href: "#escalate",
    roles: ["legal_admin", "medical_director", "quality", "compliance", "risk_manager"],
    stages: ["under-review", "pending-approval", "escalated", "expired"],
    priority: 10,
  },
  {
    key: "hold",
    label: "Hold",
    description: "Pause the approval chain while maintaining SLA visibility.",
    href: "#hold",
    roles: ["legal_admin", "medical_director", "finance_officer", "quality", "compliance"],
    stages: ["under-review", "pending-approval", "escalated"],
    priority: 11,
  },
  {
    key: "request-clarification",
    label: "Request Clarification",
    description: "Ask the owner to clarify missing legal or clinical evidence.",
    href: "#clarification",
    roles: ["legal_admin", "medical_director", "quality", "compliance", "risk_manager", "finance_officer"],
    stages: ["under-review", "pending-approval"],
    priority: 12,
  },
  {
    key: "generate-pdf",
    label: "Generate PDF",
    description: "Issue a governed PDF with QR validation and legal evidence ID.",
    href: "#generate-pdf",
    roles: ["legal_admin", "finance_officer", "quality", "compliance", "tenant_admin", "tenant_owner"],
    stages: ["approved", "archived", "pending-approval"],
    priority: 13,
  },
  {
    key: "request-signature",
    label: "Request Signature",
    description: "Launch a routed signature request with notification delivery.",
    href: "#request-signature",
    roles: ["doctor", "legal_admin", "nursing", "tenant_admin"],
    stages: ["draft", "submitted", "under-review"],
    priority: 14,
  },
];

const MODULE_SCENARIOS: Record<ModuleKey, ModuleScenario> = {
  "informed-consents": {
    state: "pending-approval",
    approvalMode: "Sequential medical review with conditional legal sign-off",
    workspaceLabel: "Consent ID IC-2026-1184",
    summaryCards: [
      { label: "Pending approvals", value: "4", tone: "warning", detail: "2 approaching SLA breach" },
      { label: "Drafts awaiting patient signature", value: "9", tone: "primary", detail: "Arabic + English evidence packets ready" },
      { label: "Returned for revision", value: "3", tone: "danger", detail: "Clinical risk disclosure missing" },
      { label: "Locked final consents", value: "128", tone: "success", detail: "Immutable with QR validation" },
    ],
    permissionHighlights: [
      "Physicians can create, submit, sign, and request signatures for assigned consents.",
      "Legal Affairs can place legal hold, approve conditionally, and finalize evidence packages.",
      "Read-only auditors only see audit, timeline, and final document evidence.",
    ],
    auditHighlights: [
      "Every access, edit, OTP verification, signature, and PDF export is captured.",
      "Timeline shows actor, role, timestamp, IP, device, comments, and attachments.",
    ],
    evidenceHighlights: [
      "Final PDFs include QR validation, legal evidence ID, watermarking, and version.",
      "Signed records are immutable and remain locked after approval.",
    ],
    notificationChannels: ["Email", "In-app", "SMS-ready"],
    searchRecords: [
      { id: "MRN-10293", label: "Maryam Abdullah", href: "/modules/informed-consents/workflow", meta: "MRN · Consent IC-2026-1184 · Dr. A. Khan" },
      { id: "CASE-4401", label: "Orthopedic Consent Review", href: "/modules/informed-consents/timeline", meta: "Case ID · Pending legal approval" },
    ],
  },
  "discharge-refusal": {
    state: "escalated",
    approvalMode: "Parallel legal and medical governance with escalation path",
    workspaceLabel: "Case DR-2026-0441",
    summaryCards: [
      { label: "Escalated cases", value: "6", tone: "danger", detail: "3 overdue beyond escalation SLA" },
      { label: "Pending physician signatures", value: "5", tone: "warning", detail: "Awaiting treating physician response" },
      { label: "Ready for legal package", value: "12", tone: "primary", detail: "Arabic/English PDFs available" },
      { label: "Finalized evidence chains", value: "87", tone: "success", detail: "Hash chain verified" },
    ],
    permissionHighlights: [
      "Assigned physicians can submit, sign, and request patient acknowledgment.",
      "Legal Affairs and Risk Managers can escalate, place holds, and govern approvals.",
      "Patient Relations can access only assigned cases and communications.",
    ],
    auditHighlights: [
      "Clickstream, workflow transitions, legal package generation, and downloads are visible.",
      "Escalation path and SLA breach history remain visible in the timeline.",
    ],
    evidenceHighlights: [
      "OTP, witness signature, secure-link events, and audit hash chain are retained.",
      "Final legal packages preserve device metadata and finalization status.",
    ],
    notificationChannels: ["Email", "In-app", "SMS-ready", "Escalation alerts"],
    searchRecords: [
      { id: "DR-2026-0441", label: "Case DR-2026-0441", href: "/modules/discharge-refusal/workflow", meta: "MRN 441002 · Escalated · Dr. Mona" },
      { id: "MRN-441002", label: "Fahad Al-Otaibi", href: "/modules/discharge-refusal/timeline", meta: "Pending legal escalation approval" },
    ],
  },
  "promissory-notes": {
    state: "under-review",
    approvalMode: "Sequential finance review followed by legal archival approval",
    workspaceLabel: "Promissory Note PN-2026-0198",
    summaryCards: [
      { label: "Notes pending finance approval", value: "11", tone: "warning", detail: "5 high value undertakings" },
      { label: "Delegated approvals", value: "2", tone: "primary", detail: "Backup approver activated" },
      { label: "Finalized notes", value: "54", tone: "success", detail: "Locked and watermark protected" },
      { label: "Conditional approvals", value: "4", tone: "danger", detail: "Awaiting debtor clarification" },
    ],
    permissionHighlights: [
      "Finance can approve, reject, and issue conditional comments.",
      "Legal Affairs can finalize archive evidence and immutable document output.",
      "External reviewers only access delegated approval requests.",
    ],
    auditHighlights: [
      "Approval actions capture delegation source, comments, and route changes.",
      "PDF access and download events remain visible to compliance and auditors.",
    ],
    evidenceHighlights: [
      "Generated PDFs carry evidence ID, version, watermark, and QR validation.",
      "Final signed notes are locked against edit or workflow regression.",
    ],
    notificationChannels: ["Email", "In-app"],
    searchRecords: [
      { id: "PN-2026-0198", label: "Promissory Note PN-2026-0198", href: "/modules/promissory-notes/documents", meta: "Finance conditional review · SAR 48,000" },
      { id: "CASE-2001", label: "Patient Undertaking Case 2001", href: "/modules/promissory-notes/audit-trail", meta: "Legal archive pending" },
    ],
  },
  "legal-cases": {
    state: "pending-approval",
    approvalMode: "Parallel legal committee approval with delegated reviewer coverage",
    workspaceLabel: "Legal Case LC-2026-1023",
    summaryCards: [
      { label: "Active legal cases", value: "23", tone: "primary", detail: "7 cross-functional review boards" },
      { label: "Approval bottlenecks", value: "5", tone: "warning", detail: "Awaiting medical director decision" },
      { label: "Escalation paths active", value: "2", tone: "danger", detail: "Counsel review triggered" },
      { label: "Archived defensible files", value: "241", tone: "success", detail: "Evidence viewer available" },
    ],
    permissionHighlights: [
      "Legal Affairs owns final approvals, holds, and escalation authority.",
      "Medical Director can approve, reject, or request clarification on shared cases.",
      "External reviewers see delegated worklists only.",
    ],
    auditHighlights: [
      "Case ownership changes, reviewer assignment, and committee votes are visible.",
      "Audit visibility includes who accessed, modified, and exported legal content.",
    ],
    evidenceHighlights: [
      "Evidence viewer surfaces signature proof, timestamps, IP logs, and hash integrity.",
      "Archive packages remain versioned and immutable after final approval.",
    ],
    notificationChannels: ["Email", "In-app", "Escalation alerts"],
    searchRecords: [
      { id: "LC-2026-1023", label: "Case #1023", href: "/modules/legal-cases/audit-trail", meta: "Audit Timeline · Pending committee approval" },
      { id: "PAT-7711", label: "Patient Complaint Appeal", href: "/modules/legal-cases/workflow", meta: "Legal hold active" },
    ],
  },
  "legal-documents": {
    state: "approved",
    approvalMode: "Sequential drafting, legal approval, and controlled release",
    workspaceLabel: "Document LD-2026-3301",
    summaryCards: [
      { label: "Documents awaiting release", value: "14", tone: "primary", detail: "Approved and ready for watermarking" },
      { label: "Locked final documents", value: "412", tone: "success", detail: "Versioned with QR references" },
      { label: "Conditional revisions", value: "6", tone: "warning", detail: "Clause remediation required" },
      { label: "High-risk exports", value: "1", tone: "danger", detail: "Compliance watch applied" },
    ],
    permissionHighlights: [
      "Legal Affairs can approve, release, watermark, and archive final documents.",
      "Finance can access approved financial attachments only.",
      "Auditors only view released versions and evidence history.",
    ],
    auditHighlights: [
      "Document versions, watermark changes, downloads, and release events are logged.",
      "Immutable finalization status remains visible per document.",
    ],
    evidenceHighlights: [
      "Every PDF exposes version number, audit reference, QR validation, and evidence ID.",
      "Downloads preserve origin metadata for legal defensibility.",
    ],
    notificationChannels: ["Email", "In-app"],
    searchRecords: [
      { id: "DOC-3301", label: "Legal Notice DOC-3301", href: "/modules/legal-documents/documents", meta: "Version 7 · Approved for release" },
      { id: "REF-8881", label: "Document Reference 8881", href: "/modules/legal-documents/audit-trail", meta: "Watermark updated yesterday" },
    ],
  },
  "incident-reports": {
    state: "under-review",
    approvalMode: "Parallel risk, compliance, and legal review",
    workspaceLabel: "Incident IR-2026-0812",
    summaryCards: [
      { label: "Open incidents", value: "18", tone: "danger", detail: "4 regulator notices overdue" },
      { label: "SLA watchlist", value: "7", tone: "warning", detail: "Escalation within 12 hours" },
      { label: "Contained incidents", value: "9", tone: "primary", detail: "Awaiting closure approval" },
      { label: "Closed incident files", value: "62", tone: "success", detail: "Legal evidence attached" },
    ],
    permissionHighlights: [
      "Risk Managers can triage, escalate, and assign mitigation owners.",
      "Compliance and Legal Affairs can request clarification or place legal hold.",
      "Clinical reporters only access incidents they created or were assigned to.",
    ],
    auditHighlights: [
      "Incident containment, notification, and remediation steps are fully timestamped.",
      "Device/IP metadata is retained for evidence-sensitive events.",
    ],
    evidenceHighlights: [
      "Incident evidence chain records every workflow change and attachment download.",
      "Final reports retain versioning and legal references.",
    ],
    notificationChannels: ["Email", "In-app", "SMS-ready", "Escalation alerts"],
    searchRecords: [
      { id: "IR-2026-0812", label: "Incident IR-2026-0812", href: "/modules/incident-reports/risk-analysis", meta: "Severity high · Compliance review" },
      { id: "CASE-991", label: "Medication Event Review", href: "/modules/incident-reports/timeline", meta: "Awaiting legal comment" },
    ],
  },
  "risk-management": {
    state: "pending-approval",
    approvalMode: "Sequential risk scoring with executive approval",
    workspaceLabel: "Risk Review RM-2026-0507",
    summaryCards: [
      { label: "High-risk workflows", value: "8", tone: "danger", detail: "2 require executive escalation" },
      { label: "Bottlenecks detected", value: "11", tone: "warning", detail: "Average delay 18 hours" },
      { label: "Mitigations in progress", value: "19", tone: "primary", detail: "Cross-module routing active" },
      { label: "Closed mitigations", value: "77", tone: "success", detail: "Audit evidence complete" },
    ],
    permissionHighlights: [
      "Risk Managers can escalate, re-route, and approve mitigation plans.",
      "Compliance and Quality can request clarifications and review evidence.",
      "Auditors only see risk posture, evidence, and final actions.",
    ],
    auditHighlights: [
      "Risk scoring changes and approval decisions remain visible end-to-end.",
      "SLA breach flags expose overdue mitigation and routing latency.",
    ],
    evidenceHighlights: [
      "Legal evidence view links risk alerts to supporting workflow events.",
      "Approved mitigations are sealed with versioned evidence references.",
    ],
    notificationChannels: ["Email", "In-app", "Escalation alerts"],
    searchRecords: [
      { id: "RM-2026-0507", label: "Risk Review RM-2026-0507", href: "/modules/risk-management/workflow", meta: "Executive approval pending" },
      { id: "CASE-5510", label: "Cross-module bottleneck case", href: "/modules/risk-management/timeline", meta: "Escalated from incident reports" },
    ],
  },
  approvals: {
    state: "pending-approval",
    approvalMode: "Unified enterprise approval matrix with sequential and parallel lanes",
    workspaceLabel: "Approval Chain AP-2026-2702",
    summaryCards: [
      { label: "Pending approvals", value: "31", tone: "warning", detail: "9 parallel chains active" },
      { label: "Delegations active", value: "6", tone: "primary", detail: "3 auto-delegated due to leave" },
      { label: "Rejected requests", value: "4", tone: "danger", detail: "Awaiting revision routing" },
      { label: "Completed chains", value: "203", tone: "success", detail: "All evidence sealed" },
    ],
    permissionHighlights: [
      "Approvers only see actions when they are the active authority or delegate.",
      "Finance and Legal can record conditional approvals with comments.",
      "Auditors see approver, rejection, escalation, and SLA delay history.",
    ],
    auditHighlights: [
      "Approval matrix preserves every vote, delegation, and escalation event.",
      "Who accessed, changed, approved, or rejected is always visible.",
    ],
    evidenceHighlights: [
      "Evidence viewer exposes approval path, delay markers, device metadata, and signatures.",
      "Final PDFs reference the governing approval chain and version.",
    ],
    notificationChannels: ["Email", "In-app", "SMS-ready", "Escalation alerts"],
    searchRecords: [
      { id: "AP-2026-2702", label: "Approval Chain AP-2026-2702", href: "/modules/approvals/workflow", meta: "Sequential + parallel approvers" },
      { id: "REQ-7720", label: "Clarification Request REQ-7720", href: "/modules/approvals/timeline", meta: "Finance conditional approval" },
    ],
  },
};

function roleLabel(role: CanonicalUserRole): string {
  return ROLE_LABELS[role] || "Unknown Role";
}

function isRoleAllowed(action: EnterpriseActionDefinition, role: CanonicalUserRole, moduleKey: ModuleKey): boolean {
  const moduleAllowed = !action.modules || action.modules.includes(moduleKey);
  return moduleAllowed && action.roles.includes(role);
}

function buildWorkflowSteps(state: EnterpriseWorkflowState): EnterpriseWorkflowStep[] {
  const currentIndex = WORKFLOW_SEQUENCE.indexOf(state);

  return [
    ...WORKFLOW_SEQUENCE.map((step, index) => {
      let status: EnterpriseWorkflowStep["status"] = "pending";
      if (step === state) {
        status = "current";
      } else if (currentIndex >= 0 && index < currentIndex) {
        status = "completed";
      }

      if (state === "escalated" && step === "pending-approval") {
        status = "escalated";
      }

      if (state === "expired" && step === "pending-approval") {
        status = "overdue";
      }

      return {
        key: step,
        label: step.replace(/-/g, " ").replace(/\b\w/g, (value) => value.toUpperCase()),
        status,
        detail:
          status === "current"
            ? "Active enterprise workflow step"
            : status === "completed"
              ? "Completed with audit evidence"
              : status === "escalated"
                ? "Escalated due to SLA breach"
                : status === "overdue"
                  ? "Overdue and awaiting intervention"
                  : "Pending prior approvals",
      };
    }),
    ...(state === "returned-for-revision"
      ? [{
          key: "returned-for-revision" as EnterpriseWorkflowState,
          label: "Returned for Revision",
          status: "current" as const,
          detail: "Returned with mandatory remediation comments",
        }]
      : []),
    ...(state === "rejected"
      ? [{
          key: "rejected" as EnterpriseWorkflowState,
          label: "Rejected",
          status: "current" as const,
          detail: "Rejected with governance rationale",
        }]
      : []),
    ...(state === "escalated"
      ? [{
          key: "escalated" as EnterpriseWorkflowState,
          label: "Escalated",
          status: "current" as const,
          detail: "Escalation chain and backup approvers activated",
        }]
      : []),
    ...(state === "expired"
      ? [{
          key: "expired" as EnterpriseWorkflowState,
          label: "Expired",
          status: "current" as const,
          detail: "SLA expired; executive follow-up required",
        }]
      : []),
  ];
}

function buildTimeline(moduleKey: ModuleKey, state: EnterpriseWorkflowState): EnterpriseTimelineEvent[] {
  const prefix = moduleKey.toUpperCase().slice(0, MODULE_PREFIX_LENGTH);

  return [
    {
      id: `${prefix}-01`,
      action: "Draft created and ownership assigned",
      user: "Dr. Amal Hassan",
      role: "Physician",
      timestamp: "2026-05-11 08:15",
      comments: "Primary record initiated with patient and case context.",
      attachment: "Initial clinical note",
      ipAddress: "10.22.4.19",
      device: "IMC-NURSE-STATION-14",
    },
    {
      id: `${prefix}-02`,
      action: "Workflow submitted to governed review",
      user: "Rana Al-Shammari",
      role: "Patient Relations",
      timestamp: "2026-05-11 10:42",
      comments: "Patient-facing disclosures completed and routed onward.",
      attachment: "Disclosure acknowledgment",
      ipAddress: "10.22.5.31",
      device: "IMC-MOBILE-CLINIC-07",
    },
    {
      id: `${prefix}-03`,
      action: state === "escalated" ? "Escalation triggered after SLA breach" : "Approval review executed",
      user: "Khaled Al-Harthi",
      role: state === "escalated" ? "Risk Manager" : "Legal Affairs",
      timestamp: "2026-05-12 14:06",
      comments: state === "escalated" ? "Backup approver engaged and committee notified." : "Legal control review completed with comments.",
      attachment: state === "escalated" ? "Escalation memo" : "Review checklist",
      ipAddress: "10.22.7.84",
      device: "IMC-LEGAL-DESKTOP-04",
    },
    {
      id: `${prefix}-04`,
      action: "Audit evidence sealed",
      user: "Compliance Bot",
      role: "Compliance",
      timestamp: "2026-05-12 14:08",
      comments: "Hash, version, QR reference, and device metadata committed.",
      attachment: "Evidence package manifest",
      ipAddress: "172.16.0.9",
      device: "workflow-orchestrator",
    },
  ];
}

function buildApprovalSteps(moduleKey: ModuleKey, state: EnterpriseWorkflowState): EnterpriseApprovalStep[] {
  const baseSteps: Record<ModuleKey, EnterpriseApprovalStep[]> = {
    "informed-consents": [
      { label: "Clinical completeness", approver: "Dr. Amal Hassan", role: "Physician", status: "approved", detail: "Submitted with signed disclosure evidence" },
      { label: "Nursing witness", approver: "Nora Saleh", role: "Nurse", status: "approved", detail: "Witness signature captured" },
      { label: "Legal approval", approver: "Khaled Al-Harthi", role: "Legal Affairs", status: "pending", detail: "Conditional comment requested" },
      { label: "Compliance archive", approver: "Maha Al-Ghamdi", role: "Compliance", status: "pending", detail: "Awaiting final legal outcome" },
    ],
    "discharge-refusal": [
      { label: "Physician decision", approver: "Dr. Mona Ali", role: "Physician", status: "approved", detail: "Clinical discharge decision confirmed" },
      { label: "Legal review", approver: "Khaled Al-Harthi", role: "Legal Affairs", status: state === "escalated" ? "escalated" : "pending", detail: "Escalated after delayed approval" },
      { label: "Risk governance", approver: "Reem Al-Qahtani", role: "Risk Manager", status: state === "escalated" ? "pending" : "delegated", detail: "Backup approver activated" },
      { label: "Medical director", approver: "Dr. Saad Omar", role: "Medical Director", status: "pending", detail: "Final oversight required" },
    ],
    "promissory-notes": [
      { label: "Finance review", approver: "Faisal Al-Harbi", role: "Finance", status: "approved", detail: "Amount and debtor identity validated" },
      { label: "Legal conditional approval", approver: "Sara Al-Zamil", role: "Legal Affairs", status: "pending", detail: "Pending amendment on collection clause" },
      { label: "Archive release", approver: "Maha Al-Ghamdi", role: "Compliance", status: "pending", detail: "Awaiting final PDF package" },
      { label: "Delegation fallback", approver: "Backup Finance Pool", role: "Finance", status: "delegated", detail: "Temporary delegation rule active" },
    ],
    "legal-cases": [
      { label: "Case owner", approver: "Omar Al-Salem", role: "Legal Affairs", status: "approved", detail: "Initial legal review complete" },
      { label: "Medical governance", approver: "Dr. Saad Omar", role: "Medical Director", status: "pending", detail: "Clinical clarification required" },
      { label: "External reviewer", approver: "Panel Counsel", role: "External Reviewer", status: "delegated", detail: "Delegated during leave window" },
      { label: "Final case approval", approver: "Governance Board", role: "Compliance", status: "pending", detail: "Board vote queued" },
    ],
    "legal-documents": [
      { label: "Document drafting", approver: "Sara Al-Zamil", role: "Legal Affairs", status: "approved", detail: "Draft complete and versioned" },
      { label: "Conditional finance review", approver: "Faisal Al-Harbi", role: "Finance", status: "approved", detail: "Financial appendix approved" },
      { label: "Controlled release", approver: "Maha Al-Ghamdi", role: "Compliance", status: "pending", detail: "Watermark verification required" },
      { label: "Archive lock", approver: "Audit Center", role: "Read-Only Auditor", status: "pending", detail: "Awaiting final release" },
    ],
    "incident-reports": [
      { label: "Incident triage", approver: "Reem Al-Qahtani", role: "Risk Manager", status: "approved", detail: "Severity and scope confirmed" },
      { label: "Compliance review", approver: "Maha Al-Ghamdi", role: "Compliance", status: "pending", detail: "Notification requirements being reviewed" },
      { label: "Legal review", approver: "Khaled Al-Harthi", role: "Legal Affairs", status: "pending", detail: "Evidence review in progress" },
      { label: "Executive closure", approver: "Dr. Saad Omar", role: "Medical Director", status: "pending", detail: "Closure approval pending" },
    ],
    "risk-management": [
      { label: "Risk scoring", approver: "Reem Al-Qahtani", role: "Risk Manager", status: "approved", detail: "Residual risk updated" },
      { label: "Quality review", approver: "Lama Al-Faraj", role: "Quality", status: "approved", detail: "Bottleneck analysis accepted" },
      { label: "Compliance review", approver: "Maha Al-Ghamdi", role: "Compliance", status: "pending", detail: "Evidence validation pending" },
      { label: "Executive approval", approver: "Dr. Saad Omar", role: "Medical Director", status: "pending", detail: "Awaiting final sign-off" },
    ],
    approvals: [
      { label: "Lane A · Legal", approver: "Sara Al-Zamil", role: "Legal Affairs", status: "approved", detail: "Primary legal approval recorded" },
      { label: "Lane B · Finance", approver: "Faisal Al-Harbi", role: "Finance", status: "pending", detail: "Conditional approval comment drafted" },
      { label: "Lane C · Compliance", approver: "Maha Al-Ghamdi", role: "Compliance", status: "delegated", detail: "Backup approver in effect until Friday" },
      { label: "Lane D · Executive", approver: "Dr. Saad Omar", role: "Medical Director", status: "pending", detail: "Triggered after legal + finance consensus" },
    ],
  };

  return baseSteps[moduleKey];
}

function buildSidebarGroups(moduleKey: ModuleKey, access: ModuleAccessContext): EnterpriseSidebarGroup[] {
  const accessibleModules = getAccessibleModules(access);
  const currentHref = getModuleDefinition(moduleKey).href;

  const operations = accessibleModules.filter((item) =>
    ["informed-consents", "discharge-refusal", "promissory-notes", "legal-cases"].includes(item.key),
  );
  const governance = accessibleModules.filter((item) =>
    ["legal-documents", "incident-reports", "risk-management", "approvals"].includes(item.key),
  );

  return [
    {
      title: "Clinical & Legal Operations",
      items: [
        { label: "Dashboard", href: "/dashboard", current: false },
        ...operations.map((item) => ({
          label: item.englishTitle,
          href: item.href,
          current: item.href === currentHref,
        })),
      ],
    },
    {
      title: "Governance & Evidence",
      items: [
        ...governance.map((item) => ({
          label: item.englishTitle,
          href: item.href,
          current: item.href === currentHref,
        })),
        { label: "Audit Center", href: "/reports", current: false },
        { label: "Notifications", href: "/alerts", current: false },
        { label: "Settings", href: "/settings", current: false },
      ],
    },
  ];
}

function buildSectionTabs(moduleKey: ModuleKey, currentSection: EnterpriseSectionKey) {
  const hrefRoot = getModuleDefinition(moduleKey).href;

  return ENTERPRISE_SECTION_KEYS.map((sectionKey) => ({
    key: sectionKey,
    label: SECTION_LABELS[sectionKey],
    href: sectionKey === "overview" ? hrefRoot : `${hrefRoot}/${sectionKey}`,
    active: currentSection === sectionKey,
  }));
}

export function normalizeEnterpriseSectionKey(section?: string | null): EnterpriseSectionKey {
  if (!section) {
    return "overview";
  }
  return (ENTERPRISE_SECTION_KEYS as readonly string[]).includes(section) ? (section as EnterpriseSectionKey) : "overview";
}

export function isValidEnterpriseSectionKey(section?: string | null): section is EnterpriseSectionKey {
  return Boolean(section && normalizeEnterpriseSectionKey(section) === section);
}

export function buildEnterpriseWorkspaceView(
  moduleKey: ModuleKey,
  access: ModuleAccessContext,
  section?: string | null,
): EnterpriseWorkspaceView {
  const moduleDefinition = getModuleDefinition(moduleKey);
  const scenario = MODULE_SCENARIOS[moduleKey];
  const viewerRole = (access.platformRole ? "platform_admin" : canonicalizeUserRole(access.role)) as CanonicalUserRole;
  const currentSection = normalizeEnterpriseSectionKey(section);

  const contextActions = ACTION_DEFINITIONS
    .filter((action) => isRoleAllowed(action, viewerRole, moduleKey) && action.stages.includes(scenario.state))
    .sort((left, right) => left.priority - right.priority);

  const quickActions = ACTION_DEFINITIONS
    .filter((action) =>
      isRoleAllowed(action, viewerRole, moduleKey)
      && ["assign-reviewer", "escalate", "generate-pdf", "request-signature"].includes(action.key),
    )
    .sort((left, right) => left.priority - right.priority);

  return {
    moduleDefinition,
    viewerRole,
    currentSection,
    activeState: scenario.state,
    summaryCards: scenario.summaryCards,
    workflowSteps: buildWorkflowSteps(scenario.state),
    timeline: buildTimeline(moduleKey, scenario.state),
    contextActions,
    quickActions,
    approvalSteps: buildApprovalSteps(moduleKey, scenario.state),
    sidebarGroups: buildSidebarGroups(moduleKey, access),
    sectionTabs: buildSectionTabs(moduleKey, currentSection),
    searchPlaceholder: "Search by patient, MRN, case ID, consent ID, physician, or document number",
    searchRecords: scenario.searchRecords,
    permissionHighlights: scenario.permissionHighlights,
    auditHighlights: scenario.auditHighlights,
    evidenceHighlights: scenario.evidenceHighlights,
    notificationChannels: scenario.notificationChannels,
    approvalMode: scenario.approvalMode,
    workspaceLabel: scenario.workspaceLabel,
  };
}

export function getEnterpriseRoleLabel(access: ModuleAccessContext): string {
  const role = (access.platformRole ? "platform_admin" : canonicalizeUserRole(access.role)) as CanonicalUserRole;
  return roleLabel(role);
}
