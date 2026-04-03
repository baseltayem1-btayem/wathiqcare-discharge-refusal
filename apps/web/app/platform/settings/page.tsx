"use client";

import { Settings, ShieldCheck, Mail, Palette, Wrench } from "lucide-react";

const sections = [
    {
        title: "General Platform Settings",
        description: "Global SaaS operator settings for platform behavior and defaults.",
        icon: <Settings className="h-4 w-4" />,
        status: "Ready for backend integration",
    },
    {
        title: "Authentication / SSO Readiness",
        description: "Operator-level controls for enterprise auth providers and SSO rollout readiness.",
        icon: <ShieldCheck className="h-4 w-4" />,
        status: "Safe placeholder",
    },
    {
        title: "Email / Notifications",
        description: "Platform-wide outbound email and notification configuration health.",
        icon: <Mail className="h-4 w-4" />,
        status: "Safe placeholder",
    },
    {
        title: "Branding",
        description: "WathiqCare platform branding configuration for operator surfaces only.",
        icon: <Palette className="h-4 w-4" />,
        status: "Safe placeholder",
    },
    {
        title: "Maintenance Controls",
        description: "Operational toggles and maintenance-mode controls for platform operations.",
        icon: <Wrench className="h-4 w-4" />,
        status: "Safe placeholder",
    },
];

export default function PlatformSettingsPage() {
    return (
        <>
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Platform Settings</h2>
                <p className="mt-1 text-sm text-gray-500">Operator-level configuration for the WathiqCare SaaS platform.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {sections.map((section) => (
                    <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="mb-2 inline-flex items-center gap-2 text-slate-800">
                            {section.icon}
                            <h3 className="text-base font-semibold">{section.title}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{section.description}</p>
                        <p className="mt-3 inline-flex rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {section.status}
                        </p>
                    </article>
                ))}
            </div>
        </>
    );
}
