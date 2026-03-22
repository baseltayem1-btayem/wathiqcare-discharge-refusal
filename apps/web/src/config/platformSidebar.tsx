/**
 * PLATFORM ADMIN sidebar — System Operations only.
 *
 * This file contains ONLY platform-level navigation items.
 * It must NEVER include tenant operational routes.
 * Import this ONLY in PlatformAdminShell.
 */

import { Activity, Building2, ClipboardList, CreditCard, LayoutGrid, LifeBuoy, Settings } from "lucide-react";

export type PlatformNavItem = {
    href: string;
    label: string;
    icon: React.ReactNode;
};

/** Strict set of 8 platform-only navigation entries. No tenant routes here. */
export const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
    { href: "/platform", label: "Platform Overview", icon: <LayoutGrid className="h-4 w-4" /> },
    { href: "/platform/tenants", label: "Tenant Management", icon: <Building2 className="h-4 w-4" /> },
    { href: "/platform/subscriptions", label: "Subscription Management", icon: <CreditCard className="h-4 w-4" /> },
    { href: "/platform/billing", label: "Billing Dashboard", icon: <CreditCard className="h-4 w-4" /> },
    { href: "/platform/health", label: "System Health", icon: <Activity className="h-4 w-4" /> },
    { href: "/platform/audit", label: "Audit Logs", icon: <ClipboardList className="h-4 w-4" /> },
    { href: "/platform/support", label: "Support Tools", icon: <LifeBuoy className="h-4 w-4" /> },
    { href: "/platform/settings", label: "Platform Settings", icon: <Settings className="h-4 w-4" /> },
];
