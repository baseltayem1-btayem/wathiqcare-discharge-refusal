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
    Bell,
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
    Users,
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
    { href: "/cases", label: "Cases", icon: <FolderKanban className="h-4 w-4" /> },
    { href: "/dashboards", label: "Dashboards", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/reports", label: "Reports", icon: <Archive className="h-4 w-4" /> },
    { href: "/admin", label: "Admin", icon: <ShieldCheck className="h-4 w-4" /> },
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
<<<<<<< HEAD
        href: (caseId: string) => `/cases/${caseId}`,
=======
        href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/initial-communication`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
        labelKey: "workflow.stage.initial_communication",
        icon: <MessageSquareHeart className="h-4 w-4" />,
    },
    {
        key: "support_and_intervention",
<<<<<<< HEAD
        href: (caseId: string) => `/cases/${caseId}`,
=======
        href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/social-services`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
<<<<<<< HEAD
        href: (_caseId: string) => `/legal-escalation`,
=======
        href: (caseId: string) => `/workflow/medical-discharge-refusal/case/${caseId}/escalation-review`,
>>>>>>> 8b4edbb0e6b97c2ecf6f01145c6f0146116c6f6e
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
