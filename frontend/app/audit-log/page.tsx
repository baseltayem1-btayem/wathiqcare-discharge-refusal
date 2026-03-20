"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  RefreshCw,
  Download,
  Search,
  Filter,
  ShieldCheck,
  Calendar
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatCard from "@/components/ui/StatCard";
import ActionButton from "@/components/ui/ActionButton";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { apiFetch } from "@/utils/api";

type CaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
};

type AuditItem = {
  id: string;
  action: string;
  details?: string;
  created_at?: string;
  actor?: string;
};

export default function AuditLogPage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const loadAuditLogs = useCallback(async (caseId: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<AuditItem[]>(`/api/discharge/audit/${encodeURIComponent(caseId)}`);
      setAuditItems(Array.isArray(data) ? data : []);
    } catch {
      setAuditItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    apiFetch<CaseItem[]>("/api/cases?limit=100")
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setCases(list);
        if (list.length > 0) {
          setSelectedCaseId(list[0].id);
        }
      })
      .catch(() => setCases([]));
  }, []);

  useEffect(() => {
    if (!selectedCaseId) {
      return;
    }

    void loadAuditLogs(selectedCaseId);
  }, [loadAuditLogs, selectedCaseId]);

  const filteredAuditItems = useMemo(() => {
    let filtered = auditItems;

    // Apply action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((item) =>
        item.action.toLowerCase().includes(actionFilter.toLowerCase())
      );
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        item.action.toLowerCase().includes(query) ||
        (item.details || "").toLowerCase().includes(query) ||
        (item.actor || "").toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [auditItems, searchQuery, actionFilter]);

  const stats = useMemo(() => {
    const uniqueActions = new Set(auditItems.map((item) => item.action)).size;
    const recentLogs = auditItems.filter((item) => {
      if (!item.created_at) return false;
      const logDate = new Date(item.created_at);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return logDate > dayAgo;
    }).length;

    return {
      total: auditItems.length,
      uniqueActions,
      recentLogs,
      filtered: filteredAuditItems.length,
    };
  }, [auditItems, filteredAuditItems]);

  function handleExport() {
    // Create CSV content
    const headers = ["Timestamp", "Action", "Details", "Actor"];
    const rows = filteredAuditItems.map((item) => [
      item.created_at || "",
      item.action || "",
      (item.details || "").replace(/,/g, ";"),
      item.actor || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Download CSV
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${selectedCaseId}-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: Column<AuditItem>[] = [
    {
      key: "created_at",
      header: "Timestamp",
      width: "20%",
      render: (item) => (
        item.created_at
          ? new Date(item.created_at).toLocaleString()
          : "-"
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "25%",
      render: (item) => (
        <span className="font-medium text-slate-900">{item.action}</span>
      ),
    },
    {
      key: "details",
      header: "Details",
      width: "35%",
      render: (item) => (
        <span className="text-slate-600">{item.details || "-"}</span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      width: "20%",
      render: (item) => (
        <span className="text-slate-700">{item.actor || "System"}</span>
      ),
    },
  ];

  return (
    <AuthGuard>
      <AppShell
        title="Audit Log Viewer"
        subtitle="Review immutable audit trails and compliance records for discharge refusal workflows."
        actions={
          <div className="flex gap-2">
            <ActionButton
              onClick={() => {
                if (!selectedCaseId) return;
                void loadAuditLogs(selectedCaseId);
              }}
              variant="outline"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" />}
            >
              Refresh
            </ActionButton>
            <ActionButton
              onClick={handleExport}
              variant="outline"
              size="sm"
              disabled={filteredAuditItems.length === 0}
              icon={<Download className="h-4 w-4" />}
            >
              Export CSV
            </ActionButton>
          </div>
        }
      >
        {/* Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Logs"
            value={stats.total}
            icon={<ClipboardList className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="Filtered Results"
            value={stats.filtered}
            icon={<Filter className="h-5 w-5" />}
            variant="primary"
          />
          <StatCard
            title="Unique Actions"
            value={stats.uniqueActions}
            icon={<Calendar className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="Last 24 Hours"
            value={stats.recentLogs}
            icon={<ShieldCheck className="h-5 w-5" />}
            variant="success"
          />
        </div>

        {/* Filters Section */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Case</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
              >
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {(item.caseNumber || item.id) + " - " + (item.patientName || "-")}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Action Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="generate">Generate</option>
                <option value="sign">Sign</option>
                <option value="escalate">Escalate</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="mt-6">
          {loading ? (
            <p className="text-sm text-slate-600">Loading audit records...</p>
          ) : (
            <DataTable
              columns={columns}
              data={filteredAuditItems}
              emptyMessage="No audit logs found for the selected case and filters."
            />
          )}
        </div>

        {/* PDPL Compliance Notice */}
        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">PDPL Compliance</h3>
              <p className="mt-1 text-sm text-blue-700">
                All audit logs are immutable and comply with Saudi Arabia&apos;s Personal Data Protection Law (PDPL).
                Records are retained for 7 years and include complete actor attribution for legal compliance.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
