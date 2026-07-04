"use client";

import { AlertTriangle, Info, ShieldAlert, UserCheck, Languages, UserCog } from "lucide-react";
import type { ClinicalSuggestion, ConsentBlocker } from "@/lib/clinical-content/types";

export interface DecisionSupportPanelProps {
  suggestions: ClinicalSuggestion[];
  blockers: ConsentBlocker[];
  requiredParticipants: ("witness" | "interpreter" | "guardian")[];
}

export function DecisionSupportPanel({
  suggestions,
  blockers,
  requiredParticipants,
}: DecisionSupportPanelProps) {
  return (
    <div className="space-y-3">
      {blockers.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <ShieldAlert className="h-4 w-4" />
            Blockers — resolve before sending
          </div>
          <ul className="mt-2 space-y-2">
            {blockers.map((blocker) => (
              <li key={blocker.key} className="text-sm text-red-700">
                <span className="font-medium">{blocker.messageEn}</span>
                {blocker.messageAr && (
                  <p className="text-xs text-red-600" dir="rtl">
                    {blocker.messageAr}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {requiredParticipants.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <UserCheck className="h-4 w-4 text-blue-600" />
            Required Participants
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {requiredParticipants.includes("witness") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                <UserCheck className="h-3 w-3" /> Witness
              </span>
            )}
            {requiredParticipants.includes("interpreter") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
                <Languages className="h-3 w-3" /> Interpreter
              </span>
            )}
            {requiredParticipants.includes("guardian") && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                <UserCog className="h-3 w-3" /> Guardian
              </span>
            )}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Info className="h-4 w-4 text-blue-600" />
            Clinical Suggestions
          </div>
          <ul className="mt-2 space-y-2">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id} className="text-sm text-slate-700">
                <span className="inline-flex items-center gap-1">
                  {suggestion.severity === "critical" ? (
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                  ) : suggestion.severity === "warning" ? (
                    <AlertTriangle className="h-3 w-3 text-amber-600" />
                  ) : (
                    <Info className="h-3 w-3 text-blue-600" />
                  )}
                  {suggestion.messageEn}
                </span>
                {suggestion.messageAr && (
                  <p className="text-xs text-slate-500" dir="rtl">
                    {suggestion.messageAr}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
