"use client";

import { Download, FileText, Trash2 } from "lucide-react";

type DocumentItem = {
    id: string;
    title: string;
    type: string;
    fileName: string;
    createdAt?: string | null;
};

type DocumentListProps = {
    items: DocumentItem[];
    locale?: string;
    onDownload?: (documentId: string) => void;
    onDelete?: (documentId: string) => void;
};

function formatDate(value: string | null | undefined, locale: string) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString(locale);
}

export default function DocumentList({
    items,
    locale = "en-US",
    onDownload,
    onDelete,
}: DocumentListProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No documents available.
            </div>
        );
    }

    return (
        <ul className="space-y-2">
            {items.map((item) => (
                <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-500" />
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                <p className="text-xs text-slate-500">{item.fileName}</p>
                            </div>
                        </div>

                        <div className="inline-flex items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                {item.type}
                            </span>
                            <span className="text-xs text-slate-500">{formatDate(item.createdAt, locale)}</span>
                        </div>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                        {onDownload ? (
                            <button
                                type="button"
                                onClick={() => onDownload(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </button>
                        ) : null}

                        {onDelete ? (
                            <button
                                type="button"
                                onClick={() => onDelete(item.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </button>
                        ) : null}
                    </div>
                </li>
            ))}
        </ul>
    );
}
