"use client";

import { useState } from "react";
import { Plus, Filter, Search } from "lucide-react";
import { Input, Button } from "@/components/design-system";
import type { ProductionPatient } from "../../../types";

interface PatientsPageProps {
  patients: ProductionPatient[];
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={["inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold", className].join(" ")}>
      {children}
    </span>
  );
}

export function PatientsPage({ patients }: PatientsPageProps) {
  const [query, setQuery] = useState("");

  const filtered = patients.filter((p) =>
    [p.name, p.mrn, p.nationalId].some((field) =>
      field?.toLowerCase().includes(query.toLowerCase())
    )
  );

  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-[14px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm text-slate-800">Patients</h2>
        <Button
          variant="brand"
          size="sm"
          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1"
          disabled
        >
          <Plus className="w-3 h-3" /> Add Patient
        </Button>
      </div>
      <div className="mb-3 flex gap-2">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            type="text"
            placeholder="Search patients..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-[11px] outline-none focus:border-blue-400"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="px-3 py-1.5 border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center gap-1"
          disabled
        >
          <Filter className="w-3 h-3" /> Filter
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[11px] text-slate-500 py-6 text-center">
          {patients.length === 0
            ? "No patients available. Search for a patient from the Workspace."
            : "No patients match your search."}
        </p>
      ) : (
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Patient</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">MRN</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Age/Gender</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Language</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Status</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="px-2 py-2 border-b border-slate-50 font-medium text-slate-700">{p.name}</td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">{p.mrn}</td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">
                  {p.dateOfBirth || "—"} / {p.gender || "—"}
                </td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">
                  {p.languagePreference || "—"}
                </td>
                <td className="px-2 py-2 border-b border-slate-50">
                  <Badge className="bg-yellow-100 text-yellow-700">Consent Pending</Badge>
                </td>
                <td className="px-2 py-2 border-b border-slate-50">
                  <button type="button" className="text-blue-600 font-medium">
                    View
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
