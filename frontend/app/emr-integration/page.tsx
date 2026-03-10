"use client";

import { useState } from "react";
import { 
  Activity, 
  CheckCircle2, 
  XCircle,
  RefreshCw,
  Server,
  Database,
  AlertCircle,
  Clock,
  Zap
} from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import StatCard from "@/components/ui/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import ActionButton from "@/components/ui/ActionButton";

type EMRSystem = {
  id: string;
  name: string;
  type: "Epic" | "Cerner" | "FHIR" | "Legacy";
  status: "connected" | "disconnected" | "syncing" | "error";
  lastSync?: string;
  recordsCount?: number;
  version?: string;
};

type SyncActivity = {
  id: string;
  system: string;
  action: string;
  status: "success" | "failed" | "in-progress";
  timestamp: string;
  recordsProcessed?: number;
};

export default function EMRIntegrationPage() {
  const [systems, setSystems] = useState<EMRSystem[]>([
    {
      id: "epic-1",
      name: "Epic EMR - Main Hospital",
      type: "Epic",
      status: "connected",
      lastSync: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      recordsCount: 1247,
      version: "2023.1",
    },
    {
      id: "cerner-1",
      name: "Cerner Millennium",
      type: "Cerner",
      status: "connected",
      lastSync: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      recordsCount: 892,
      version: "2022.03",
    },
    {
      id: "fhir-1",
      name: "FHIR Integration Layer",
      type: "FHIR",
      status: "syncing",
      lastSync: new Date().toISOString(),
      recordsCount: 3456,
      version: "R4",
    },
    {
      id: "legacy-1",
      name: "Legacy System Bridge",
      type: "Legacy",
      status: "error",
      lastSync: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      recordsCount: 234,
    },
  ]);

  const [syncHistory, setSyncHistory] = useState<SyncActivity[]>([
    {
      id: "sync-1",
      system: "Epic EMR",
      action: "Patient data sync",
      status: "success",
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      recordsProcessed: 45,
    },
    {
      id: "sync-2",
      system: "Cerner Millennium",
      action: "Discharge records sync",
      status: "success",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      recordsProcessed: 23,
    },
    {
      id: "sync-3",
      system: "Legacy System",
      action: "Historical data import",
      status: "failed",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      recordsProcessed: 0,
    },
    {
      id: "sync-4",
      system: "FHIR Integration",
      action: "Real-time sync",
      status: "in-progress",
      timestamp: new Date().toISOString(),
      recordsProcessed: 128,
    },
  ]);

  const [syncing, setSyncing] = useState<Record<string, boolean>>({});

  const connectedCount = systems.filter((s) => s.status === "connected").length;
  const errorCount = systems.filter((s) => s.status === "error").length;
  const totalRecords = systems.reduce((sum, s) => sum + (s.recordsCount || 0), 0);

  async function handleSync(systemId: string) {
    setSyncing({ ...syncing, [systemId]: true });
    
    // Simulate sync process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setSystems((prev) =>
      prev.map((s) =>
        s.id === systemId
          ? { ...s, status: "connected", lastSync: new Date().toISOString() }
          : s
      )
    );

    const newActivity: SyncActivity = {
      id: `sync-${Date.now()}`,
      system: systems.find((s) => s.id === systemId)?.name || "Unknown",
      action: "Manual sync triggered",
      status: "success",
      timestamp: new Date().toISOString(),
      recordsProcessed: Math.floor(Math.random() * 50) + 10,
    };

    setSyncHistory([newActivity, ...syncHistory]);
    setSyncing({ ...syncing, [systemId]: false });
  }

  return (
    <AuthGuard>
      <AppShell
        title="EMR Integration"
        subtitle="Monitor and manage Electronic Medical Record system connections and data synchronization."
      >
        {/* Integration Health Stats */}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Integrations"
            value={systems.length}
            icon={<Server className="h-5 w-5" />}
            variant="default"
          />
          <StatCard
            title="Connected Systems"
            value={connectedCount}
            icon={<CheckCircle2 className="h-5 w-5" />}
            variant="success"
          />
          <StatCard
            title="System Errors"
            value={errorCount}
            icon={<XCircle className="h-5 w-5" />}
            variant="error"
          />
          <StatCard
            title="Total Records"
            value={totalRecords.toLocaleString()}
            icon={<Database className="h-5 w-5" />}
            variant="primary"
          />
        </div>

        {/* EMR Systems Status */}
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">EMR System Connections</h2>
          
          <div className="space-y-3">
            {systems.map((system) => (
              <article
                key={system.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900">{system.name}</h3>
                      <StatusBadge
                        variant={
                          system.status === "connected" ? "success" :
                          system.status === "syncing" ? "info" :
                          system.status === "error" ? "error" :
                          "warning"
                        }
                        label={system.status.toUpperCase()}
                      />
                    </div>
                    
                    <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-500">Type</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-700">{system.type}</p>
                      </div>
                      {system.version && (
                        <div>
                          <p className="text-xs text-slate-500">Version</p>
                          <p className="mt-0.5 text-sm font-medium text-slate-700">{system.version}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">Records</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-700">
                          {system.recordsCount?.toLocaleString() || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Last Sync</p>
                        <p className="mt-0.5 text-sm font-medium text-slate-700">
                          {system.lastSync 
                            ? new Date(system.lastSync).toLocaleTimeString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ActionButton
                    onClick={() => handleSync(system.id)}
                    disabled={syncing[system.id] || system.status === "syncing"}
                    size="sm"
                    variant="outline"
                    icon={<RefreshCw className={`h-3.5 w-3.5 ${syncing[system.id] ? "animate-spin" : ""}`} />}
                  >
                    {syncing[system.id] ? "Syncing..." : "Sync Now"}
                  </ActionButton>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Recent Synchronization Activity */}
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent Synchronization Activity</h2>
          
          <div className="space-y-2">
            {syncHistory.map((activity) => (
              <div
                key={activity.id}
                className={`rounded-xl border p-3 ${
                  activity.status === "success" 
                    ? "border-emerald-200 bg-emerald-50" 
                    : activity.status === "failed"
                    ? "border-rose-200 bg-rose-50"
                    : "border-blue-200 bg-blue-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{activity.system}</p>
                      <StatusBadge
                        variant={
                          activity.status === "success" ? "success" :
                          activity.status === "failed" ? "error" :
                          "info"
                        }
                        label={activity.status.toUpperCase()}
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{activity.action}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      {activity.recordsProcessed !== undefined && (
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {activity.recordsProcessed} records
                        </span>
                      )}
                    </div>
                  </div>
                  {activity.status === "success" ? (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                  ) : activity.status === "failed" ? (
                    <XCircle className="h-5 w-5 flex-shrink-0 text-rose-600" />
                  ) : (
                    <Activity className="h-5 w-5 flex-shrink-0 animate-pulse text-blue-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standards & Compliance */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-600 p-2">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">FHIR R4 Compliance</h3>
                <p className="mt-1 text-sm text-slate-600">
                  All integrations follow HL7 FHIR R4 standard for interoperability and data exchange.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-emerald-600 p-2">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Data Security</h3>
                <p className="mt-1 text-sm text-slate-600">
                  All connections are encrypted using TLS 1.3 and comply with HIPAA requirements.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Message */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Integration Notes</h3>
              <p className="mt-1 text-sm text-amber-700">
                EMR integrations run automatically every 15 minutes. Manual sync can be triggered for immediate data updates. 
                System errors are automatically logged and escalated to IT support.
              </p>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
