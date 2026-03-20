"use client";

import { AlertTriangle, CheckCircle2, Clock, Gavel, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/design-system/card";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";
import { Progress } from "@/components/design-system/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/design-system/table";

type LegalCase = {
  id: string;
  caseNumber: string;
  patientName: string;
  status: "active" | "under-review" | "resolved" | "high-risk";
  priority: "low" | "medium" | "high" | "critical";
  escalatedAt: string;
  assignedCounsel?: string;
  completionPercentage?: number;
};

type LegalCaseDashboardProps = {
  cases: LegalCase[];
  stats: {
    active: number;
    underReview: number;
    resolved: number;
    highRisk: number;
  };
  onCaseClick?: (caseItem: LegalCase) => void;
};

/**
 * Enhanced dashboard for legal case management.
 * Provides a comprehensive view without modifying existing backend logic.
 */
export default function LegalCaseDashboard({ 
  cases, 
  stats,
  onCaseClick 
}: LegalCaseDashboardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "text-rose-700 font-bold";
      case "high": return "text-orange-600";
      case "medium": return "text-amber-600";
      default: return "text-slate-600";
    }
  };

  const getStatusVariant = (status: string): "default" | "success" | "warning" | "destructive" => {
    switch (status) {
      case "resolved": return "success";
      case "high-risk": return "destructive";
      case "under-review": return "warning";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.active}</div>
            <p className="text-xs text-slate-600 mt-1">Currently being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900">{stats.underReview}</div>
            <p className="text-xs text-slate-600 mt-1">Awaiting legal review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-900">{stats.resolved}</div>
            <p className="text-xs text-slate-600 mt-1">Successfully closed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">{stats.highRisk}</div>
            <p className="text-xs text-slate-600 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            Legal Escalation Cases
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Counsel</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Escalated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow 
                    key={caseItem.id}
                    className={onCaseClick ? "cursor-pointer" : ""}
                    onClick={() => onCaseClick?.(caseItem)}
                  >
                    <TableCell className="font-medium">
                      {caseItem.caseNumber}
                    </TableCell>
                    <TableCell>{caseItem.patientName}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(caseItem.status)}>
                        {caseItem.status.replace("-", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold uppercase ${getPriorityColor(caseItem.priority)}`}>
                        {caseItem.priority}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {caseItem.assignedCounsel || "Unassigned"}
                    </TableCell>
                    <TableCell>
                      {caseItem.completionPercentage !== undefined ? (
                        <div className="flex items-center gap-2">
                          <Progress value={caseItem.completionPercentage} className="w-16" />
                          <span className="text-xs text-slate-600">
                            {caseItem.completionPercentage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {new Date(caseItem.escalatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCaseClick?.(caseItem);
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {cases.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      No legal cases found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
