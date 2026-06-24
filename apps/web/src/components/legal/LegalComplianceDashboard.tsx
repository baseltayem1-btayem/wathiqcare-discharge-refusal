"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CheckCircle,
  FileText,
  Hash,
  Lock,
  Shield,
  ShieldCheck,
  Clock,
  Download,
  AlertCircle,
} from "lucide-react";

export type EvidenceRow = {
  id: string;
  reference: string;
  patientName: string;
  physicianName: string;
  status: string;
  version: string;
  hash: string | null;
  pdfUrl: string | null;
  generatedAt: string;
};

export type AuditEventRow = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  documentId: string | null;
  caseId: string | null;
};

export type OtpEventRow = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  ipAddress: string | null;
  entityId: string | null;
  caseId: string | null;
};

export type PdfStatusRow = {
  id: string;
  reference: string;
  patientName: string;
  status: string;
  hasPdf: boolean;
  hash: string | null;
  pdfUrl: string | null;
  finalizedAt: string | null;
  updatedAt: string;
};

type Tab = "evidence" | "audit" | "otp" | "pdf";
type Lang = "en" | "ar";

type Props = {
  tenantCode: string | null;
  isPlatform: boolean;
  evidence: EvidenceRow[];
  audit: AuditEventRow[];
  otp: OtpEventRow[];
  pdf: PdfStatusRow[];
};

const T = {
  en: {
    platformName: "WathiqCare™",
    platformSub: "Legal Compliance Review",
    tabs: { evidence: "Evidence Package", audit: "Audit Chain", otp: "OTP Event Log", pdf: "PDF Status" },
    empty: "No records to display.",
    columns: {
      reference: "Reference",
      patient: "Patient",
      physician: "Physician",
      status: "Status",
      version: "Version",
      hash: "Document Hash (SHA-256)",
      generated: "Generated",
      timestamp: "Timestamp",
      actor: "Actor",
      action: "Action",
      entity: "Entity",
      ip: "IP Address",
      pdf: "PDF",
      download: "Download",
      finalized: "Finalized",
    },
    headerBadge: "Live production data",
    tenantLabel: "Tenant",
    platformLabel: "Platform Admin View",
    langToggle: "AR",
  },
  ar: {
    platformName: "وثيق كير",
    platformSub: "مراجعة الامتثال القانوني",
    tabs: { evidence: "حزمة الأدلة", audit: "سلسلة المراجعة", otp: "سجل رموز التحقق", pdf: "حالة مستند PDF" },
    empty: "لا توجد سجلات.",
    columns: {
      reference: "المرجع",
      patient: "المريض",
      physician: "الطبيب",
      status: "الحالة",
      version: "الإصدار",
      hash: "بصمة الوثيقة (SHA-256)",
      generated: "تم الإنشاء",
      timestamp: "الختم الزمني",
      actor: "المُنفذ",
      action: "الإجراء",
      entity: "الكيان",
      ip: "عنوان IP",
      pdf: "ملف PDF",
      download: "تحميل",
      finalized: "تم اعتماده",
    },
    headerBadge: "بيانات إنتاج مباشرة",
    tenantLabel: "المستأجر",
    platformLabel: "وصول مشرف المنصة",
    langToggle: "EN",
  },
} as const;

function formatTs(iso: string): string {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return iso;
  }
}

function shortHash(hash: string | null): string {
  if (!hash) return "—";
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export default function LegalComplianceDashboard({ tenantCode, isPlatform, evidence, audit, otp, pdf }: Props) {
  const [tab, setTab] = useState<Tab>("evidence");
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang] as Lookup;
  const isAr = lang === "ar";

  const counts = useMemo(
    () => ({ evidence: evidence.length, audit: audit.length, otp: otp.length, pdf: pdf.length }),
    [evidence.length, audit.length, otp.length, pdf.length],
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className={`flex items-center gap-3 ${isAr ? "flex-row-reverse" : ""}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Shield size={18} />
            </div>
            <div className={isAr ? "text-right" : "text-left"}>
              <p className="text-sm font-bold text-indigo-700">{t.platformName}</p>
              <p className="text-xs text-slate-500">{t.platformSub}</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 ${isAr ? "flex-row-reverse" : ""}`}>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle size={12} /> {t.headerBadge}
            </span>
            {isPlatform ? (
              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-200">
                {t.platformLabel}
              </span>
            ) : tenantCode ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-mono text-slate-700">
                {t.tenantLabel}: {tenantCode}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setLang(isAr ? "en" : "ar")}
              className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {t.langToggle}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <nav
          className={`mb-5 flex flex-wrap gap-2 ${isAr ? "justify-end" : ""}`}
          aria-label="Legal compliance sections"
        >
          {(["evidence", "audit", "otp", "pdf"] as Tab[]).map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <TabIcon tab={key} />
                <span>{t.tabs[key]}</span>
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-mono tabular-nums ${
                    active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </nav>

        <main className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {tab === "evidence" ? (
            <EvidenceTable rows={evidence} t={t} isAr={isAr} />
          ) : tab === "audit" ? (
            <AuditTable rows={audit} t={t} isAr={isAr} />
          ) : tab === "otp" ? (
            <OtpTable rows={otp} t={t} isAr={isAr} />
          ) : (
            <PdfTable rows={pdf} t={t} isAr={isAr} />
          )}
        </main>
      </div>
    </div>
  );
}

function TabIcon({ tab }: { tab: Tab }) {
  if (tab === "evidence") return <ShieldCheck size={14} />;
  if (tab === "audit") return <Activity size={14} />;
  if (tab === "otp") return <Lock size={14} />;
  return <FileText size={14} />;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500">
      <AlertCircle size={14} /> {label}
    </div>
  );
}

type Lookup = (typeof T)["en"];

function EvidenceTable({ rows, t, isAr }: { rows: EvidenceRow[]; t: Lookup; isAr: boolean }) {
  if (rows.length === 0) return <EmptyState label={t.empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className={isAr ? "text-right" : "text-left"}>
            <Th>{t.columns.reference}</Th>
            <Th>{t.columns.patient}</Th>
            <Th>{t.columns.physician}</Th>
            <Th>{t.columns.status}</Th>
            <Th>{t.columns.version}</Th>
            <Th>{t.columns.hash}</Th>
            <Th>{t.columns.generated}</Th>
            <Th>{t.columns.pdf}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/60">
              <Td mono>{row.reference}</Td>
              <Td>{row.patientName}</Td>
              <Td>{row.physicianName}</Td>
              <Td>
                <StatusBadge value={row.status} />
              </Td>
              <Td mono>{row.version}</Td>
              <Td mono title={row.hash ?? undefined}>
                <span className="inline-flex items-center gap-1">
                  <Hash size={12} className="text-slate-400" />
                  {shortHash(row.hash)}
                </span>
              </Td>
              <Td mono>
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" /> {formatTs(row.generatedAt)}
                </span>
              </Td>
              <Td>
                {row.pdfUrl ? (
                  <a
                    href={row.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
                  >
                    <Download size={12} /> {t.columns.download}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditTable({ rows, t, isAr }: { rows: AuditEventRow[]; t: Lookup; isAr: boolean }) {
  if (rows.length === 0) return <EmptyState label={t.empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className={isAr ? "text-right" : "text-left"}>
            <Th>{t.columns.timestamp}</Th>
            <Th>{t.columns.actor}</Th>
            <Th>{t.columns.action}</Th>
            <Th>{t.columns.entity}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/60">
              <Td mono>{formatTs(row.timestamp)}</Td>
              <Td>{row.actor}</Td>
              <Td mono>{row.action}</Td>
              <Td mono>
                {row.entityType}
                {row.entityId ? ` · ${row.entityId.slice(0, 8)}…` : ""}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OtpTable({ rows, t, isAr }: { rows: OtpEventRow[]; t: Lookup; isAr: boolean }) {
  if (rows.length === 0) return <EmptyState label={t.empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className={isAr ? "text-right" : "text-left"}>
            <Th>{t.columns.timestamp}</Th>
            <Th>{t.columns.actor}</Th>
            <Th>{t.columns.action}</Th>
            <Th>{t.columns.ip}</Th>
            <Th>{t.columns.entity}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/60">
              <Td mono>{formatTs(row.timestamp)}</Td>
              <Td>{row.actor}</Td>
              <Td mono>{row.action}</Td>
              <Td mono>{row.ipAddress ?? "—"}</Td>
              <Td mono>{row.entityId ? `${row.entityId.slice(0, 8)}…` : "—"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PdfTable({ rows, t, isAr }: { rows: PdfStatusRow[]; t: Lookup; isAr: boolean }) {
  if (rows.length === 0) return <EmptyState label={t.empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr className={isAr ? "text-right" : "text-left"}>
            <Th>{t.columns.reference}</Th>
            <Th>{t.columns.patient}</Th>
            <Th>{t.columns.status}</Th>
            <Th>{t.columns.pdf}</Th>
            <Th>{t.columns.hash}</Th>
            <Th>{t.columns.finalized}</Th>
            <Th>{t.columns.download}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50/60">
              <Td mono>{row.reference}</Td>
              <Td>{row.patientName}</Td>
              <Td>
                <StatusBadge value={row.status} />
              </Td>
              <Td>
                {row.hasPdf ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
                    <CheckCircle size={11} /> Generated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Pending
                  </span>
                )}
              </Td>
              <Td mono title={row.hash ?? undefined}>
                {shortHash(row.hash)}
              </Td>
              <Td mono>{row.finalizedAt ? formatTs(row.finalizedAt) : "—"}</Td>
              <Td>
                {row.pdfUrl ? (
                  <a
                    href={row.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
                  >
                    <Download size={12} /> {t.columns.download}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </th>
  );
}

function Td({ children, mono, title }: { children: React.ReactNode; mono?: boolean; title?: string }) {
  return (
    <td title={title} className={`px-4 py-2.5 align-middle text-slate-800 ${mono ? "font-mono tabular-nums text-xs" : ""}`}>
      {children}
    </td>
  );
}

function StatusBadge({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const styles =
    upper.includes("SIGNED") || upper.includes("COMPLETED")
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : upper.includes("APPROVED")
        ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
        : upper.includes("REFUS") || upper.includes("FAIL")
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles}`}>
      {upper}
    </span>
  );
}
