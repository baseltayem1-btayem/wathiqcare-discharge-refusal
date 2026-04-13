"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import AccessDenied from "@/components/AccessDenied";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { apiFetch, isForbiddenError } from "@/utils/api";

type DashboardResponse = {
  access: {
    role: string;
    scope: "general" | "detailed";
    canViewLegalQueue: boolean;
  };
  kpis: {
    totalRefusalCases: number;
    openCases: number;
    completedCases: number;
    escalatedCases: number;
    casesOver24Hours: number;
    highRiskCases: number;
    criticalRiskCases: number;
    unsignedRequiredDocuments: number;
    missingWitnesses: number;
    financialExposureCases: number;
  };
  tables: {
    criticalHighRiskCases: Array<{
      caseId: string;
      patientName: string;
      mrn: string;
      department: string;
      attendingPhysician: string;
      refusalDurationHours: number;
      riskLevel: string;
      missingItem: string;
      escalationStatus: string;
      lastUpdate: string;
    }>;
    requiredDocumentsGaps: Array<{
      caseId: string;
      refusalForm: string;
      financialNotice: string;
      promissoryNote: string;
      witnesses: number;
      signatureStatus: string;
      escalationForm: string;
      completionBlocked: string;
    }>;
    legalFollowUpQueue: Array<{
      caseId: string;
      escalationDate: string | null;
      legalSummaryAvailable: string;
      promissoryNoteAvailable: string;
      financialExposure: string;
      recommendedAction: string;
    }>;
  };
  charts: {
    casesByRiskLevel: Record<string, number>;
    casesByWorkflowStatus: Array<{ label: string; value: number }>;
    refusalCasesByDepartment: Array<{ label: string; value: number }>;
    casesExceeding24Hours: {
      total: number;
      escalated: number;
      notEscalated: number;
    };
    documentComplianceRate: {
      refusalFormCompletionRate: number;
      financialFormCompletionRate: number;
      witnessComplianceRate: number;
      signatureCompletionRate: number;
      escalationComplianceRate: number;
    };
  };
};

type Filters = {
  dateFrom: string;
  dateTo: string;
  department: string;
  physician: string;
  caseStatus: string;
  riskLevel: string;
  escalationStatus: string;
  signatureStatus: string;
  insuranceCoverageStatus: string;
};

const DEFAULT_FILTERS: Filters = {
  dateFrom: "",
  dateTo: "",
  department: "",
  physician: "",
  caseStatus: "",
  riskLevel: "",
  escalationStatus: "",
  signatureStatus: "",
  insuranceCoverageStatus: "",
};

function RiskBadge({ value }: { value: string }) {
  if (value === "Critical") {
    return <Badge variant="destructive">Critical</Badge>;
  }
  if (value === "High") {
    return <Badge variant="warning">High</Badge>;
  }
  if (value === "Medium") {
    return <Badge variant="outline">Medium</Badge>;
  }
  return <Badge variant="success">Low</Badge>;
}

function MiniBarChart({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = rows.reduce((acc, row) => Math.max(acc, row.value), 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>{row.label}</span>
              <span>{row.value}</span>
            </div>
            <progress
              className="h-2 w-full overflow-hidden rounded bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-cyan-600 [&::-moz-progress-bar]:bg-cyan-600"
              value={row.value}
              max={max}
              aria-label={`${title} ${row.label}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function LegalRiskDashboardPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) {
        params.set(key, value);
      }
    }
    return params.toString();
  }, [filters]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch<DashboardResponse>(
          `/api/discharge/reports/legal-risk-dashboard${queryString ? `?${queryString}` : ""}`,
          { cache: "no-store", authFailureMode: "inline" },
        );
        setData(response);
        setForbidden(false);
      } catch (err) {
        if (isForbiddenError(err)) {
          setForbidden(true);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load legal risk dashboard");
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [queryString]);

  return (
    <AuthGuard authFailureMode="inline">
      <AppShell
        title="Legal Risk Dashboard"
        subtitle="Discharge refusal legal and operational risk monitoring"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setFilters(DEFAULT_FILTERS)}>Reset Filters</Button>
            <Link href="/dashboards" className="inline-flex items-center rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Back to Dashboards
            </Link>
          </div>
        }
      >
        {forbidden ? (
          <AccessDenied resource="Legal Risk Dashboard" backHref="/dashboard" backLabel="Back to Dashboard" />
        ) : (
          <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                <input title="Date From" className="rounded-md border border-slate-200 px-3 py-2 text-sm" type="date" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))} />
                <input title="Date To" className="rounded-md border border-slate-200 px-3 py-2 text-sm" type="date" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))} />
                <input className="rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Department" value={filters.department} onChange={(e) => setFilters((prev) => ({ ...prev, department: e.target.value }))} />
                <input className="rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Physician" value={filters.physician} onChange={(e) => setFilters((prev) => ({ ...prev, physician: e.target.value }))} />
                <input className="rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Case Status" value={filters.caseStatus} onChange={(e) => setFilters((prev) => ({ ...prev, caseStatus: e.target.value }))} />
                <select title="Risk Level" className="rounded-md border border-slate-200 px-3 py-2 text-sm" value={filters.riskLevel} onChange={(e) => setFilters((prev) => ({ ...prev, riskLevel: e.target.value }))}>
                  <option value="">Risk Level</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
                <select title="Escalation Status" className="rounded-md border border-slate-200 px-3 py-2 text-sm" value={filters.escalationStatus} onChange={(e) => setFilters((prev) => ({ ...prev, escalationStatus: e.target.value }))}>
                  <option value="">Escalation Status</option>
                  <option value="escalated">Escalated</option>
                  <option value="not_escalated">Not Escalated</option>
                </select>
                <select title="Signature Status" className="rounded-md border border-slate-200 px-3 py-2 text-sm" value={filters.signatureStatus} onChange={(e) => setFilters((prev) => ({ ...prev, signatureStatus: e.target.value }))}>
                  <option value="">Signature Status</option>
                  <option value="signed">Signed</option>
                  <option value="unsigned">Unsigned</option>
                </select>
                <input className="rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="Insurance Coverage" value={filters.insuranceCoverageStatus} onChange={(e) => setFilters((prev) => ({ ...prev, insuranceCoverageStatus: e.target.value }))} />
              </CardContent>
            </Card>

            {error ? <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
            {loading ? <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">Loading dashboard...</div> : null}

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Card><CardHeader><CardTitle className="text-xs">Total Refusal Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.totalRefusalCases ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Open Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.openCases ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Completed Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.completedCases ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Escalated Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.escalatedCases ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Cases &gt; 24 Hours</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.casesOver24Hours ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">High Risk Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.highRiskCases ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Critical Risk Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.criticalRiskCases ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Unsigned Required Documents</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.unsignedRequiredDocuments ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Missing Witnesses</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.missingWitnesses ?? 0}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-xs">Financial Exposure Cases</CardTitle></CardHeader><CardContent className="text-2xl font-bold">{data?.kpis.financialExposureCases ?? 0}</CardContent></Card>
            </div>

            <div className="mb-5 grid gap-4 xl:grid-cols-2">
              <MiniBarChart
                title="Cases by Risk Level"
                rows={Object.entries(data?.charts.casesByRiskLevel ?? {}).map(([label, value]) => ({ label, value }))}
              />
              <MiniBarChart title="Cases by Workflow Status" rows={data?.charts.casesByWorkflowStatus ?? []} />
              <MiniBarChart title="Refusal Cases by Department" rows={data?.charts.refusalCasesByDepartment ?? []} />
              <MiniBarChart
                title="Cases Exceeding 24 Hours"
                rows={[
                  { label: "Total", value: data?.charts.casesExceeding24Hours.total ?? 0 },
                  { label: "Escalated", value: data?.charts.casesExceeding24Hours.escalated ?? 0 },
                  { label: "Not Escalated", value: data?.charts.casesExceeding24Hours.notEscalated ?? 0 },
                ]}
              />
              <MiniBarChart
                title="Document Compliance Rate"
                rows={[
                  { label: "Refusal Form", value: data?.charts.documentComplianceRate.refusalFormCompletionRate ?? 0 },
                  { label: "Financial Form", value: data?.charts.documentComplianceRate.financialFormCompletionRate ?? 0 },
                  { label: "Witness Compliance", value: data?.charts.documentComplianceRate.witnessComplianceRate ?? 0 },
                  { label: "Signature Completion", value: data?.charts.documentComplianceRate.signatureCompletionRate ?? 0 },
                  { label: "Escalation Compliance", value: data?.charts.documentComplianceRate.escalationComplianceRate ?? 0 },
                ]}
              />
            </div>

            <Card className="mb-5">
              <CardHeader><CardTitle>Critical / High Legal Risk Cases</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2 text-left">Case ID</th>
                      <th className="p-2 text-left">Patient Name</th>
                      <th className="p-2 text-left">MRN</th>
                      <th className="p-2 text-left">Department</th>
                      <th className="p-2 text-left">Attending Physician</th>
                      <th className="p-2 text-left">Refusal Duration</th>
                      <th className="p-2 text-left">Risk Level</th>
                      <th className="p-2 text-left">Missing Item</th>
                      <th className="p-2 text-left">Escalation Status</th>
                      <th className="p-2 text-left">Last Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.tables.criticalHighRiskCases ?? []).map((row) => (
                      <tr key={row.caseId} className="border-b border-slate-100">
                        <td className="p-2">{row.caseId}</td>
                        <td className="p-2">{row.patientName}</td>
                        <td className="p-2">{row.mrn}</td>
                        <td className="p-2">{row.department}</td>
                        <td className="p-2">{row.attendingPhysician}</td>
                        <td className="p-2">{row.refusalDurationHours}h</td>
                        <td className="p-2"><RiskBadge value={row.riskLevel} /></td>
                        <td className="p-2">{row.missingItem}</td>
                        <td className="p-2">{row.escalationStatus}</td>
                        <td className="p-2">{new Date(row.lastUpdate).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card className="mb-5">
              <CardHeader><CardTitle>Required Documents Gaps</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2 text-left">Case ID</th>
                      <th className="p-2 text-left">Refusal Form</th>
                      <th className="p-2 text-left">Financial Notice</th>
                      <th className="p-2 text-left">Promissory Note</th>
                      <th className="p-2 text-left">Witnesses</th>
                      <th className="p-2 text-left">Signature Status</th>
                      <th className="p-2 text-left">Escalation Form</th>
                      <th className="p-2 text-left">Completion Blocked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.tables.requiredDocumentsGaps ?? []).map((row) => (
                      <tr key={row.caseId} className="border-b border-slate-100">
                        <td className="p-2">{row.caseId}</td>
                        <td className="p-2">{row.refusalForm}</td>
                        <td className="p-2">{row.financialNotice}</td>
                        <td className="p-2">{row.promissoryNote}</td>
                        <td className="p-2">{row.witnesses}</td>
                        <td className="p-2">{row.signatureStatus}</td>
                        <td className="p-2">{row.escalationForm}</td>
                        <td className="p-2">{row.completionBlocked}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {data?.access.canViewLegalQueue ? (
              <Card>
                <CardHeader><CardTitle>Legal Follow-Up Queue</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="p-2 text-left">Case ID</th>
                        <th className="p-2 text-left">Escalation Date</th>
                        <th className="p-2 text-left">Legal Summary Available</th>
                        <th className="p-2 text-left">Promissory Note Available</th>
                        <th className="p-2 text-left">Financial Exposure</th>
                        <th className="p-2 text-left">Recommended Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.tables.legalFollowUpQueue ?? []).map((row) => (
                        <tr key={row.caseId} className="border-b border-slate-100">
                          <td className="p-2">{row.caseId}</td>
                          <td className="p-2">{row.escalationDate ? new Date(row.escalationDate).toLocaleString() : "-"}</td>
                          <td className="p-2">{row.legalSummaryAvailable}</td>
                          <td className="p-2">{row.promissoryNoteAvailable}</td>
                          <td className="p-2">{row.financialExposure}</td>
                          <td className="p-2">{row.recommendedAction}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </AppShell>
    </AuthGuard>
  );
}
