"use client";

import { Badge } from "@/components/design-system/badge";

type Doc = {
  document_type: string;
  document_version: number;
  document_hash: string;
  file_name: string;
  generated_at: string;
};

type Props = {
  documents: Doc[];
};

export default function LegalPackageDocumentsList({ documents }: Props) {
  return (
    <div className="space-y-2">
      {documents.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">No package documents generated yet.</div>
      ) : (
        documents.map((doc) => (
          <div key={`${doc.document_type}-${doc.document_version}`} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">{doc.document_type}</span>
              <Badge variant="outline">v{doc.document_version}</Badge>
            </div>
            <div className="mt-1 text-xs text-slate-600">{doc.file_name}</div>
            <div className="mt-1 text-xs text-slate-500">SHA-256: {doc.document_hash.slice(0, 24)}...</div>
            <div className="mt-1 text-xs text-slate-500">{new Date(doc.generated_at).toLocaleString()}</div>
          </div>
        ))
      )}
    </div>
  );
}
