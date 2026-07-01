"use client";

import { Download, Shield, FileText } from "lucide-react";
import { Button } from "@/components/design-system";
import type { TimelineEvent } from "../../../types";

interface AuditPageProps {
  timeline: TimelineEvent[];
}

export function AuditPage({ timeline }: AuditPageProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-[10px] p-[14px]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm text-slate-800">Audit &amp; Evidence</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1.5 border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center gap-1"
            disabled
          >
            <Download className="w-3 h-3" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1.5 border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center gap-1"
            disabled
          >
            Filter
          </Button>
        </div>
      </div>

      {timeline.length === 0 ? (
        <div className="py-10 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-[11px] text-slate-500 mb-1">No audit events available.</p>
          <p className="text-[10px] text-slate-500">
            Audit events will appear after a consent is dispatched.
          </p>
        </div>
      ) : (
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Timestamp</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Actor</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Action</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Details</th>
              <th className="font-semibold text-slate-500 px-2 py-2 border-b border-slate-100">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((event) => (
              <tr key={event.id}>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">
                  {new Date(event.timestamp).toLocaleString()}
                </td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">{event.actorName}</td>
                <td className="px-2 py-2 border-b border-slate-50">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700">
                    {event.type}
                  </span>
                </td>
                <td className="px-2 py-2 border-b border-slate-50 text-slate-600">{event.summaryEn}</td>
                <td className="px-2 py-2 border-b border-slate-50">
                  <button type="button" className="text-blue-600 font-medium flex items-center gap-1" disabled>
                    <FileText className="w-3 h-3" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-[9px] text-slate-500 mt-3 flex items-center gap-1">
        <Shield className="w-[10px] h-[10px]" /> All records are securely recorded and tamper-evident.
      </p>
    </div>
  );
}
