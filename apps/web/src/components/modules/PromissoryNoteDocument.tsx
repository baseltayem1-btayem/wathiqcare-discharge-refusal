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
  creditorName?: string;
  creditorCR?: string;
  reason?: string;
  referenceNumber?: string;
  statusCode?: string;
  qrDataUrl?: string;
  verificationUrl?: string;
  language: "ar" | "en";
};

function formatDate(dateStr: string, locale: "ar" | "en"): string {
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function statusLabelAr(statusCode?: string): string {
  const normalized = (statusCode || "").toUpperCase();
  if (normalized === "SETTLED") return "مغلق";
  if (normalized === "ACTIVE") return "نشط";
  if (normalized === "VOID") return "ملغى";
  if (normalized === "OVERDUE") return "متأخر";
  return "مسودة";
}

function statusLabelEn(statusCode?: string): string {
  const normalized = (statusCode || "").toUpperCase();
  if (normalized === "SETTLED") return "Closed";
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "VOID") return "Voided";
  if (normalized === "OVERDUE") return "Overdue";
  return "Draft";
}

function ArabicDocument({ data }: { data: PromissoryNoteData }) {
  const amountFormatted = formatAmountNumeric(data.amount);
  const amountWords = toArabicWords(data.amount, data.currency);
  const issueDate = formatDate(data.issueDate, "ar");
  const dueDate = formatDate(data.dueDate, "ar");
  const creditorName = data.creditorName || "شركة المركز الطبي الدولي مساهمة مقفلة";

  return (
    <div dir="rtl" lang="ar" className="promissory-document ar-doc nafith-doc">
      <header className="pn-header">
        <div className="pn-logo-box">
          <img
            src="https://imc.med.sa/images/logo.jpg"
            alt="International Medical Center"
            className="pn-logo"
            loading="eager"
          />
        </div>
        <div className="pn-title-wrap">
          <h1 className="pn-title">سند لأمر</h1>
          <div className="pn-note-number">رقم السند: <strong>{data.noteNumber}</strong></div>
        </div>
      </header>

      <div className="pn-status-row">
        <span className="pn-status-label">حالة السند</span>
        <span className="pn-status-badge">{statusLabelAr(data.statusCode)}</span>
      </div>

      <section className="pn-main-panel">
        <div className="pn-main-right">
          <div className="pn-band-title">تفاصيل السند</div>
          <table className="pn-details-table">
            <tbody>
              <tr><td>تاريخ الإنشاء</td><td>{issueDate}</td></tr>
              <tr><td>تاريخ الاستحقاق</td><td>{dueDate}</td></tr>
              <tr><td>مدينة الإصدار</td><td>{data.issueCity || "الرياض"}</td></tr>
              <tr><td>مدينة الوفاء</td><td>{data.paymentCity || data.issueCity || "الرياض"}</td></tr>
              <tr><td>سبب إنشاء السند</td><td>{data.reason || "—"}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="pn-main-left">
          <div className="pn-amount-card">
            <div className="pn-amount-label">قيمة السند رقماً</div>
            <div className="pn-amount-number">{amountFormatted} {data.currency}</div>
            <div className="pn-amount-label pn-amount-label-words">قيمة السند كتابة</div>
            <div className="pn-amount-words">{amountWords}</div>
          </div>
        </div>
      </section>

      <section className="pn-party-section">
        <div className="pn-band-title">تفاصيل الدائن</div>
        <table className="pn-party-table">
          <tbody>
            <tr><td>الاسم</td><td>{creditorName}</td></tr>
            <tr><td>الرقم الوطني الموحد / السجل التجاري</td><td>{data.creditorCR || "—"}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pn-party-section">
        <div className="pn-band-title">تفاصيل المدين</div>
        <table className="pn-party-table">
          <tbody>
            <tr><td>الاسم</td><td>{data.debtorName}</td></tr>
            <tr><td>رقم الهوية</td><td>{data.debtorId || "—"}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pn-bottom-grid">
        <div className="pn-legal-box">
          <p>
            أتعهد بأن أدفع لأمر {creditorName} مبلغاً وقدره ({amountFormatted}) {data.currency}، {amountWords}، وفق البيانات المذكورة أعلاه، ولحامل هذا السند حق الرجوع دون مصروفات أو احتجاج بعدم الوفاء.
          </p>
          <p className="pn-legal-line">اسم المدين: {data.debtorName}</p>
          <p className="pn-legal-line">رقم الهوية: {data.debtorId || "—"}</p>
          <p className="pn-legal-line">تاريخ الإصدار: {issueDate}</p>
          <p className="pn-legal-line">ولحامل هذا السند حق الرجوع دون مصروفات أو احتجاج بعدم الوفاء.</p>
        </div>

        <div className="pn-qr-box">
          {data.qrDataUrl ? <img src={data.qrDataUrl} alt="QR" className="pn-qr-img" /> : null}
          <div className="pn-qr-text">
            هذا السند لأمر صادر من خلال منصة واثق كير الإلكترونية، وقد تم إنشاؤه والمصادقة عليه إلكترونياً وفق البيانات المسجلة في المنصة، ويمكن التحقق منه من خلال رمز التحقق أو الرقم المرجعي.
          </div>
          <div className="pn-qr-ref">{data.verificationUrl || data.referenceNumber || data.noteNumber}</div>
        </div>
      </section>
    </div>
  );
}

function EnglishDocument({ data }: { data: PromissoryNoteData }) {
  const amountFormatted = formatAmountNumeric(data.amount);
  const amountWords = toEnglishWords(data.amount, data.currency);
  const issueDate = formatDate(data.issueDate, "en");
  const dueDate = formatDate(data.dueDate, "en");
  const creditorName = data.creditorName || "International Medical Center (IMC)";

  return (
    <div dir="ltr" lang="en" className="promissory-document en-doc nafith-doc">
      <header className="pn-header">
        <div className="pn-logo-box">
          <img src="https://imc.med.sa/images/logo.jpg" alt="International Medical Center" className="pn-logo" />
        </div>
        <div className="pn-title-wrap">
          <h1 className="pn-title">Promissory Note</h1>
          <div className="pn-note-number">Note No.: <strong>{data.noteNumber}</strong></div>
        </div>
      </header>

      <div className="pn-status-row">
        <span className="pn-status-label">Note Status</span>
        <span className="pn-status-badge">{statusLabelEn(data.statusCode)}</span>
      </div>

      <section className="pn-main-panel en-main-panel">
        <div className="pn-main-right">
          <div className="pn-band-title">Note Details</div>
          <table className="pn-details-table">
            <tbody>
              <tr><td>Issue Date</td><td>{issueDate}</td></tr>
              <tr><td>Due Date</td><td>{dueDate}</td></tr>
              <tr><td>Issue City</td><td>{data.issueCity || "Riyadh"}</td></tr>
              <tr><td>Payment City</td><td>{data.paymentCity || data.issueCity || "Riyadh"}</td></tr>
              <tr><td>Reason</td><td>{data.reason || "—"}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="pn-main-left">
          <div className="pn-amount-card">
            <div className="pn-amount-label">Amount (Numeric)</div>
            <div className="pn-amount-number">{amountFormatted} {data.currency}</div>
            <div className="pn-amount-label pn-amount-label-words">Amount (In Words)</div>
            <div className="pn-amount-words">{amountWords}</div>
          </div>
        </div>
      </section>

      <section className="pn-party-section">
        <div className="pn-band-title">Creditor Details</div>
        <table className="pn-party-table">
          <tbody>
            <tr><td>Name</td><td>{creditorName}</td></tr>
            <tr><td>Unified ID / Commercial Registration</td><td>{data.creditorCR || "—"}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pn-party-section">
        <div className="pn-band-title">Debtor Details</div>
        <table className="pn-party-table">
          <tbody>
            <tr><td>Name</td><td>{data.debtorName}</td></tr>
            <tr><td>ID Number</td><td>{data.debtorId || "—"}</td></tr>
          </tbody>
        </table>
      </section>

      <section className="pn-bottom-grid en-bottom-grid">
        <div className="pn-legal-box">
          <p>
            I undertake to pay to the order of {creditorName} an amount of ({amountFormatted}) {data.currency}, {amountWords}, according to the details above.
          </p>
          <p className="pn-legal-line">Debtor Name: {data.debtorName}</p>
          <p className="pn-legal-line">Debtor ID: {data.debtorId || "—"}</p>
          <p className="pn-legal-line">Issue Date: {issueDate}</p>
        </div>

        <div className="pn-qr-box">
          {data.qrDataUrl ? <img src={data.qrDataUrl} alt="QR" className="pn-qr-img" /> : null}
          <div className="pn-qr-text">
            Issued through WathiqCare electronic platform. Verification is available using the QR code or reference number.
          </div>
          <div className="pn-qr-ref">{data.verificationUrl || data.referenceNumber || data.noteNumber}</div>
        </div>
      </section>
    </div>
  );
}

export default function PromissoryNoteDocument({ data }: { data: PromissoryNoteData }) {
  return data.language === "ar" ? <ArabicDocument data={data} /> : <EnglishDocument data={data} />;
}
