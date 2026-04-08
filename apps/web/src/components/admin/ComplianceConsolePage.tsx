"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { apiFetch } from "@/utils/api";

type ComplianceConsolePageProps = {
  title: string;
  subtitle: string;
  endpoint: string;
  highlights?: string[];
};

function formatValue(value: unknown): string {
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value == null) {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return String(value.length);
  }
  return String(Object.keys(value as object).length);
}

function deriveMetrics(data: Record<string, unknown> | null) {
  if (!data) {
    return [] as Array<{ key: string; label: string; value: string }>;
  }

  const source = (typeof data.metrics === "object" && data.metrics ? (data.metrics as Record<string, unknown>) : data);
  return Object.entries(source)
    .filter(([, value]) => ["number", "boolean", "string"].includes(typeof value))
    .slice(0, 6)
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, " "),
      value: formatValue(value),
    }));
}

function summarizeSection(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function ComplianceConsolePage({
  title,
  subtitle,
  endpoint,
  highlights = [],
}: ComplianceConsolePageProps) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<Record<string, unknown>>(endpoint, {
        authFailureMode: "inline",
        cache: "no-store",
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => deriveMetrics(data), [data]);
  const sections = useMemo(() => {
    if (!data) return [] as Array<[string, unknown]>;
    return Object.entries(data).filter(([key]) => key !== "metrics").slice(0, 8);
  }, [data]);

  return (
    <AuthGuard>
      <AppShell
        title={title}
        subtitle={subtitle}
        actions={
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        }
      >
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {highlights.slice(0, 4).map((item) => (
            <Card key={item}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-cyan-50 p-2 text-cyan-700">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600">Loading compliance data…</div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {metrics.length > 0 ? (
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.key}>
                <CardHeader>
                  <CardTitle className="text-sm capitalize text-slate-600">{metric.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">{metric.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {sections.map(([key, value]) => (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="capitalize">{key.replace(/_/g, " ")}</CardTitle>
                  <Badge variant="outline">
                    {Array.isArray(value) ? `${value.length} item(s)` : typeof value}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="max-h-[320px] overflow-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                  {summarizeSection(value)}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      </AppShell>
    </AuthGuard>
  );
}