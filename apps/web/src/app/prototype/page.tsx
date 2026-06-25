import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import SectionPanel from "@/components/ui/SectionPanel";
import { FlaskConical, FileCheck, Stethoscope, Network, Clock, Link2, UserCheck } from "lucide-react";

const prototypes = [
  {
    href: "/prototype/approved-forms-v2",
    title: "Approved Forms V2",
    description:
      "Browsable consent taxonomy with category, specialty, risk, and status filters plus bilingual template preview.",
    icon: FileCheck,
    status: "Navigable",
  },
  {
    href: "/prototype/procedure-mapping-engine",
    title: "Procedure Mapping Engine",
    description:
      "Procedure-to-template matrix: specialty, anesthesia implication, mandatory disclosures, education assets, and alternatives.",
    icon: Network,
    status: "Navigable",
  },
  {
    href: "/prototype/doctor-workspace-v2",
    title: "Doctor Workspace V2",
    description:
      "Smart issuance flow with patient encounter selection, mapping-engine recommendations, and simulated review/send.",
    icon: Stethoscope,
    status: "Navigable",
  },
  {
    href: "/prototype/content-mapping-service",
    title: "Content Mapping Service",
    description:
      "Phase 43 integration layer: resolve consent form and education material from a procedure using the approved-forms library.",
    icon: Link2,
    status: "Navigable",
  },
  {
    href: "/prototype/consent-journey",
    title: "Consent Journey",
    description:
      "Phase 44 end-to-end workflow: procedure selection → content mapping → education → consent preview → ready for signature.",
    icon: UserCheck,
    status: "Navigable",
  },
];

export default function PrototypeHubPage() {
  return (
    <div>
      <PageHeader
        title="Prototype Lab"
        subtitle="Rapid validation surfaces for Approved Forms V2, Doctor Workspace V2, and the Procedure Mapping Engine."
        badge="24-Hour Acceleration"
        icon={<FlaskConical className="h-7 w-7" />}
        action={
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <Clock className="h-3.5 w-3.5" />
            Fast validation — not production hardened
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {prototypes.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-700 group-hover:bg-violet-100">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  {item.status}
                </span>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                {item.description}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
      <SectionPanel
        title="Deliverables"
        subtitle="What this prototype demonstrates after 24 hours"
        variant="elevated"
      >
        <ul className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            Working prototype routes under /prototype
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            Reusable UX/UI using existing design-system components
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            Formal form taxonomy and procedure mapping matrix
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            Architecture document and demo walkthrough
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            Screenshots captured for each surface
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
            No changes to existing WathiqNote workflows, OTP/SMS/PDF, or main
          </li>
        </ul>
      </SectionPanel>
      </div>
    </div>
  );
}
