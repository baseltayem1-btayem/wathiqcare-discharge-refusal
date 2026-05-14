"use client";

export const dynamic = "force-dynamic";

import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import LegalAlertsCenter from "@/components/legal-alerts/LegalAlertsCenter";

export default function LegalAlertsPage() {
    return (
        <AuthGuard>
            <AppShell
                title="Legal Alert Center"
                subtitle="Persistent fallback alerts, acknowledgments, and tenant escalation settings."
            >
                <LegalAlertsCenter />
            </AppShell>
        </AuthGuard>
    );
}
