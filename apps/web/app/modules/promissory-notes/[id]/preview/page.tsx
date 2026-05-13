"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/i18n/I18nProvider";
import PromissoryNoteDocument, { type PromissoryNoteData } from "@/components/modules/PromissoryNoteDocument";
import "@/styles/promissory-note.css";

type NoteApiResponse = {
  id: string;
  noteNumber: string;
  debtorName: string;
  debtorIdNumber: string | null;
  issuerName: string | null;
  amount: string | number;
  currency: string;
  dueDate: string;
  createdAt: string;
  status: string;
  metadata: Record<string, unknown> | null;
  case?: {
    id: string;
    caseNumber: string;
    patientName: string;
  } | null;
};

function readMetaStr(meta: Record<string, unknown> | null | undefined, ...keys: string[]): string {
  if (!meta) return "";
  for (const key of keys) {
    const val = meta[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

export default function PromissoryNotePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang, isRtl } = useI18n();

  const [note, setNote] = useState<NoteApiResponse | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  // Allow ?lang=ar or ?lang=en override
  const langOverride = (searchParams.get("lang") as "ar" | "en") ?? lang;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/modules/promissory-notes/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<NoteApiResponse>;
      })
      .then(async (data) => {
        setNote(data);
        // Generate QR code client-side
        const { default: QRCode } = await import("qrcode");
        const qrPayload = [
          `NOTE:${data.noteNumber}`,
          `DEBTOR:${data.debtorName}`,
          `AMOUNT:${data.amount} ${data.currency}`,
          `DUE:${data.dueDate.slice(0, 10)}`,
          data.id,
        ].join("|");
        const url = await QRCode.toDataURL(qrPayload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 120,
        });
        setQrDataUrl(url);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function buildNoteData(n: NoteApiResponse): PromissoryNoteData {
    const meta = n.metadata ?? {};
    return {
      noteNumber: n.noteNumber,
      amount: Number(n.amount),
      currency: n.currency,
      dueDate: n.dueDate,
      issueDate: n.createdAt,
      issueCity: readMetaStr(meta, "issue_city", "issueCity") || (langOverride === "ar" ? "الرياض" : "Riyadh"),
      paymentCity: readMetaStr(meta, "payment_city", "paymentCity"),
      debtorName: n.debtorName,
      debtorId: n.debtorIdNumber ?? undefined,
      creditorName:
        langOverride === "ar"
          ? "شركة المركز الطبي الدولي مساهمة مقفلة"
          : "International Medical Center (IMC)",
      creditorCR: readMetaStr(meta, "creditor_cr", "creditorCR") || undefined,
      reason: readMetaStr(meta, "reason") || undefined,
      referenceNumber: n.case?.caseNumber ?? undefined,
      statusCode: n.status,
      qrDataUrl: qrDataUrl || undefined,
      verificationUrl: `/verify/pn/${n.id}`,
      language: langOverride,
    };
  }

  async function handleDownloadPdf() {
    if (!id) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/modules/promissory-notes/${id}/pdf?lang=${langOverride}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PN-${note?.noteNumber ?? id}-${langOverride}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(String(err));
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        {langOverride === "ar" ? "جارٍ التحميل..." : "Loading..."}
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex items-center justify-center h-64 text-red-600 text-sm">
        {error ?? (langOverride === "ar" ? "لم يتم العثور على السند" : "Note not found")}
      </div>
    );
  }

  const noteData = buildNoteData(note);

  return (
    <div dir={isRtl ? "rtl" : "ltr"}>
      {/* Toolbar — hidden on print */}
      <div
        className="no-print sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm px-4 py-2.5 flex flex-wrap items-center gap-2"
      >
        <button
          onClick={() => router.back()}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
          type="button"
        >
          {langOverride === "ar" ? "← رجوع" : "← Back"}
        </button>

        {/* Language toggle */}
        <button
          onClick={() => {
            const next = langOverride === "ar" ? "en" : "ar";
            router.replace(`/modules/promissory-notes/${id}/preview?lang=${next}`);
          }}
          className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
          type="button"
        >
          {langOverride === "ar" ? "English" : "عربي"}
        </button>

        <div className="flex-1" />

        <button
          onClick={handlePrint}
          className="px-4 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          type="button"
        >
          {langOverride === "ar" ? "🖨 طباعة" : "🖨 Print"}
        </button>

        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="px-4 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
          type="button"
        >
          {downloading
            ? (langOverride === "ar" ? "جارٍ التحميل..." : "Generating...")
            : (langOverride === "ar" ? "⬇ تحميل PDF" : "⬇ Download PDF")}
        </button>
      </div>

      {/* Document preview */}
      <div className="bg-[#e8edf2] p-6 min-h-screen">
        <div className="shadow-2xl">
          <PromissoryNoteDocument data={noteData} />
        </div>
      </div>
    </div>
  );
}
