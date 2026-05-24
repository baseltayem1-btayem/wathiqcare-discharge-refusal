import { notFound } from "next/navigation";
import PatientEducationPanel from "@/components/modules/consent/patient-education/PatientEducationPanel";
import {
  PHASE_22_TEMPLATE_CODES,
  type Phase22TemplateCode,
  getPhase22PackageStatus,
  getPhase22PackageVersion,
  loadPhase22Template,
} from "@/modules/consent-engine/loaders/phase22-content-loader";

interface Params {
  params: { templateCode: string };
}

export const dynamic = "force-static";

export function generateStaticParams() {
  return PHASE_22_TEMPLATE_CODES.map((templateCode) => ({ templateCode }));
}

/**
 * Build-only preview surface for the Phase 2.2 patient-education sections.
 * This route is NOT linked from production navigation. It exists so the
 * three new section components (PATIENT_EDUCATION, FAQ, UNDERSTANDING_CHECK)
 * can be rendered locally and reviewed before any production rollout.
 */
export default function PatientEducationPreviewPage({ params }: Params) {
  const code = params.templateCode as Phase22TemplateCode;
  if (!PHASE_22_TEMPLATE_CODES.includes(code)) {
    notFound();
  }
  const bundle = loadPhase22Template(code);
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-8">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        Build-only preview · package v{getPhase22PackageVersion()} · status {getPhase22PackageStatus()} ·
        no production wiring · no DB writes
      </div>
      <PatientEducationPanel bundle={bundle} />
    </main>
  );
}
