"use client";

import Link from "next/link";
import { ArrowRight, Eye, FileText } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/design-system/table";
import { Badge } from "@/components/design-system/badge";
import { Button } from "@/components/design-system/button";

type DischargeCaseItem = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  patientMrn?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

type DischargeCaseTableProps = {
  cases: DischargeCaseItem[];
  loading?: boolean;
  onRowClick?: (caseItem: DischargeCaseItem) => void;
};

/**
 * Enhanced table for discharge cases using the design system.
 * Wraps existing case data without modifying backend logic.
 */
export default function DischargeCaseTable({ 
  cases, 
  loading = false,
  onRowClick 
}: DischargeCaseTableProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">Loading discharge cases...</p>
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">No discharge cases found</p>
        <p className="mt-1 text-xs text-slate-500">Cases will appear here as they are created</p>
      </div>
    );
  }

  const getStatusVariant = (status: string | null | undefined) => {
    const normalized = (status || "draft").toLowerCase();
    if (normalized === "closed" || normalized === "completed") return "success";
    if (normalized === "escalated") return "destructive";
    if (normalized === "in_progress" || normalized === "active") return "warning";
    return "secondary";
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Case Number</TableHead>
            <TableHead>Patient Name</TableHead>
            <TableHead>MRN</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((caseItem) => (
            <TableRow 
              key={caseItem.id}
              className={onRowClick ? "cursor-pointer" : ""}
              onClick={() => onRowClick?.(caseItem)}
            >
              <TableCell className="font-medium">
                {caseItem.caseNumber || caseItem.id.slice(0, 8)}
              </TableCell>
              <TableCell>{caseItem.patientName || "-"}</TableCell>
              <TableCell>{caseItem.patientMrn || "-"}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(caseItem.status)}>
                  {(caseItem.status || "Draft").toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-slate-600">
                {caseItem.createdAt 
                  ? new Date(caseItem.createdAt).toLocaleDateString()
                  : "-"
                }
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/cases/${caseItem.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="h-3.5 w-3.5" />
                    Open
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
