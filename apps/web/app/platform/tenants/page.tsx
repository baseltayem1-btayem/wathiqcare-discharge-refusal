"use client";

import SectionErrorBoundary from "./_components/SectionErrorBoundary";
import TenantListSection from "./_components/TenantListSection";

/**
 * Platform Tenants page -- thin orchestrator.
 *
 * Auth is already resolved by PlatformLayout before this component mounts;
 * this page only composes isolated sections. Each section is wrapped in
 * SectionErrorBoundary so a JS crash in one widget cannot blank the whole page.
 *
 * To add more sections (e.g. billing overview, usage charts) in the future,
 * append additional <SectionErrorBoundary> blocks here.
 */
export default function TenantsPage() {
  return (
    <div className="space-y-6">
      <SectionErrorBoundary sectionName="Tenant list">
        <TenantListSection />
      </SectionErrorBoundary>
    </div>
  );
}
