"use client";

import { CheckCircle2, Clock, Download, Eye, FileSearch } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/make-ui/badge";
import { Button } from "@/components/make-ui/button";
import { Card, CardContent } from "@/components/make-ui/card";
import { Progress } from "@/components/make-ui/progress";

const reviews = [
  {
    id: "MRR-2026-047",
    caseId: "ML-2026-0047",
    patient: "Jennifer Martinez",
    recordType: "Surgical Records",
    pages: 247,
    reviewer: "Dr. Robert Anderson",
    status: "in_progress",
    progress: 65,
    dueDate: "2026-03-20",
    findings: "Preliminary review shows deviation from standard surgical protocol",
  },
  {
    id: "MRR-2026-046",
    caseId: "ML-2026-0046",
    patient: "Robert Thompson",
    recordType: "Radiology Reports",
    pages: 89,
    reviewer: "Dr. Sarah Mitchell",
    status: "completed",
    progress: 100,
    dueDate: "2026-03-10",
    findings: "Clear failure to identify obvious mass on imaging studies. Expert opinion completed.",
  },
];

function statusClass(status: string) {
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "in_progress") return "bg-blue-100 text-blue-700";
  return "bg-yellow-100 text-yellow-700";
}

export function MedicalRecordReview() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Medical Record Review</h2>
        <p className="mt-1 text-slate-600">Independent medical record analysis and expert review</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">Pending Reviews</p><p className="text-2xl font-semibold text-slate-900">0</p></div><Clock className="h-8 w-8 text-yellow-600" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">In Progress</p><p className="text-2xl font-semibold text-slate-900">1</p></div><FileSearch className="h-8 w-8 text-blue-600" /></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center justify-between"><div><p className="text-sm text-slate-600">Completed</p><p className="text-2xl font-semibold text-slate-900">1</p></div><CheckCircle2 className="h-8 w-8 text-green-600" /></div></CardContent></Card>
      </div>

      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{review.patient} - {review.recordType}</h3>
                  <p className="text-sm text-slate-600">Case: {review.caseId} - {review.pages} pages</p>
                </div>
                <Badge className={statusClass(review.status)}>{review.status.replace("_", " ").toUpperCase()}</Badge>
              </div>

              {review.status === "in_progress" ? (
                <div className="mb-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span>Review Progress</span>
                    <span className="font-medium">{review.progress}%</span>
                  </div>
                  <Progress value={review.progress} />
                </div>
              ) : null}

              <p className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">{review.findings}</p>

              <div className="flex gap-2">
                <Button variant="outline" size="sm"><Eye className="h-4 w-4" />View Records</Button>
                {review.status === "completed" ? (
                  <Button variant="outline" size="sm" onClick={() => toast.success("Downloading report...")}>
                    <Download className="h-4 w-4" />Download Report
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
