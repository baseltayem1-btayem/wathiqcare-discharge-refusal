"use client";

import { BarChart2 } from "lucide-react";

export function AnalyticsPage() {
  return (
    <div className="space-y-3">
      <h2 className="font-bold text-sm mb-3 text-slate-800">Analytics</h2>
      <div className="grid grid-cols-4 gap-3 mb-3">
        {[
          { label: "Total Consents (May)", value: "0", color: "text-blue-600" },
          { label: "Completion Rate", value: "0%", color: "text-green-600" },
          { label: "Avg. Review Time", value: "—", color: "text-purple-600" },
          { label: "Compliance Score", value: "—", color: "text-orange-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-200 rounded-[10px] p-4 text-center"
          >
            <p className={["text-2xl font-bold", stat.color].join(" ")}>{stat.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white border border-slate-200 rounded-[10px] p-[14px] text-center py-10">
        <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="text-[11px] text-slate-500 mb-1">Analytics data is not available.</p>
        <p className="text-[10px] text-slate-500">
          Usage metrics integration is not enabled in this release.
        </p>
      </div>
    </div>
  );
}
