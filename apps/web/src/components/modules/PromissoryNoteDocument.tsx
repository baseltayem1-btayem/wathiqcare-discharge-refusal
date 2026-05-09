"use client";

import React from "react";
import { toArabicWords, toEnglishWords, formatAmountNumeric } from "@/lib/amount-to-words";

export type PromissoryNoteData = {
  noteNumber: string;
  amount: number;
  currency: string;
  dueDate: string;
  issueDate: string;
  issueCity?: string;
  paymentCity?: string;
  debtorName: string;
  debtorId?: string;
  debtorAddress?: string;
  debtorMobile?: string;
  debtorEmail?: string;
  creditorName?: string;
  creditorCR?: string;
  reason?: string;
  referenceNumber?: string;
  generatedAt?: string;
  signatureStatus?: string;
  qrDataUrl?: string;
  verificationUrl?: string;
  language: "ar" | "en";
};

function formatDate(dateStr: string, locale: "ar" | "en" = "en"): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Arabic Document ──────────────────────────────────────────────────────────

function ArabicDocument({ data }: { data: PromissoryNoteData }) {
  const amountWords = toArabicWords(data.amount, data.currency);
  const amountFormatted = formatAmountNumeric(data.amount);
  const dueDate = formatDate(data.dueDate, "ar");
  const issueDate = formatDate(data.issueDate, "ar");
  const generatedAt = data.generatedAt ? formatDate(data.generatedAt, "ar") : issueDate;

  return (
    <div
      dir="rtl"
      lang="ar"
      className="promissory-document ar-doc"
    >
      {/* Header */}
      <div className="doc-header">
        <div className="doc-header-logos">
          <div className="doc-org-name">شركة المركز الطبي الدولي</div>
          <div className="doc-org-sub">International Medical Center (IMC)</div>
        </div>
        <div className="doc-title-block">
          <h1 className="doc-title-ar">سند لأمر</h1>
          <div className="doc-note-ref">رقم السند: <strong>{data.noteNumber}</strong></div>
        </div>
      </div>

      <div className="doc-separator" />

      {/* QR code */}
      {data.qrDataUrl && (
        <div className="doc-qr-block">
          <img src={data.qrDataUrl} alt="QR Code" className="doc-qr-img" />
          {data.verificationUrl && (
            <div className="doc-qr-ref">رمز التحقق: {data.verificationUrl}</div>
          )}
        </div>
      )}

      {/* Commitment clause */}
      <section className="doc-section">
        <p className="doc-body-text">
          أتعهد أنا الموقع أدناه /{" "}
          <strong>{data.debtorName}</strong>
        </p>
        <p className="doc-body-text">
          هوية / إقامة رقم: <strong>{data.debtorId || "—"}</strong>
        </p>
        <p className="doc-body-text doc-mt">
          بأن أدفع لأمر شركة المركز الطبي الدولي أو لأمرها مبلغاً وقدره:
        </p>
        <div className="doc-amount-block">
          <div className="doc-amount-numeric">
            {amountFormatted} {data.currency}
          </div>
          <div className="doc-amount-words">
            فقط: {amountWords}
          </div>
        </div>
        <p className="doc-body-text doc-mt">
          وذلك بتاريخ الاستحقاق المحدد في:
        </p>
        <div className="doc-field-value">{dueDate}</div>

        <p className="doc-body-text doc-mt">
          وقد تم تحرير هذا السند في مدينة:
        </p>
        <div className="doc-field-value">{data.issueCity || "الرياض"}</div>

        <p className="doc-body-text doc-mt">
          ويكون الوفاء والسداد في مدينة:
        </p>
        <div className="doc-field-value">{data.paymentCity || data.issueCity || "الرياض"}</div>

        {data.reason && (
          <>
            <p className="doc-body-text doc-mt">وذلك مقابل:</p>
            <div className="doc-field-value">{data.reason}</div>
          </>
        )}
      </section>

      {/* Legal clause */}
      <section className="doc-section doc-legal-clause">
        <p className="doc-body-text">
          ويعد هذا السند التزاماً نهائياً وغير مشروط وقابلاً للتنفيذ وفق الأنظمة واللوائح المعمول بها في المملكة العربية السعودية، ولا يحق لي الاعتراض أو الامتناع عن السداد عند حلول تاريخ الاستحقاق.
        </p>
        <p className="doc-body-text doc-mt">
          كما أقر بصحة جميع البيانات الواردة في هذا السند، وأتحمل كامل المسؤولية القانونية والمالية المترتبة عليه.
        </p>
      </section>

      <div className="doc-separator" />

      {/* Parties */}
      <div className="doc-parties-grid">
        {/* Debtor */}
        <section className="doc-party-block">
          <div className="doc-party-heading">بيانات المدين</div>
          <table className="doc-info-table">
            <tbody>
              <tr><td className="doc-label">الاسم:</td><td className="doc-value">{data.debtorName}</td></tr>
              <tr><td className="doc-label">رقم الهوية / الإقامة:</td><td className="doc-value">{data.debtorId || "—"}</td></tr>
              <tr><td className="doc-label">الجوال:</td><td className="doc-value">{data.debtorMobile || "—"}</td></tr>
              <tr><td className="doc-label">البريد الإلكتروني:</td><td className="doc-value">{data.debtorEmail || "—"}</td></tr>
              <tr><td className="doc-label">العنوان:</td><td className="doc-value">{data.debtorAddress || "—"}</td></tr>
            </tbody>
          </table>
        </section>

        {/* Creditor */}
        <section className="doc-party-block">
          <div className="doc-party-heading">بيانات الدائن</div>
          <table className="doc-info-table">
            <tbody>
              <tr><td className="doc-label">الجهة:</td><td className="doc-value">شركة المركز الطبي الدولي</td></tr>
              <tr><td className="doc-label">السجل التجاري:</td><td className="doc-value">{data.creditorCR || "—"}</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      <div className="doc-separator" />

      {/* Note metadata */}
      <div className="doc-meta-grid">
        <div className="doc-meta-item">
          <span className="doc-label">رقم السند:</span>
          <strong>{data.noteNumber}</strong>
        </div>
        {data.referenceNumber && (
          <div className="doc-meta-item">
            <span className="doc-label">الرقم المرجعي:</span>
            <strong>{data.referenceNumber}</strong>
          </div>
        )}
        <div className="doc-meta-item">
          <span className="doc-label">تاريخ الإصدار:</span>
          <strong>{issueDate}</strong>
        </div>
        <div className="doc-meta-item">
          <span className="doc-label">تاريخ التوليد:</span>
          <strong>{generatedAt}</strong>
        </div>
      </div>

      <div className="doc-separator" />

      {/* Signature block */}
      <div className="doc-signatures-grid">
        <div className="doc-sig-block">
          <div className="doc-sig-label">توقيع المدين</div>
          <div className="doc-sig-line" />
          <div className="doc-sig-name">{data.debtorName}</div>
        </div>
        <div className="doc-sig-block">
          <div className="doc-sig-label">توقيع ممثل المركز الطبي الدولي</div>
          <div className="doc-sig-line" />
          <div className="doc-sig-name">المفوّض بالتوقيع</div>
        </div>
        <div className="doc-sig-block">
          <div className="doc-sig-label">تاريخ التوقيع</div>
          <div className="doc-sig-line" />
        </div>
        <div className="doc-sig-block">
          <div className="doc-sig-label">حالة التوقيع الإلكتروني</div>
          <div className="doc-sig-status">{data.signatureStatus || "في انتظار التوقيع"}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="doc-footer">
        <div>هذا المستند تم إنشاؤه إلكترونياً بواسطة منصة وثيق كير — WathiqCare</div>
        <div>{generatedAt}</div>
      </div>
    </div>
  );
}

// ─── English Document ─────────────────────────────────────────────────────────

function EnglishDocument({ data }: { data: PromissoryNoteData }) {
  const amountWords = toEnglishWords(data.amount, data.currency);
  const amountFormatted = formatAmountNumeric(data.amount);
  const dueDate = formatDate(data.dueDate, "en");
  const issueDate = formatDate(data.issueDate, "en");
  const generatedAt = data.generatedAt ? formatDate(data.generatedAt, "en") : issueDate;

  return (
    <div
      dir="ltr"
      lang="en"
      className="promissory-document en-doc"
    >
      {/* Header */}
      <div className="doc-header">
        <div className="doc-header-logos">
          <div className="doc-org-name">International Medical Center (IMC)</div>
          <div className="doc-org-sub">شركة المركز الطبي الدولي</div>
        </div>
        <div className="doc-title-block">
          <h1 className="doc-title-en">PROMISSORY NOTE</h1>
          <div className="doc-note-ref">Note No.: <strong>{data.noteNumber}</strong></div>
        </div>
      </div>

      <div className="doc-separator" />

      {/* QR code */}
      {data.qrDataUrl && (
        <div className="doc-qr-block doc-qr-ltr">
          <img src={data.qrDataUrl} alt="QR Code" className="doc-qr-img" />
          {data.verificationUrl && (
            <div className="doc-qr-ref">Verification Ref: {data.verificationUrl}</div>
          )}
        </div>
      )}

      {/* Commitment clause */}
      <section className="doc-section">
        <p className="doc-body-text">I, the undersigned:</p>
        <div className="doc-field-value"><strong>{data.debtorName}</strong></div>
        <p className="doc-body-text">
          National ID / Iqama No.: <strong>{data.debtorId || "—"}</strong>
        </p>
        <p className="doc-body-text doc-mt">
          Hereby unconditionally undertake and promise to pay to the order of:
        </p>
        <div className="doc-field-value"><strong>International Medical Center (IMC)</strong></div>
        <p className="doc-body-text doc-mt">the amount of:</p>
        <div className="doc-amount-block">
          <div className="doc-amount-numeric">
            {amountFormatted} {data.currency}
          </div>
          <div className="doc-amount-words">
            Amount in words: {amountWords}
          </div>
        </div>
        <p className="doc-body-text doc-mt">on the due date specified below:</p>
        <div className="doc-field-value">{dueDate}</div>

        <p className="doc-body-text doc-mt">This promissory note has been issued in:</p>
        <div className="doc-field-value">{data.issueCity || "Riyadh"}</div>

        <p className="doc-body-text doc-mt">and payment shall be made in:</p>
        <div className="doc-field-value">{data.paymentCity || data.issueCity || "Riyadh"}</div>

        {data.reason && (
          <>
            <p className="doc-body-text doc-mt">Reason for issuance:</p>
            <div className="doc-field-value">{data.reason}</div>
          </>
        )}
      </section>

      {/* Legal clause */}
      <section className="doc-section doc-legal-clause">
        <p className="doc-body-text">
          This promissory note constitutes a final, binding, and unconditional financial obligation enforceable in accordance with the laws and regulations applicable in the Kingdom of Saudi Arabia.
        </p>
        <p className="doc-body-text doc-mt">
          I acknowledge the correctness of all information contained herein and accept full legal and financial responsibility arising from this document.
        </p>
      </section>

      <div className="doc-separator" />

      {/* Parties */}
      <div className="doc-parties-grid">
        {/* Debtor */}
        <section className="doc-party-block">
          <div className="doc-party-heading">Debtor Information</div>
          <table className="doc-info-table">
            <tbody>
              <tr><td className="doc-label">Name:</td><td className="doc-value">{data.debtorName}</td></tr>
              <tr><td className="doc-label">National ID / Iqama:</td><td className="doc-value">{data.debtorId || "—"}</td></tr>
              <tr><td className="doc-label">Mobile:</td><td className="doc-value">{data.debtorMobile || "—"}</td></tr>
              <tr><td className="doc-label">Email:</td><td className="doc-value">{data.debtorEmail || "—"}</td></tr>
              <tr><td className="doc-label">Address:</td><td className="doc-value">{data.debtorAddress || "—"}</td></tr>
            </tbody>
          </table>
        </section>

        {/* Creditor */}
        <section className="doc-party-block">
          <div className="doc-party-heading">Creditor Information</div>
          <table className="doc-info-table">
            <tbody>
              <tr><td className="doc-label">Organization:</td><td className="doc-value">International Medical Center (IMC)</td></tr>
              <tr><td className="doc-label">Commercial Reg. No.:</td><td className="doc-value">{data.creditorCR || "—"}</td></tr>
            </tbody>
          </table>
        </section>
      </div>

      <div className="doc-separator" />

      {/* Note metadata */}
      <div className="doc-meta-grid">
        <div className="doc-meta-item">
          <span className="doc-label">Promissory Note Number:</span>
          <strong>{data.noteNumber}</strong>
        </div>
        {data.referenceNumber && (
          <div className="doc-meta-item">
            <span className="doc-label">Reference Number:</span>
            <strong>{data.referenceNumber}</strong>
          </div>
        )}
        <div className="doc-meta-item">
          <span className="doc-label">Issue Date:</span>
          <strong>{issueDate}</strong>
        </div>
        <div className="doc-meta-item">
          <span className="doc-label">Generated At:</span>
          <strong>{generatedAt}</strong>
        </div>
      </div>

      <div className="doc-separator" />

      {/* Signature block */}
      <div className="doc-signatures-grid">
        <div className="doc-sig-block">
          <div className="doc-sig-label">Debtor Signature</div>
          <div className="doc-sig-line" />
          <div className="doc-sig-name">{data.debtorName}</div>
        </div>
        <div className="doc-sig-block">
          <div className="doc-sig-label">IMC Authorized Representative Signature</div>
          <div className="doc-sig-line" />
          <div className="doc-sig-name">Authorized Signatory</div>
        </div>
        <div className="doc-sig-block">
          <div className="doc-sig-label">Signature Date</div>
          <div className="doc-sig-line" />
        </div>
        <div className="doc-sig-block">
          <div className="doc-sig-label">Electronic Signature Status</div>
          <div className="doc-sig-status">{data.signatureStatus || "Pending Signature"}</div>
        </div>
      </div>

      {/* Footer */}
      <div className="doc-footer">
        <div>This document was electronically generated by WathiqCare Platform — منصة وثيق كير</div>
        <div>{generatedAt}</div>
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export default function PromissoryNoteDocument({ data }: { data: PromissoryNoteData }) {
  return data.language === "ar" ? <ArabicDocument data={data} /> : <EnglishDocument data={data} />;
}
