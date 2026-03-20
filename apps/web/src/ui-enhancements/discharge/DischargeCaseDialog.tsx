"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, FileText, Save } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/design-system/dialog";
import { Button } from "@/components/design-system/button";
import { Badge } from "@/components/design-system/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/design-system/tabs";

type DischargeCaseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData: {
    caseNumber: string;
    patientName: string;
    patientMrn: string;
    status: string;
    refusalReason?: string;
    documents?: Array<{ id: string; title: string; createdAt: string }>;
  } | null;
  onSave?: () => void;
  saving?: boolean;
};

/**
 * Enhanced dialog for viewing and editing discharge case details.
 * Wraps existing case data and actions without modifying backend services.
 */
export default function DischargeCaseDialog({
  open,
  onOpenChange,
  caseData,
  onSave,
  saving = false,
}: DischargeCaseDialogProps) {
  const [activeTab, setActiveTab] = React.useState("overview");

  if (!caseData) return null;

  const statusVariant = 
    caseData.status === "ESCALATED" ? "destructive" :
    caseData.status === "CLOSED" ? "success" :
    caseData.status === "IN_PROGRESS" ? "warning" :
    "secondary";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Discharge Case Details</DialogTitle>
              <DialogDescription>
                Case {caseData.caseNumber} - {caseData.patientName}
              </DialogDescription>
            </div>
            <Badge variant={statusVariant}>{caseData.status}</Badge>
          </div>
        </DialogHeader>

        <DialogClose />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Patient Name</p>
                <p className="mt-1 text-sm text-slate-900">{caseData.patientName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Medical Record Number</p>
                <p className="mt-1 text-sm text-slate-900">{caseData.patientMrn}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Refusal Reason</p>
                <p className="mt-1 text-sm text-slate-700">
                  {caseData.refusalReason || "No refusal reason provided"}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {caseData.documents && caseData.documents.length > 0 ? (
              <div className="space-y-2">
                {caseData.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doc.title}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm text-slate-600">No documents generated yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="actions" className="mt-4">
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  <p className="text-sm font-medium">Workflow Stage: {caseData.status}</p>
                </div>
              </div>

              {caseData.status === "ESCALATED" && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center gap-2 text-rose-800">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-medium">This case requires legal escalation</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onSave && (
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
