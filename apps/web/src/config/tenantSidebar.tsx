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
    BellRing,
    ChartNoAxesColumn,
    FileSignature,
    FileText,
    FolderKanban,
    HandHelping,
    LayoutDashboard,
    LayoutGrid,
    Layers3,
    MessageSquareHeart,
    Settings,
    ShieldCheck,
    ShieldAlert,
    Stethoscope,
    Users,
} from "lucide-react";

export type TenantNavItem = {
    href: string;
    labelKey?: string;
    icon: React.ReactNode;
    disabled?: boolean;
};

/** Full tenant operational menu. No /platform routes here. */
export const TENANT_NAV_ITEMS: TenantNavItem[] = [
    { href: "/modules", labelKey: "nav.modules", icon: <Layers3 className="h-4 w-4" /> },
    { href: "/modules/informed-consents/create", labelKey: "nav.informedConsents", icon: <FileSignature className="h-4 w-4" /> },
    { href: "/dashboard", labelKey: "nav.dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/cases", labelKey: "nav.cases", icon: <FolderKanban className="h-4 w-4" /> },
    { href: "/documents", labelKey: "nav.documents", icon: <FileText className="h-4 w-4" /> },
    { href: "/alerts", labelKey: "nav.alerts", icon: <BellRing className="h-4 w-4" /> },
    { href: "/legal-risk", labelKey: "nav.legalRisk", icon: <ShieldAlert className="h-4 w-4" /> },
    { href: "/reports", labelKey: "nav.reports", icon: <ChartNoAxesColumn className="h-4 w-4" /> },
    { href: "/users", labelKey: "nav.users", icon: <Users className="h-4 w-4" /> },
    { href: "/settings", labelKey: "nav.settings", icon: <Settings className="h-4 w-4" /> },
    { href: "/dashboards", labelKey: "nav.dashboards", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/bundles", labelKey: "nav.bundles", icon: <Archive className="h-4 w-4" /> },
    { href: "/analytics", labelKey: "nav.analytics", icon: <ChartNoAxesColumn className="h-4 w-4" /> },
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
