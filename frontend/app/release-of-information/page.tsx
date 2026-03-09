"use client";

import AuthGuard from "@/components/AuthGuard";
import PrimaryActionButton from "@/ui/components/PrimaryActionButton";
import SecondaryActionButton from "@/ui/components/SecondaryActionButton";

const roiSteps = ["Request", "Identity Verification", "Review", "Release", "Archive"];

export default function ReleaseOfInformationPage() {
  return (
    <AuthGuard>
      <div className="space-y-4">
        <header>
          <p className="ui-kicker">ROI Module</p>
          <h1 className="ui-title">Release of Information</h1>
          <p className="ui-subtitle">Step-based ROI workflow with verification, review, release, and archive controls.</p>
        </header>

        <section className="ui-panel p-4">
          <h2 className="text-base font-semibold text-[var(--ui-text)]">ROI Workflow</h2>
          <ol className="mt-3 grid gap-2 md:grid-cols-5">
            {roiSteps.map((step, index) => (
              <li key={step} className="rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-2)] p-3 text-sm">
                <p className="font-semibold text-[var(--ui-text)]">{step}</p>
                <p className="text-xs text-[var(--ui-muted)]">{index === 0 ? "Current" : "Upcoming"}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="ui-panel p-4">
          <h2 className="text-base font-semibold text-[var(--ui-text)]">ROI Request Form</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Requester</span>
              <input className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" placeholder="Requester name" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Relationship</span>
              <input className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" placeholder="Relationship to patient" />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium">Purpose</span>
              <input className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" placeholder="Purpose of release" />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block font-medium">Documents Requested</span>
              <textarea className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" rows={3} placeholder="List requested documents" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Date Range</span>
              <input className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" placeholder="2026-01-01 to 2026-03-01" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Authorized Recipient</span>
              <input className="w-full rounded-xl border border-[var(--ui-border)] px-3 py-2" placeholder="Recipient entity" />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryActionButton type="button">Submit Request</PrimaryActionButton>
            <SecondaryActionButton type="button">Save Draft</SecondaryActionButton>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
