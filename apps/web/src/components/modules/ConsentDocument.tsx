"use client";

import React from "react";
import Image from "next/image";

export type ConsentDocumentData = {
  consentReference: string;
  templateTitleAr: string;
  templateTitleEn: string;
  templateVersionId?: string;
  approvedAt?: string | null;
  finalizedAt?: string | null;
  consentType: string;
  specialty: string;
  documentVersion?: string | null;
  status: string;
  generatedAt: string;
  language: "ar" | "en" | "bilingual";
  patientName: string;
  mrn?: string | null;
  dob?: string | null;
  gender?: string | null;
  physicianName: string;
  physicianLicense?: string | null;
  physicianSpecialty: string;
  diagnosis?: string | null;
  plannedProcedure?: string | null;
  procedureDetails?: string | null;
  risksAr?: string | null;
  risksEn?: string | null;
  sideEffectsAr?: string | null;
  sideEffectsEn?: string | null;
  alternativesAr?: string | null;
  alternativesEn?: string | null;
  refusalRisksAr?: string | null;
  refusalRisksEn?: string | null;
  expectedOutcomesAr?: string | null;
  expectedOutcomesEn?: string | null;
  physicianNotesAr?: string | null;
  physicianNotesEn?: string | null;
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
  qrDataUrl?: string;
  verifyRef: string;
};

function hasValue(value?: string | null): boolean {
  return (value || "").trim().length > 0;
}

function getBilingualMismatchWarnings(data: ConsentDocumentData): string[] {
  const checks: Array<[string, string | null | undefined, string | null | undefined]> = [
    ["Legal Text", data.legalTextAr, data.legalTextEn],
    ["PDPL", data.pdplTextAr, data.pdplTextEn],
    ["Witness Declaration", data.witnessDeclAr, data.witnessDeclEn],
    ["Physician Certification", data.physicianCertAr, data.physicianCertEn],
    ["Risks", data.risksAr, data.risksEn],
    ["Side Effects", data.sideEffectsAr, data.sideEffectsEn],
    ["Alternatives", data.alternativesAr, data.alternativesEn],
    ["Refusal Risks", data.refusalRisksAr, data.refusalRisksEn],
    ["Expected Outcomes", data.expectedOutcomesAr, data.expectedOutcomesEn],
  ];

  return checks
    .filter(([, ar, en]) => hasValue(ar) !== hasValue(en))
    .map(([label]) => `${label} mismatch`);
}

function normalizeStatusLabel(status: string, isAr: boolean): string {
  const normalized = (status || "").toUpperCase();
  if (isAr) {
    if (normalized === "FINALIZED") return "مؤرشف نهائيا";
    if (normalized === "SIGNED") return "موقع";
    if (normalized === "APPROVED") return "معتمد";
    if (normalized === "AI_DRAFT") return "مسودة AI";
    if (normalized === "PHYSICIAN_REVIEW") return "مراجعة الطبيب";
    return "مسودة";
  }
  if (normalized === "FINALIZED") return "Finalized";
  if (normalized === "SIGNED") return "Signed";
  if (normalized === "APPROVED") return "Approved";
  if (normalized === "AI_DRAFT") return "AI Draft";
  if (normalized === "PHYSICIAN_REVIEW") return "Physician Review";
  return "Draft";
}

function formatDate(date: string, locale: "ar" | "en"): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleString(locale === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function content(value?: string | null, fallback = "-"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function ArabicPane({ data }: { data: ConsentDocumentData }) {
  const syncWarnings = getBilingualMismatchWarnings(data);
  return (
    <section className="consent-pane" dir="rtl" lang="ar">
      <header className="consent-header">
        <div>
          <h1>نظام مكتبة الموافقات الطبية</h1>
          <p>{content(data.templateTitleAr, "نموذج موافقة طبية")}</p>
        </div>
        <div className="consent-brand">
          <div>International Medical Center</div>
          <strong>IMC</strong>
        </div>
      </header>

      <div className="consent-meta-grid">
        <div><span>المرجع</span><strong>{data.consentReference}</strong></div>
        <div><span>الحالة</span><strong>{normalizeStatusLabel(data.status, true)}</strong></div>
        <div><span>النسخة</span><strong>{content(data.documentVersion, "v1.0")}</strong></div>
        <div><span>التاريخ</span><strong>{formatDate(data.generatedAt, "ar")}</strong></div>
      </div>

      <div className="consent-warning consent-governance-info">
        Governance: Version {content(data.documentVersion, "v1.0")} | Approval {data.approvedAt ? formatDate(data.approvedAt, "ar") : "Pending"} | Ref {content(data.templateVersionId)}
      </div>

      {syncWarnings.length > 0 ? (
        <div className="consent-warning consent-governance-warning">
          مزامنة ثنائية اللغة غير مكتملة: {syncWarnings.join(" | ")}
        </div>
      ) : null}

      <div className="consent-warning">{content(data.aiWarningAr, "AI-assisted draft pending physician validation.")}</div>

      <div className="consent-grid two">
        <article className="consent-card">
          <h3>بيانات المريض</h3>
          <p><strong>الاسم:</strong> {data.patientName}</p>
          <p><strong>MRN:</strong> {content(data.mrn)}</p>
          <p><strong>تاريخ الميلاد:</strong> {content(data.dob)}</p>
          <p><strong>الجنس:</strong> {content(data.gender)}</p>
          <p><strong>التشخيص:</strong> {content(data.diagnosis)}</p>
        </article>
        <article className="consent-card">
          <h3>بيانات الطبيب</h3>
          <p><strong>الاسم:</strong> {data.physicianName}</p>
          <p><strong>رقم الترخيص:</strong> {content(data.physicianLicense)}</p>
          <p><strong>التخصص:</strong> {data.physicianSpecialty}</p>
          <p><strong>نوع الموافقة:</strong> {data.consentType}</p>
          <p><strong>الإجراء المخطط:</strong> {content(data.plannedProcedure)}</p>
        </article>
      </div>

      <article className="consent-card full">
        <h3>التفاصيل الطبية</h3>
        <p><strong>تفاصيل الإجراء:</strong> {content(data.procedureDetails)}</p>
        <p><strong>المخاطر:</strong></p>
        <pre>{content(data.risksAr)}</pre>
        <p><strong>الآثار الجانبية:</strong></p>
        <pre>{content(data.sideEffectsAr)}</pre>
        <p><strong>البدائل:</strong></p>
        <pre>{content(data.alternativesAr)}</pre>
        <p><strong>مخاطر الرفض:</strong></p>
        <pre>{content(data.refusalRisksAr)}</pre>
        <p><strong>النتائج المتوقعة:</strong></p>
        <pre>{content(data.expectedOutcomesAr)}</pre>
        <p><strong>ملاحظات الطبيب:</strong></p>
        <pre>{content(data.physicianNotesAr)}</pre>
      </article>

      <article className="consent-card full legal-block">
        <h3>الإقرار القانوني والخصوصية</h3>
        <p>{data.legalTextAr}</p>
        <p>{data.pdplTextAr}</p>
        <p>{data.witnessDeclAr}</p>
        <p>{data.physicianCertAr}</p>
      </article>

      <footer className="consent-signatures">
        <div>
          <strong>توقيع المريض / الولي</strong>
          <span>______________________</span>
        </div>
        <div>
          <strong>توقيع الطبيب</strong>
          <span>______________________</span>
        </div>
        <div>
          <strong>توقيع الشاهد</strong>
          <span>______________________</span>
        </div>
        <div className="qr-block">
          {data.qrDataUrl ? <Image src={data.qrDataUrl} alt="QR" width={82} height={82} unoptimized /> : null}
          <small>{data.verifyRef}</small>
        </div>
      </footer>
    </section>
  );
}

function EnglishPane({ data }: { data: ConsentDocumentData }) {
  const syncWarnings = getBilingualMismatchWarnings(data);
  return (
    <section className="consent-pane" dir="ltr" lang="en">
      <header className="consent-header">
        <div>
          <h1>Medical Consent Library Engine</h1>
          <p>{content(data.templateTitleEn, "Medical Consent Form")}</p>
        </div>
        <div className="consent-brand">
          <div>International Medical Center</div>
          <strong>IMC</strong>
        </div>
      </header>

      <div className="consent-meta-grid">
        <div><span>Reference</span><strong>{data.consentReference}</strong></div>
        <div><span>Status</span><strong>{normalizeStatusLabel(data.status, false)}</strong></div>
        <div><span>Version</span><strong>{content(data.documentVersion, "v1.0")}</strong></div>
        <div><span>Timestamp</span><strong>{formatDate(data.generatedAt, "en")}</strong></div>
      </div>

      <div className="consent-warning consent-governance-info">
        Governance: Version {content(data.documentVersion, "v1.0")} | Approval {data.approvedAt ? formatDate(data.approvedAt, "en") : "Pending"} | Ref {content(data.templateVersionId)}
      </div>

      {syncWarnings.length > 0 ? (
        <div className="consent-warning consent-governance-warning">
          Bilingual synchronization warning: {syncWarnings.join(" | ")}
        </div>
      ) : null}

      <div className="consent-warning">{content(data.aiWarningEn, "AI-assisted draft pending physician validation.")}</div>

      <div className="consent-grid two">
        <article className="consent-card">
          <h3>Patient Profile</h3>
          <p><strong>Name:</strong> {data.patientName}</p>
          <p><strong>MRN:</strong> {content(data.mrn)}</p>
          <p><strong>DOB:</strong> {content(data.dob)}</p>
          <p><strong>Gender:</strong> {content(data.gender)}</p>
          <p><strong>Diagnosis:</strong> {content(data.diagnosis)}</p>
        </article>
        <article className="consent-card">
          <h3>Physician Profile</h3>
          <p><strong>Name:</strong> {data.physicianName}</p>
          <p><strong>License:</strong> {content(data.physicianLicense)}</p>
          <p><strong>Specialty:</strong> {data.physicianSpecialty}</p>
          <p><strong>Consent Type:</strong> {data.consentType}</p>
          <p><strong>Planned Procedure:</strong> {content(data.plannedProcedure)}</p>
        </article>
      </div>

      <article className="consent-card full">
        <h3>Medical Content</h3>
        <p><strong>Procedure Details:</strong> {content(data.procedureDetails)}</p>
        <p><strong>Risks:</strong></p>
        <pre>{content(data.risksEn)}</pre>
        <p><strong>Side Effects:</strong></p>
        <pre>{content(data.sideEffectsEn)}</pre>
        <p><strong>Alternatives:</strong></p>
        <pre>{content(data.alternativesEn)}</pre>
        <p><strong>Refusal Risks:</strong></p>
        <pre>{content(data.refusalRisksEn)}</pre>
        <p><strong>Expected Outcomes:</strong></p>
        <pre>{content(data.expectedOutcomesEn)}</pre>
        <p><strong>Physician Notes:</strong></p>
        <pre>{content(data.physicianNotesEn)}</pre>
      </article>

      <article className="consent-card full legal-block">
        <h3>Legal and Privacy Declarations</h3>
        <p>{data.legalTextEn}</p>
        <p>{data.pdplTextEn}</p>
        <p>{data.witnessDeclEn}</p>
        <p>{data.physicianCertEn}</p>
      </article>

      <footer className="consent-signatures">
        <div>
          <strong>Patient / Guardian Signature</strong>
          <span>______________________</span>
        </div>
        <div>
          <strong>Physician Signature</strong>
          <span>______________________</span>
        </div>
        <div>
          <strong>Witness Signature</strong>
          <span>______________________</span>
        </div>
        <div className="qr-block">
          {data.qrDataUrl ? <Image src={data.qrDataUrl} alt="QR" width={82} height={82} unoptimized /> : null}
          <small>{data.verifyRef}</small>
        </div>
      </footer>
    </section>
  );
}

export default function ConsentDocument({ data }: { data: ConsentDocumentData }) {
  if (data.language === "ar") {
    return <ArabicPane data={data} />;
  }

  if (data.language === "en") {
    return <EnglishPane data={data} />;
  }

  return (
    <div className="consent-bilingual-grid">
      <ArabicPane data={{ ...data, language: "ar" }} />
      <EnglishPane data={{ ...data, language: "en" }} />
    </div>
  );
}
