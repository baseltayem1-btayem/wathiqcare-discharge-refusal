"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Clock3, FileSearch, Lock, Route, Search, ShieldCheck, TimerReset, Workflow } from "lucide-react";

import ModuleShell from "@/components/ModuleShell";
import {
  buildEnterpriseWorkspaceView,
  getEnterpriseRoleLabel,
  type EnterpriseSectionKey,
  type EnterpriseWorkflowStep,
} from "@/lib/enterprise/workspace";
import type { ModuleAccessContext, ModuleKey } from "@/lib/modules/catalog";

type EnterpriseModuleWorkspacePageProps = {
  auth: ModuleAccessContext & {
    email?: string;
    platform_role?: string | null;
  };
  moduleKey: ModuleKey;
  section?: string | null;
};

function stepTone(step: EnterpriseWorkflowStep) {
  switch (step.status) {
    case "completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "current":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "escalated":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "overdue":
      return "border-rose-200 bg-rose-50 text-rose-800";
    default:
      return "border-slate-200 bg-white text-slate-600";
  }
}

function summaryTone(tone: "primary" | "success" | "warning" | "danger") {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50";
    case "warning":
      return "border-amber-200 bg-amber-50";
    case "danger":
      return "border-rose-200 bg-rose-50";
    default:
      return "border-sky-200 bg-sky-50";
  }
}

function SectionPanel({
  id,
  title,
  active,
  children,
}: {
  id: EnterpriseSectionKey;
  title: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`wc-panel space-y-3 ${active ? "ring-2 ring-[var(--primary)]/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="wc-panel-heading">{title}</div>
        {active ? <span className="wc-module-pill">Current tab</span> : null}
      </div>
      {children}
    </section>
  );
}

export default function EnterpriseModuleWorkspacePage({
  auth,
  moduleKey,
  section,
}: EnterpriseModuleWorkspacePageProps) {
  const workspace = buildEnterpriseWorkspaceView(moduleKey, {
    role: auth.role,
    platformRole: auth.platform_role,
  }, section);
  const [searchQuery, setSearchQuery] = useState("");
  const viewerRoleLabel = getEnterpriseRoleLabel({ role: auth.role, platformRole: auth.platform_role });

  const filteredSearch = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return workspace.searchRecords;
    }

    return workspace.searchRecords.filter((item) =>
      [item.id, item.label, item.meta].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [searchQuery, workspace.searchRecords]);

  return (
    <ModuleShell
      auth={auth}
      moduleKey={moduleKey}
      title={{
        ar: workspace.moduleDefinition.arabicTitle,
        en: workspace.moduleDefinition.englishTitle,
      }}
      subtitle={{
        ar: workspace.moduleDefinition.executiveDescription.ar,
        en: workspace.moduleDefinition.executiveDescription.en,
      }}
      eyebrow={{
        ar: "طبقة تجربة مستخدم مؤسسية",
        en: "Enterprise UX Architecture Layer",
      }}
      menuItems={workspace.sectionTabs.map((item) => ({
        href: item.href,
        label: { ar: item.label, en: item.label },
      }))}
      nextAction={workspace.contextActions[0]
        ? {
            href: workspace.contextActions[0].href,
            label: workspace.contextActions[0].label,
            variant: "primary",
          }
        : null}
      quickActions={workspace.quickActions.map((item) => ({
        href: item.href,
        label: item.label,
        variant: "secondary",
      }))}
    >
      <div className="space-y-4">
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {workspace.summaryCards.map((card) => (
            <div key={card.label} className={`rounded-2xl border p-4 ${summaryTone(card.tone)}`}>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{card.label}</div>
              <div className="mt-3 text-3xl font-bold text-slate-900">{card.value}</div>
              <div className="mt-2 text-sm text-slate-700">{card.detail}</div>
            </div>
          ))}
        </section>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="wc-panel space-y-3 sticky top-4">
              <div className="wc-panel-heading">Global enterprise sidebar</div>
              {workspace.sidebarGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition ${
                          item.current
                            ? "border-[var(--primary)] bg-[var(--primary)]/5 text-slate-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span>{item.label}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="border-t border-slate-200 pt-3">
                <div className="wc-panel-heading">Global search</div>
                <label className="relative mt-2 block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    aria-label="Global search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={workspace.searchPlaceholder}
                    className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900"
                  />
                </label>
                <div className="mt-3 space-y-2">
                  {filteredSearch.map((item) => (
                    <Link key={item.id} href={item.href} className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <div className="font-medium text-slate-900">{item.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.meta}</div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="wc-panel-heading">Quick actions</div>
                <div className="mt-2 space-y-2">
                  {workspace.quickActions.map((action) => (
                    <div key={action.key} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-900">{action.label}</div>
                      <div className="mt-1 text-xs text-slate-500">{action.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-4">
            <section className="wc-panel">
              <div className="flex flex-wrap items-center gap-2">
                <span className="wc-module-pill"><Workflow className="h-3 w-3" /> {workspace.workspaceLabel}</span>
                <span className="wc-module-pill"><Route className="h-3 w-3" /> {workspace.approvalMode}</span>
                <span className="wc-module-pill"><TimerReset className="h-3 w-3" /> State: {workspace.activeState}</span>
                <span className="wc-module-pill"><ShieldCheck className="h-3 w-3" /> Viewer role: {viewerRoleLabel}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {workspace.sectionTabs.map((item) => (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                      item.active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>

            <SectionPanel id="workflow" title="Workflow engine" active={workspace.currentSection === "workflow"}>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="text-sm text-slate-600">
                    Dynamic state machine, conditional routing, escalation markers, and SLA-aware governance are computed centrally for this module.
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {workspace.workflowSteps.map((step) => (
                      <div key={step.key} className={`rounded-xl border p-3 ${stepTone(step)}`}>
                        <div className="text-sm font-semibold">{step.label}</div>
                        <div className="mt-1 text-xs">{step.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-slate-900">Smart context actions</div>
                  <div className="space-y-2">
                    {workspace.contextActions.map((action) => (
                      <div key={action.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-900">{action.label}</span>
                          <span className="wc-module-pill">Visible now</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-600">{action.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel id="timeline" title="Workflow timeline" active={workspace.currentSection === "timeline"}>
              <div className="space-y-3">
                {workspace.timeline.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium text-slate-900">{event.action}</div>
                      <span className="text-xs font-semibold text-slate-500">{event.timestamp}</span>
                    </div>
                    <div className="mt-2 grid gap-2 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                      <div><strong>User:</strong> {event.user}</div>
                      <div><strong>Role:</strong> {event.role}</div>
                      <div><strong>Attachment:</strong> {event.attachment}</div>
                      <div><strong>IP:</strong> {event.ipAddress}</div>
                      <div><strong>Device:</strong> {event.device}</div>
                      <div><strong>Comments:</strong> {event.comments}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionPanel>

            <SectionPanel id="signatures" title="Approval chain UX engine" active={workspace.currentSection === "signatures"}>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  {workspace.approvalSteps.map((step) => (
                    <div key={step.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900">{step.label}</div>
                          <div className="text-xs text-slate-500">{step.approver} · {step.role}</div>
                        </div>
                        <span className="wc-module-pill">{step.status}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">{step.detail}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Approval notifications</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {workspace.notificationChannels.map((channel) => (
                      <span key={channel} className="wc-module-pill">{channel}</span>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-slate-600">
                    Active approval routing supports sequential, parallel, delegated, and escalated approvals without exposing unauthorized actions.
                  </div>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel id="documents" title="Document governance" active={workspace.currentSection === "documents"}>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Lock className="h-4 w-4 text-emerald-700" />
                    Immutable signed document controls
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {workspace.evidenceHighlights.map((item) => (
                      <li key={item} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-700" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FileSearch className="h-4 w-4 text-[var(--primary)]" />
                    PDF governance profile
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">QR validation: Enabled</div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">Audit reference + evidence ID: Embedded</div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">Versioning + watermark: Mandatory on final output</div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">Finalization lock: Enforced after approval</div>
                  </div>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel id="audit-trail" title="Permission and audit visibility" active={workspace.currentSection === "audit-trail"}>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Permission-aware UX</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {workspace.permissionHighlights.map((item) => (
                      <li key={item} className="flex gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 flex-none text-[var(--primary)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Audit visibility</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {workspace.auditHighlights.map((item) => (
                      <li key={item} className="flex gap-2">
                        <Clock3 className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </SectionPanel>

            <SectionPanel id="risk-analysis" title="Risk and SLA analysis" active={workspace.currentSection === "risk-analysis"}>
              <div className="grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="h-4 w-4" />
                    SLA monitoring
                  </div>
                  <div className="mt-2 text-sm text-amber-900">
                    Pending timers, breach indicators, and delayed approval flags remain visible until closure.
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Conditional routing</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Branches support sequential approval, parallel review lanes, delegated approval, and escalation rerouting.
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-900">Enterprise QA targets</div>
                  <div className="mt-2 text-sm text-slate-600">
                    Buttons, workflows, permissions, approval chains, navigation paths, PDF outputs, and audit logs are all mapped into one governed workspace.
                  </div>
                </div>
              </div>
            </SectionPanel>
          </div>
        </div>
      </div>
    </ModuleShell>
  );
}
