"use client";

import { AlertTriangle, FileText, Shield, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/make-ui/badge";
import { Button } from "@/components/make-ui/button";
import { Card, CardContent } from "@/components/make-ui/card";

const incidents = [
  {
    id: "INC-2026-0047",
    type: "Medication Error",
    severity: "high",
    patient: { name: "Maria Garcia", mrn: "MRN-456789" },
    reporter: "Nurse Sarah Williams",
    department: "ICU",
    description: "Wrong dosage administered - 10x prescribed amount",
    status: "investigating",
    reportedDate: "2026-03-09T14:30:00",
  },
  {
    id: "INC-2026-0046",
    type: "Surgical Complication",
    severity: "critical",
    patient: { name: "Robert Thompson", mrn: "MRN-654321" },
    reporter: "Dr. Michael Chen",
    department: "Surgery",
    description: "Post-operative infection requiring reoperation",
    status: "under_review",
    reportedDate: "2026-03-08T10:15:00",
  },
];

function severityClass(severity: string) {
  if (severity === "critical") return "bg-red-600 text-white";
  if (severity === "high") return "bg-orange-500 text-white";
  return "bg-slate-500 text-white";
}

function statusClass(status: string) {
  if (status === "investigating") return "bg-orange-100 text-orange-700";
  if (status === "under_review") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export function MalpracticeModule() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Malpractice and Incident Management</h2>
          <p className="mt-1 text-slate-600">Medical incident reporting, investigation, and risk mitigation</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700">
          <AlertTriangle className="h-4 w-4" />
          Report New Incident
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">Active Incidents</p><p className="text-2xl font-semibold text-red-600">47</p></div><AlertTriangle className="h-8 w-8 text-red-600" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">Under Investigation</p><p className="text-2xl font-semibold text-orange-600">12</p></div><FileText className="h-8 w-8 text-orange-600" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">Trend vs Last Month</p><p className="text-2xl font-semibold text-green-600">-15%</p></div><TrendingDown className="h-8 w-8 text-green-600" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">Risk Score</p><p className="text-2xl font-semibold text-blue-600">73/100</p></div><Shield className="h-8 w-8 text-blue-600" /></div></CardContent></Card>
      </div>

      <div className="space-y-4">
        {incidents.map((incident) => (
          <Card key={incident.id} className="border-l-4 border-red-500">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{incident.type}</h3>
                    <Badge variant="outline">{incident.id}</Badge>
                    <Badge className={severityClass(incident.severity)}>{incident.severity.toUpperCase()} SEVERITY</Badge>
                    <Badge className={statusClass(incident.status)}>{incident.status.replace("_", " ").toUpperCase()}</Badge>
                  </div>
                  <p className="text-sm text-slate-700">{incident.patient.name} ({incident.patient.mrn}) • {incident.department} • {new Date(incident.reportedDate).toLocaleString()}</p>
                  <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{incident.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => toast.info("Opening incident details...")}>View Full Report</Button>
                  <Button size="sm" variant="outline">Investigation Notes</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
