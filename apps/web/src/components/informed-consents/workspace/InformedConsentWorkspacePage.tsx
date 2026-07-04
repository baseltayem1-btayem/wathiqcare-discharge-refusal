"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Globe2,
  Languages,
  LayoutDashboard,
  LockKeyhole,
  PackageCheck,
  Paperclip,
  Send,
  Settings,
  ShieldCheck,
  Stethoscope,
  User,
  Users,
  Clock3,
  Scale,
  X,
} from "lucide-react";
import Link from "next/link";
import type { AuthContext } from "@/lib/server/auth";
import type {
  AuditEvidence,
  ConsentReadiness,
  ConsentSendResponse,
  PatientEncounter,
  ProcedurePackage,
  SendEligibility,
  TimelineEvent,
  WorkflowStep,
} from "./types";

const brand = {
  navy: "#003B73",
  blue: "#2563EB",
  gold: "#C8A24A",
  slate: "#475569",
  background: "#F6F8FB",
};

const stepIcons: Record<number, React.ElementType> = {
  1: User,
  2: Stethoscope,
  3: BookOpen,
  4: ShieldCheck,
  5: Send,
  6: FileCheck2,
};

const auditIcons: Record<string, React.ElementType> = {
  LockKeyhole,
  Download,
  FileCheck2,
  ShieldCheck,
};

interface InformedConsentWorkspacePageProps {
  auth: AuthContext;
  encounterId: string;
  procedureId: string;
  patient: PatientEncounter;
  procedure: ProcedurePackage;
  readiness: ConsentReadiness;
  timeline: TimelineEvent[];
  audit: AuditEvidence;
  workflowSteps: WorkflowStep[];
  sendEligibility: SendEligibility;
}

export default function InformedConsentWorkspacePage({
  auth,
  encounterId,
  procedureId,
  patient,
  procedure,
  readiness,
  timeline,
  audit,
  workflowSteps,
  sendEligibility: initialSendEligibility,
}: InformedConsentWorkspacePageProps) {
  const [toastOpen, setToastOpen] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendEligibility, setSendEligibility] = useState(initialSendEligibility);
  const [draftApproved, setDraftApproved] = useState(false);
  const [dryRunChecking, setDryRunChecking] = useState(true);

  const nav = useMemo(
    () => [
      { label: "Workspace", icon: LayoutDashboard, active: true },
      { label: "Patients", icon: Users },
      { label: "Encounters", icon: ClipboardList },
      { label: "Procedures", icon: Activity },
      { label: "Knowledge", icon: BookOpen },
      { label: "Templates", icon: FileText },
      { label: "Analytics", icon: BarChart3 },
      { label: "Audit & Evidence", icon: ShieldCheck },
      { label: "Settings", icon: Settings },
    ],
    []
  );

  // Run dry-run validation on mount to unlock the Send button when eligible.
  useEffect(() => {
    let cancelled = false;

    async function runDryRun() {
      try {
        const response = await fetch("/api/consents/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encounterId, procedureId, dryRun: true }),
        });
        const result = (await response.json().catch(() => ({}))) as ConsentSendResponse;
        if (!cancelled) {
          setSendEligibility((prev) => ({
            ...prev,
            dryRunPassed: response.ok && result.ok && result.dryRun === true,
          }));
        }
      } finally {
        if (!cancelled) setDryRunChecking(false);
      }
    }

    void runDryRun();
    return () => {
      cancelled = true;
    };
  }, [encounterId, procedureId]);

  const sendToPatient = async () => {
    setSending(true);
    setSendError(null);
    try {
      const response = await fetch("/api/consents/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounterId, procedureId }),
      });
      const result = (await response.json().catch(() => ({}))) as ConsentSendResponse;
      if (!response.ok || !result.ok) {
        throw new Error(result.error || `Send failed: ${response.statusText}`);
      }
      // eslint-disable-next-line no-console
      console.log("Consent sent successfully", result.workflow);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSending(false);
    }
  };

  const previewPackage = () => {
    window.open(
      `/api/consents/package-preview?encounterId=${encodeURIComponent(encounterId)}&procedureId=${encodeURIComponent(procedureId)}`,
      "_blank"
    );
  };

  const approveDraft = async () => {
    try {
      const response = await fetch("/api/consents/draft-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounterId, procedureId }),
      });
      if (response.ok) {
        setDraftApproved(true);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Draft approval failed", err);
    }
  };

  const dismissToast = async () => {
    setToastOpen(false);
    try {
      await fetch("/api/consents/dismiss-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encounterId, procedureId }),
      });
    } catch {
      // best-effort audit
    }
  };

  return (
    <main className="min-h-screen text-slate-900" style={{ backgroundColor: brand.background }}>
      <div className="flex min-h-screen">
        <Sidebar nav={nav} />

        <section className="flex min-h-screen flex-1 flex-col">
          <TopCommandBar patient={patient} procedure={procedure} />

          <div className="flex-1 space-y-5 px-6 py-5">
            <WorkflowStepper steps={workflowSteps} />

            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 xl:col-span-8">
                <ProcedurePackageCard procedure={procedure} onPreview={previewPackage} />
              </div>

              <div className="col-span-12 xl:col-span-4">
                <ReadinessPanel
                  readiness={readiness}
                  sendEligibility={sendEligibility}
                  dryRunChecking={dryRunChecking}
                  onSend={sendToPatient}
                  sending={sending}
                  sendError={sendError}
                  onApproveDraft={approveDraft}
                  draftApproved={draftApproved}
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-5">
              <div className="col-span-12 lg:col-span-4">
                <AlertsCard encounterId={encounterId} />
              </div>

              <div className="col-span-12 lg:col-span-3">
                <ClinicalTimeline timeline={timeline} encounterId={encounterId} />
              </div>

              <div className="col-span-12 lg:col-span-2">
                <TaskMetrics encounterId={encounterId} />
              </div>

              <div className="col-span-12 lg:col-span-3">
                <AuditEvidence audit={audit} encounterId={encounterId} procedureId={procedureId} />
              </div>
            </div>

            {toastOpen && <ValidationToast onClose={dismissToast} />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Sidebar({ nav }: { nav: { label: string; icon: React.ElementType; active?: boolean }[] }) {
  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
          style={{ backgroundColor: brand.blue }}
        >
          W
        </div>
        <div>
          <div className="text-sm font-bold text-slate-950">WathiqCare</div>
          <div className="text-xs text-slate-500">Informed Consent</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                item.active
                  ? "bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_#2563EB]"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: "#DBEAFE", color: brand.blue }}
          >
            DA
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-slate-900">
              dr.ahmed@wathiqcare...
            </div>
            <div className="text-xs text-slate-500">Profile unavailable</div>
          </div>
        </div>

        <div className="mt-3 text-xs leading-5 text-slate-500">
          International Medical Center
          <br />
          Jeddah, Saudi Arabia
        </div>
      </div>
    </aside>
  );
}

function TopCommandBar({
  patient,
  procedure,
}: {
  patient: PatientEncounter;
  procedure: ProcedurePackage;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-[76px] items-center justify-between px-6">
        <div className="grid flex-1 grid-cols-4 divide-x divide-slate-200 rounded-2xl border border-slate-100 bg-white shadow-sm">
          <CommandItem label="Patient" value={patient.name} icon={User} />
          <CommandItem label="MRN" value={patient.mrn} />
          <CommandItem label="Encounter" value={patient.encounterId} />
          <CommandItem label="Procedure" value={procedure.name} icon={Paperclip} />
        </div>

        <button className="ml-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <Globe2 className="h-4 w-4" />
          EN
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function CommandItem({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {Icon ? (
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: "#EFF6FF", color: brand.blue }}
        >
          <Icon className="h-4 w-4" />
        </div>
      ) : null}

      <div>
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="text-sm font-bold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function WorkflowStepper({ steps }: { steps: WorkflowStep[] }) {
  const activeOrCompletedCount = steps.filter(
    (s) => s.status === "completed" || s.status === "active"
  ).length;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white px-8 py-6 shadow-sm">
      <div className="relative grid grid-cols-6 gap-2">
        <div className="absolute left-[8%] right-[8%] top-6 h-px bg-slate-200" />

        {steps.map((step, index) => {
          const Icon = stepIcons[step.id] ?? CheckCircle2;
          const isCompleted = step.status === "completed";
          const isActive = step.status === "active";
          const progressDrawn = index < activeOrCompletedCount;

          return (
            <div key={step.id} className="relative flex flex-col items-center text-center">
              {progressDrawn && (
                <div
                  className="absolute left-1/2 top-6 z-0 h-px w-full"
                  style={{ backgroundColor: brand.blue }}
                />
              )}

              <div
                className={[
                  "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border bg-white shadow-sm",
                  isCompleted
                    ? "border-blue-600 bg-blue-600 text-white"
                    : isActive
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-400",
                ].join(" ")}
                style={
                  isCompleted
                    ? { backgroundColor: brand.blue, borderColor: brand.blue }
                    : isActive
                      ? { borderColor: brand.blue, color: brand.blue, backgroundColor: "#EFF6FF" }
                      : undefined
                }
              >
                {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>

              <div
                className={[
                  "mt-3 text-xs font-bold",
                  isCompleted || isActive ? "text-blue-700" : "text-slate-500",
                ].join(" ")}
                style={isCompleted || isActive ? { color: brand.blue } : undefined}
              >
                {step.id}
              </div>

              <div className="mt-1 text-xs font-semibold text-slate-700">{step.title}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProcedurePackageCard({
  procedure,
  onPreview,
}: {
  procedure: ProcedurePackage;
  onPreview: () => void;
}) {
  const pills = [
    { icon: Stethoscope, label: procedure.category },
    { icon: FileText, label: `v${procedure.version}` },
    { icon: ShieldCheck, label: procedure.riskLevel },
    { icon: Languages, label: procedure.languageSet },
    { icon: BarChart3, label: `Grade ${procedure.grade}` },
    { icon: FileCheck2, label: procedure.illustrated ? "Illustrated" : "Text only" },
    { icon: Clock3, label: procedure.duration },
  ];

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex gap-7">
        <div className="flex h-[210px] w-[210px] shrink-0 items-center justify-center rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-100">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-xl ring-8 ring-white/60">
            <PackageCheck className="h-14 w-14" style={{ color: brand.blue }} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
              {procedure.name}
            </h1>

            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
              Ready for Review
            </span>
          </div>

          <p className="mt-1 text-sm font-medium text-slate-500">Procedure Package</p>

          <div className="mt-5 flex flex-wrap gap-3">
            {pills.map((pill) => (
              <InfoPill key={pill.label} icon={pill.icon} label={pill.label} />
            ))}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="grid grid-cols-4 gap-4">
              <MetricNumber value={String(procedure.sections)} label="Sections" />
              <MetricNumber value={String(procedure.keyBenefits)} label="Key Benefits" />
              <MetricNumber value={String(procedure.risks)} label="Risks" />
              <MetricNumber value={String(procedure.alternatives)} label="Alternatives" />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarClock className="h-4 w-4" />
              Last updated: {procedure.lastUpdated}
            </div>

            <button
              onClick={onPreview}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold hover:bg-blue-50"
              style={{ color: brand.blue }}
            >
              <Eye className="h-4 w-4" />
              Preview Package
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function InfoPill({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
      <Icon className="h-4 w-4" style={{ color: brand.blue }} />
      {label}
    </span>
  );
}

function MetricNumber({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-extrabold text-slate-950">{value}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function ReadinessPanel({
  readiness,
  sendEligibility,
  dryRunChecking,
  onSend,
  sending,
  sendError,
  onApproveDraft,
  draftApproved,
}: {
  readiness: ConsentReadiness;
  sendEligibility: SendEligibility;
  dryRunChecking: boolean;
  onSend: () => void;
  sending: boolean;
  sendError: string | null;
  onApproveDraft: () => void;
  draftApproved: boolean;
}) {
  const allMet = readiness.percentage === 100 && sendEligibility.dryRunPassed;
  const disabled =
    sending ||
    dryRunChecking ||
    !sendEligibility.canSend ||
    !sendEligibility.dryRunPassed ||
    readiness.percentage !== 100;

  const blockReason = sendEligibility.reason || (sendEligibility.dryRunPassed ? "" : "Dry-run validation pending");

  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-extrabold text-slate-950">Readiness Checklist</h2>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {allMet ? "All requirements met" : `${readiness.completed} of ${readiness.total} met`}
        </span>
      </div>

      <div className="grid grid-cols-[150px_1fr] gap-6">
        <div
          className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full"
          style={{ backgroundColor: "#EFF6FF" }}
        >
          <div
            className="absolute inset-2 rounded-full border-[10px]"
            style={{ borderColor: brand.blue }}
          />
          <div className="text-center">
            <div className="text-4xl font-black text-slate-950">{readiness.percentage}%</div>
            <div className="text-xs font-semibold text-slate-500">
              {readiness.completed} of {readiness.total} steps
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {readiness.checks.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 text-sm font-semibold text-slate-700"
            >
              <CheckCircle2
                className={`h-5 w-5 ${item.done ? "text-emerald-600" : "text-slate-300"}`}
              />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onSend}
        disabled={disabled}
        className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-4 text-sm font-extrabold text-white shadow-lg shadow-blue-950/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: brand.navy }}
      >
        <Send className="h-5 w-5" />
        {sending ? "Sending..." : dryRunChecking ? "Validating..." : "Send to Patient"}
      </button>

      {disabled && blockReason && (
        <p className="mt-2 text-xs font-bold text-amber-600">{blockReason}</p>
      )}
      {sendError && <p className="mt-2 text-xs font-bold text-red-600">{sendError}</p>}

      <button
        onClick={onApproveDraft}
        disabled={draftApproved}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        <ShieldCheck className="h-5 w-5" style={{ color: brand.blue }} />
        {draftApproved ? "Draft Approved" : "Clinical Draft Approved"}
      </button>
    </section>
  );
}

function AlertsCard({ encounterId }: { encounterId: string }) {
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Scale className="h-5 w-5 text-slate-800" />
        <h2 className="text-base font-extrabold text-slate-950">Clinical & Legal Alerts</h2>
      </div>

      <div className="space-y-3">
        <AlertItem
          icon={AlertTriangle}
          title="High-Risk Procedure"
          desc="Risk assessment will appear once the knowledge package is resolved."
          badge="High"
          tone="red"
        />

        <AlertItem
          icon={FileText}
          title="Additional Consent Items"
          desc="No additional items detected."
          badge="Medium"
          tone="amber"
        />

        <AlertItem
          icon={User}
          title="Patient Preference"
          desc="Language preference not set."
          badge="Info"
          tone="blue"
        />
      </div>

      <Link
        href={`/api/consents/alerts?encounterId=${encodeURIComponent(encounterId)}`}
        className="mt-5 inline-block text-sm font-bold hover:text-blue-800"
        style={{ color: brand.blue }}
      >
        View all alerts →
      </Link>
    </section>
  );
}

function AlertItem({
  icon: Icon,
  title,
  desc,
  badge,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  badge: string;
  tone: "red" | "amber" | "blue";
}) {
  const tones = {
    red: "border-red-100 bg-red-50 text-red-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    blue: "border-blue-100 bg-blue-50 text-blue-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="text-sm font-extrabold">{title}</div>
            <p className="mt-1 text-xs font-medium opacity-80">{desc}</p>
          </div>
        </div>

        <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold">{badge}</span>
      </div>
    </div>
  );
}

function ClinicalTimeline({
  timeline,
  encounterId,
}: {
  timeline: TimelineEvent[];
  encounterId: string;
}) {
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <Clock3 className="h-5 w-5" style={{ color: brand.blue }} />
        <h2 className="text-base font-extrabold text-slate-950">Clinical Timeline</h2>
      </div>

      <div className="space-y-4">
        {timeline.map((item) => (
          <div key={item.label} className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={[
                  "mt-1 h-3 w-3 rounded-full border-2",
                  item.done ? "border-blue-600 bg-blue-600" : "border-slate-300 bg-white",
                ].join(" ")}
                style={item.done ? { backgroundColor: brand.blue, borderColor: brand.blue } : undefined}
              />
              <div
                className={
                  item.done ? "font-bold text-slate-900" : "font-medium text-slate-500"
                }
              >
                <div className="text-sm">{item.label}</div>
              </div>
            </div>

            <span className="text-xs font-semibold text-slate-500">{item.time}</span>
          </div>
        ))}
      </div>

      <Link
        href={`/api/audit/timeline?encounterId=${encodeURIComponent(encounterId)}`}
        className="mt-6 inline-block text-sm font-bold hover:text-blue-800"
        style={{ color: brand.blue }}
      >
        View full timeline →
      </Link>
    </section>
  );
}

function TaskMetrics({ encounterId }: { encounterId: string }) {
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <BarChart3 className="h-5 w-5" style={{ color: brand.blue }} />
        <h2 className="text-base font-extrabold text-slate-950">Task Metrics</h2>
      </div>

      <div className="grid grid-cols-2 overflow-hidden rounded-2xl border border-slate-200">
        <SmallMetric value="0" label="Packages Generated" />
        <SmallMetric value="0" label="Consents Sent" />
        <SmallMetric value="0" label="Consents Completed" green />
        <SmallMetric value="0" label="Pending Review" amber />
      </div>

      <Link
        href={`/api/analytics/consents?encounterId=${encodeURIComponent(encounterId)}`}
        className="mt-6 inline-block text-sm font-bold hover:text-blue-800"
        style={{ color: brand.blue }}
      >
        View metrics →
      </Link>
    </section>
  );
}

function SmallMetric({
  value,
  label,
  green,
  amber,
}: {
  value: string;
  label: string;
  green?: boolean;
  amber?: boolean;
}) {
  return (
    <div className="border-b border-r border-slate-200 p-5 text-center last:border-r-0">
      <div
        className={[
          "text-2xl font-black",
          green ? "text-emerald-600" : amber ? "text-amber-600" : "text-blue-700",
        ].join(" ")}
        style={!green && !amber ? { color: brand.blue } : undefined}
      >
        {value}
      </div>
      <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function AuditEvidence({
  audit,
  encounterId,
  procedureId,
}: {
  audit: AuditEvidence;
  encounterId: string;
  procedureId: string;
}) {
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-slate-800" />
          <h2 className="text-base font-extrabold text-slate-950">Audit & Evidence</h2>
        </div>

        {audit.tamperEvident && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Tamper-evident
          </span>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
        {audit.items.map((item) => {
          const Icon = auditIcons[item.iconName] ?? ShieldCheck;
          return (
            <div key={item.title} className="flex gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#EFF6FF", color: brand.blue }}
              >
                <Icon className="h-4 w-4" />
              </div>

              <div>
                <div className="text-sm font-extrabold text-slate-900">{item.title}</div>
                <div className="text-xs font-medium text-slate-500">{item.description}</div>
              </div>
            </div>
          );
        })}
      </div>

      <Link
        href={`/api/audit/timeline?encounterId=${encodeURIComponent(encounterId)}`}
        className="mt-5 inline-block text-sm font-bold hover:text-blue-800"
        style={{ color: brand.blue }}
      >
        View audit trail →
      </Link>

      <a
        href={`/api/audit/export?encounterId=${encodeURIComponent(encounterId)}&procedureId=${encodeURIComponent(procedureId)}`}
        download
        className="mt-2 inline-block text-sm font-bold hover:text-blue-800"
        style={{ color: brand.blue }}
      >
        Export evidence →
      </a>
    </section>
  );
}

function ValidationToast({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-3xl border border-emerald-200 bg-emerald-50 px-6 py-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-6 w-6" />
        </div>

        <div>
          <div className="text-lg font-extrabold text-emerald-800">Dry-run validation passed.</div>
          <div className="text-sm font-medium text-emerald-700">No consent was sent.</div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="rounded-full p-2 text-emerald-900 hover:bg-emerald-100"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
