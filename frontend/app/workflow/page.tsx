"use client";

import Link from "next/link";
import { ArrowRight, FileText, Workflow } from "lucide-react";
import AppShell from "@/components/AppShell";
import AuthGuard from "@/components/AuthGuard";

export default function WorkflowPage() {
  return (
    <AuthGuard>
      <AppShell
        title="Workflow / Documents"
        subtitle="Open any case to run discharge refusal workflow actions and generate documents."
        actions={
          <>
            <Link
              href="/cases"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Workflow className="h-4 w-4" />
              Cases
            </Link>
            <Link
              href="/cases/new"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-white"
            >
              <FileText className="h-4 w-4" />
              New Case
            </Link>
          </>
        }
      >
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          <p>
            To access workflow actions, forms, and generated documents, open a case details page.
          </p>
          <p className="mt-2">
            From there you can run discharge refusal workflow steps, generate refusal forms,
            generate financial notices, and download/view documents.
          </p>
          <Link
            href="/cases"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open Cases
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AppShell>
    </AuthGuard>
  );
}
