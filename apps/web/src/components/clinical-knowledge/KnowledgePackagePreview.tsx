"use client";

import { FileText, BookOpen, AlertTriangle, Loader2 } from "lucide-react";
import type { ClinicalKnowledgeAssembly } from "@/lib/clinical-knowledge/types";
import { DecisionSupportPanel } from "./DecisionSupportPanel";

export interface KnowledgePackagePreviewProps {
  assembly: ClinicalKnowledgeAssembly | null;
  loading?: boolean;
}

export function KnowledgePackagePreview({ assembly, loading }: KnowledgePackagePreviewProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Resolving knowledge package...
      </div>
    );
  }

  if (!assembly) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        Select a procedure to preview the knowledge package.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{assembly.procedureNameEn}</h3>
          {assembly.procedureNameAr && (
            <p className="text-sm text-slate-600" dir="rtl">
              {assembly.procedureNameAr}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Package {assembly.packageVersion} · {assembly.assembledAt}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            assembly.status === "ready"
              ? "bg-green-100 text-green-800"
              : assembly.status === "blocked"
                ? "bg-red-100 text-red-800"
                : "bg-slate-100 text-slate-800"
          }`}
        >
          {assembly.status}
        </span>
      </div>

      {assembly.consentForm && (
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <FileText className="h-4 w-4 text-blue-600" />
            Consent Form
          </div>
          <p className="mt-1 text-sm text-slate-700">{assembly.consentForm.titleEn}</p>
          {assembly.consentForm.titleAr && (
            <p className="text-sm text-slate-600" dir="rtl">
              {assembly.consentForm.titleAr}
            </p>
          )}
          {assembly.consentForm.pdfTemplateUrl && (
            <a
              href={assembly.consentForm.pdfTemplateUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-blue-600 hover:underline"
            >
              View PDF template
            </a>
          )}
        </div>
      )}

      {assembly.educationMaterials.length > 0 && (
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <BookOpen className="h-4 w-4 text-emerald-600" />
            Patient Education
          </div>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
            {assembly.educationMaterials.map((edu) => (
              <li key={edu.id}>{edu.titleEn}</li>
            ))}
          </ul>
        </div>
      )}

      {assembly.riskDisclosures.length > 0 && (
        <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Risk Disclosures
          </div>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
            {assembly.riskDisclosures.map((risk) => (
              <li key={risk.id}>{risk.titleEn}</li>
            ))}
          </ul>
        </div>
      )}

      <DecisionSupportPanel
        blockers={assembly.blockers}
        suggestions={assembly.suggestions}
        requiredParticipants={assembly.requiredParticipants}
      />
    </div>
  );
}
