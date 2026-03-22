/**
 * TENANT sidebar — Operational modules only.
 *
 * This file contains ONLY tenant-facing navigation items.
 * It must NEVER include /platform routes.
 * Import this ONLY in AppShell (tenant shell).
 */

import {
    AlertTriangle,
    Archive,
    CheckCircle2,
    ClipboardList,
    Database,
    FileCheck2,
    FileCog,
    FilePlus2,
    FileSignature,
    FileText,
    FolderKanban,
    Gavel,
    HandHelping,
    LayoutGrid,
    MessageSquareHeart,
    Rocket,
    ShieldCheck,
    Stethoscope,
    Timer,
} from "lucide-react";

export type TenantNavItem = {
    href: string;
    labelKey?: string;
    label?: string;
    icon: React.ReactNode;
    disabled?: boolean;
};

/** Full tenant operational menu. No /platform routes here. */
export const TENANT_NAV_ITEMS: TenantNavItem[] = [
    { href: "/dashboard", labelKey: "nav.dashboard", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/cases", labelKey: "nav.cases", icon: <FolderKanban className="h-4 w-4" /> },
    { href: "/operations", label: "Operations", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/operations/inboxes", label: "Department Inboxes", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/cases/new", labelKey: "nav.newCase", icon: <FilePlus2 className="h-4 w-4" /> },
    { href: "/workflow", labelKey: "nav.workflowDocs", icon: <FileCog className="h-4 w-4" /> },
    { href: "/refusal-forms", labelKey: "nav.refusalForms", icon: <FileSignature className="h-4 w-4" /> },
    { href: "/legal-escalation", labelKey: "nav.legalEscalation", icon: <AlertTriangle className="h-4 w-4" /> },
    { href: "/escalation-timeline", labelKey: "nav.escalationTimeline", icon: <Timer className="h-4 w-4" /> },
    { href: "/legal-case-file", labelKey: "nav.legalCaseFile", icon: <Gavel className="h-4 w-4" /> },
    { href: "/audit-log", labelKey: "nav.auditViewer", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/icd11-validator", labelKey: "nav.icd11Validator", icon: <CheckCircle2 className="h-4 w-4" /> },
    { href: "/emr-integration", labelKey: "nav.emrIntegration", icon: <Database className="h-4 w-4" /> },
    { href: "/consents", labelKey: "nav.consents", icon: <FileCheck2 className="h-4 w-4" /> },
    { href: "/compliance", labelKey: "nav.compliance", icon: <ShieldCheck className="h-4 w-4" /> },
    { href: "/bundles", labelKey: "nav.bundles", icon: <Archive className="h-4 w-4" /> },
    { href: "/launch-status", labelKey: "nav.launchStatus", icon: <Rocket className="h-4 w-4" /> },
    { href: "/admin", labelKey: "nav.admin", icon: <ShieldCheck className="h-4 w-4" /> },
];

/** Case workflow stage navigation — used when workflowCaseNav prop is passed to AppShell. */
export const CASE_STAGE_NAV_DEF = [
    {
        key: "medical_discharge_decision",
        href: (caseId: string) => `/cases/${caseId}`,
        labelKey: "workflow.stage.medical_discharge_decision",
        icon: <Stethoscope className="h-4 w-4" />,
    },
    {
        key: "initial_communication",
        href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/initial-communication`,
        labelKey: "workflow.stage.initial_communication",
        icon: <MessageSquareHeart className="h-4 w-4" />,
    },
    {
        key: "support_and_intervention",
        href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/social-services`,
        labelKey: "workflow.stage.support_and_intervention",
        icon: <HandHelping className="h-4 w-4" />,
    },
    {
        key: "refusal_form",
        href: (caseId: string) => `/cases/${caseId}/refusal-form`,
        labelKey: "workflow.stage.refusal_form",
        icon: <FileSignature className="h-4 w-4" />,
    },
    {
        key: "official_notification",
        href: (caseId: string) => `/cases/${caseId}/financial-notice`,
        labelKey: "workflow.stage.official_notification",
        icon: <FileText className="h-4 w-4" />,
    },
    {
        key: "escalation",
        href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/escalation-review`,
        labelKey: "workflow.stage.escalation",
        icon: <AlertTriangle className="h-4 w-4" />,
    },
    {
        key: "closed",
        href: (caseId: string) => `/cases/${caseId}`,
        labelKey: "workflow.stage.closed",
        icon: <Archive className="h-4 w-4" />,
    },
] as const;
