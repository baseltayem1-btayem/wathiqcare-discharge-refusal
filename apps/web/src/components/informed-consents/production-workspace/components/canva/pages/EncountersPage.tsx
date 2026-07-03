"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/design-system";
import type { ProductionEncounter } from "../../../types";

interface EncountersPageProps {
  encounters: ProductionEncounter[];
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={["inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold", className].join(" ")}>
      {children}
    </span>
  );
}

export function EncountersPage({ encounters }: EncountersPageProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-[14px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm text-slate-800">Encounters</h2>
        <Button
          variant="brand"
          size="sm"
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1"
          disabled
        >
          <Plus className="w-3 h-3" /> New Encounter
        </Button>
      </div>

      {encounters.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-6 text-center">
          No encounters available. Select a patient in the Workspace to load encounters.
        </p>
      ) : (
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Encounter ID</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Department</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Date</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Procedure</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Consent Status</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Action</th>
            </tr>
          </thead>
          <tbody>
            {encounters.map((e) => (
              <tr key={e.id}>
                <td className="px-2 py-2 border-b border-slate-50 font-medium text-slate-700">{e.encounterId}</td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">{e.department || "—"}</td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">{e.admissionDate || "—"}</td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">{e.procedure || "—"}</td>
                <td className="px-2 py-2 border-b border-slate-50">
                  <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>
                </td>
                <td className="px-2 py-2 border-b border-slate-50">
                  <button
                    type="button"
                    disabled
                    title="Not available in IMC pilot"
                    className="text-slate-400 font-medium cursor-not-allowed"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
