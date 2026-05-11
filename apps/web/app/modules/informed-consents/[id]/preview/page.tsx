"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import ConsentDocument, { type ConsentDocumentData } from "@/components/modules/ConsentDocument";
import "@/styles/consent-document.css";

type ConsentDocumentApi = {
  id: string;
  consentReference: string;
  status: string;
  templateVersionId: string;
  language: string;
  documentVersion: string | null;
  approvedAt: string | null;
  finalizedAt: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  patientName: string;
  mrn: string | null;
  dob: string | null;
  gender: string | null;
  physicianName: string;
  physicianLicense: string | null;
  physicianSpecialty: string;
  diagnosis: string | null;
  plannedProcedure: string | null;
  procedureDetails: string | null;
  risksAr: string | null;
  risksEn: string | null;
  sideEffectsAr: string | null;
  sideEffectsEn: string | null;
  alternativesAr: string | null;
  alternativesEn: string | null;
  refusalRisksAr: string | null;
  refusalRisksEn: string | null;
  expectedOutcomesAr: string | null;
  expectedOutcomesEn: string | null;
  physicianNotesAr: string | null;
  physicianNotesEn: string | null;
  legalTextAr: string;
  legalTextEn: string;
  pdplTextAr: string;
  pdplTextEn: string;
  witnessDeclAr: string;
  witnessDeclEn: string;
  physicianCertAr: string;
  physicianCertEn: string;
  aiWarningAr: string;
  aiWarningEn: string;
  template: {
    consentType: string;
    specialty: string;
    titleAr: string;
    titleEn: string;
  };
};

export default function ConsentPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const lang = (search.get("lang") as "ar" | "en" | "bilingual") || "bilingual";
  const [doc, setDoc] = useState<ConsentDocumentApi | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");

    fetch(`/api/modules/informed-consents/documents/${id}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await response.text());
        }
        return response.json() as Promise<ConsentDocumentApi>;
      })
      .then(async (data) => {
        setDoc(data);
        const qrPayload = [
          `CONSENT:${data.consentReference}`,
          `DOC:${data.id}`,
          `STATUS:${data.status}`,
          `VERIFY:/verify/consent/${data.id}`,
        ].join("|");
        const q = await QRCode.toDataURL(qrPayload, { width: 140, margin: 1, errorCorrectionLevel: "M" });
        setQrDataUrl(q);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const model = useMemo<ConsentDocumentData | null>(() => {
    if (!doc) return null;
    return {
      consentReference: doc.consentReference,
      templateTitleAr: doc.template.titleAr,
      templateTitleEn: doc.template.titleEn,
      consentType: doc.template.consentType,
      specialty: doc.template.specialty,
      templateVersionId: doc.templateVersionId,
      approvedAt: doc.approvedAt,
      finalizedAt: doc.finalizedAt,
      documentVersion: doc.documentVersion,
      status: doc.status,
      generatedAt: doc.createdAt,
      language: lang,
      patientName: doc.patientName,
      mrn: doc.mrn,
      dob: doc.dob,
      gender: doc.gender,
      physicianName: doc.physicianName,
      physicianLicense: doc.physicianLicense,
      physicianSpecialty: doc.physicianSpecialty,
      diagnosis: doc.diagnosis,
      plannedProcedure: doc.plannedProcedure,
      procedureDetails: doc.procedureDetails,
      risksAr: doc.risksAr,
      risksEn: doc.risksEn,
      sideEffectsAr: doc.sideEffectsAr,
      sideEffectsEn: doc.sideEffectsEn,
      alternativesAr: doc.alternativesAr,
      alternativesEn: doc.alternativesEn,
      refusalRisksAr: doc.refusalRisksAr,
      refusalRisksEn: doc.refusalRisksEn,
      expectedOutcomesAr: doc.expectedOutcomesAr,
      expectedOutcomesEn: doc.expectedOutcomesEn,
      physicianNotesAr: doc.physicianNotesAr,
      physicianNotesEn: doc.physicianNotesEn,
      legalTextAr: doc.legalTextAr,
      legalTextEn: doc.legalTextEn,
      pdplTextAr: doc.pdplTextAr,
      pdplTextEn: doc.pdplTextEn,
      witnessDeclAr: doc.witnessDeclAr,
      witnessDeclEn: doc.witnessDeclEn,
      physicianCertAr: doc.physicianCertAr,
      physicianCertEn: doc.physicianCertEn,
      aiWarningAr: doc.aiWarningAr,
      aiWarningEn: doc.aiWarningEn,
      qrDataUrl,
      verifyRef: `/verify/consent/${doc.id}`,
    };
  }, [doc, qrDataUrl, lang]);

  async function downloadPdf() {
    if (!id) return;
    setDownloading(true);
    try {
      const response = await fetch(`/api/modules/informed-consents/documents/${id}/pdf?lang=${lang}`);
      if (!response.ok) {
        throw new Error("Failed to generate consent PDF");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `CONSENT-${doc?.consentReference || id}-${lang}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert(String(err));
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-600">Loading consent preview...</div>;
  }

  if (error || !model) {
    return <div className="p-6 text-sm text-red-600">{error || "Consent document not found"}</div>;
  }

  return (
    <div>
      <div className="no-print sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => {
            const next = lang === "ar" ? "en" : lang === "en" ? "bilingual" : "ar";
            router.replace(`/modules/informed-consents/${id}/preview?lang=${next}`);
          }}
          className="px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm"
        >
          {lang === "ar" ? "English" : lang === "en" ? "Bilingual" : "Arabic"}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => window.print()}
          className="px-3 py-1 rounded bg-[#002B5C] text-white hover:opacity-90 text-sm"
        >
          Print
        </button>
        <button
          type="button"
          onClick={downloadPdf}
          disabled={downloading}
          className="px-3 py-1 rounded bg-[#C9A13B] text-[#0f172a] hover:opacity-90 text-sm disabled:opacity-60"
        >
          {downloading ? "Generating..." : "Download PDF"}
        </button>
      </div>

      <div className="bg-slate-200 p-4 min-h-screen">
        <ConsentDocument data={model} />
      </div>
    </div>
  );
}
