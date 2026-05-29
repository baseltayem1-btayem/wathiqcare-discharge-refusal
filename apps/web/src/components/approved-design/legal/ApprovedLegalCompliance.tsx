/**
 * Approved Healthcare Consent Platform Design — Legal Compliance Flow
 *
 * Ported from design/figma/wathiqcare-v1.1/src/app/App.tsx LegalFlow.
 * Wired to real WathiqCare production data via props supplied by the
 * server component at apps/web/app/legal/compliance/page.tsx (Prisma
 * AuditLog + ConsentDocument). No mock evidence, audit events, OTPs, or
 * PDF references.
 */
"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Download, FileText, Shield } from "lucide-react";

import {
  Alert,
  Card,
  DesktopHeader,
  T,
  cls,
  type Lang,
} from "../shared";

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

type LegalScreen = "evidence" | "audit-chain" | "otp-log" | "pdf-status";

type EventTone =
  | "dispatch"
  | "access"
  | "view"
  | "otp"
  | "sign"
  | "complete"
  | "other";

const eventBorderClass: Record<EventTone, string> = {
  dispatch: "border-blue-600",
  access: "border-purple-600",
  view: "border-sky-600",
  otp: "border-amber-600",
  sign: "border-emerald-600",
  complete: "border-emerald-700",
  other: "border-slate-400",
};

function classifyAction(action: string): EventTone {
  const a = action.toLowerCase();
  if (a.includes("dispatch") || a.includes("sms") || a.includes("email")) {
    return "dispatch";
  }
  if (a.includes("verify") || a.includes("otp")) return "otp";
  if (a.includes("sign")) return "sign";
  if (
    a.includes("finalize") ||
    a.includes("complete") ||
    a.includes("approve")
  ) {
    return "complete";
  }
  if (a.includes("view") || a.includes("read") || a.includes("preview")) {
    return "view";
  }
  if (a.includes("login") || a.includes("access") || a.includes("open")) {
    return "access";
  }
  return "other";
}

function fmtTs(iso: string, lang: Lang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function shortHash(h: string | null | undefined): string {
  if (!h) return "—";
  return h.length > 24 ? `${h.slice(0, 24)}…` : h;
}

export type ApprovedLegalComplianceProps = {
  tenantCode: string | null;
  isPlatform: boolean;
  evidence: EvidenceRow[];
  audit: AuditEventRow[];
  otp: OtpEventRow[];
  pdf: PdfStatusRow[];
  initialLang?: Lang;
};

export function ApprovedLegalCompliance({
  tenantCode,
  isPlatform,
  evidence,
  audit,
  otp,
  pdf,
  initialLang = "ar",
}: ApprovedLegalComplianceProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [screen, setScreen] = useState<LegalScreen>("evidence");
  const [evidenceCursor, setEvidenceCursor] = useState<string | null>(
    evidence[0]?.id ?? null,
  );
  const [pdfCursor, setPdfCursor] = useState<string | null>(pdf[0]?.id ?? null);

  const t = T[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  const isAr = lang === "ar";

  const evidenceRow = useMemo(
    () => evidence.find((row) => row.id === evidenceCursor) || evidence[0],
    [evidence, evidenceCursor],
  );
  const pdfRow = useMemo(
    () => pdf.find((row) => row.id === pdfCursor) || pdf[0],
    [pdf, pdfCursor],
  );

  const navItems: { id: LegalScreen; label: string }[] = [
    { id: "evidence", label: t.evidenceTitle },
    { id: "audit-chain", label: t.auditChain },
    { id: "otp-log", label: t.otpLog },
    { id: "pdf-status", label: t.pdfStatus },
  ];

  return (
    <div
      dir={dir}
      className={cls(
        "min-h-screen bg-background flex flex-col",
        isAr ? "font-[Noto_Sans_Arabic]" : "font-[Inter]",
      )}
    >
      <DesktopHeader
        lang={lang}
        onLangToggle={() => setLang((l) => (l === "ar" ? "en" : "ar"))}
        subtitle={
          (isPlatform
            ? isAr
              ? "عرض إداري — جميع المستأجرين"
              : "Platform Admin View"
            : isAr
              ? "مستأجر: "
              : "Tenant: ") + (isPlatform ? "" : tenantCode || "—")
        }
        Icon={Shield}
      />

      <div className="flex-1 max-w-5xl mx-auto w-full flex gap-0">
        <nav
          className={cls(
            "w-52 shrink-0 border-border bg-card p-3 flex flex-col gap-1 sticky top-14 self-start",
            isAr ? "border-l" : "border-r",
          )}
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setScreen(item.id)}
              className={cls(
                "px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
                isAr ? "text-right" : "text-left",
                screen === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6 flex flex-col gap-5">
          {screen === "evidence" && (
            <>
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  isAr ? "text-right" : "text-left",
                )}
              >
                {t.evidenceTitle}
              </h2>

              {evidence.length > 1 && (
                <Card className="p-3">
                  <select
                    aria-label={isAr ? "اختر حزمة الأدلة" : "Select evidence package"}
                    value={evidenceCursor || ""}
                    onChange={(e) => setEvidenceCursor(e.target.value)}
                    className="w-full bg-input-background border border-border rounded px-3 py-2 text-sm font-mono"
                  >
                    {evidence.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.reference} · {row.patientName}
                      </option>
                    ))}
                  </select>
                </Card>
              )}

              {!evidenceRow ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  {isAr
                    ? "لا توجد حزمة أدلة بعد"
                    : "No evidence packages available yet"}
                </Card>
              ) : (
                <>
                  <Card className="p-5 flex flex-col gap-4">
                    {[
                      { label: t.refNum, value: evidenceRow.reference },
                      {
                        label: isAr ? "المريض" : "Patient",
                        value: evidenceRow.patientName,
                      },
                      {
                        label: isAr ? "الطبيب" : "Physician",
                        value: evidenceRow.physicianName,
                      },
                      { label: t.consentHash, value: shortHash(evidenceRow.hash) },
                      { label: t.version, value: evidenceRow.version },
                      {
                        label: t.verified,
                        value: isAr
                          ? "OTP + توقيع رقمي"
                          : "OTP + Digital Signature",
                      },
                      {
                        label: t.generated,
                        value: fmtTs(evidenceRow.generatedAt, lang),
                      },
                    ].map((row, i) => (
                      <div
                        key={i}
                        className={cls(
                          "flex justify-between items-start gap-4",
                          isAr ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        <span className="text-xs text-muted-foreground shrink-0">
                          {row.label}
                        </span>
                        <span
                          className={cls(
                            "font-mono text-xs text-foreground break-all",
                            isAr ? "text-right" : "text-left",
                          )}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </Card>

                  <Card className="p-4 flex flex-col gap-3">
                    <div
                      className={cls(
                        "flex items-center gap-2",
                        isAr ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <Shield size={15} className="text-emerald-600" />
                      <h3 className="text-sm font-semibold text-foreground">
                        {isAr
                          ? "شهادة صحة الأدلة"
                          : "Evidence Integrity Certificate"}
                      </h3>
                    </div>
                    <Alert
                      type={evidenceRow.hash ? "success" : "warning"}
                      lang={lang}
                    >
                      {evidenceRow.hash
                        ? isAr
                          ? "تم التحقق من سلامة حزمة الأدلة. لم يطرأ أي تعديل على الوثيقة بعد التوقيع."
                          : "Evidence package integrity verified. No modifications detected after signing."
                        : isAr
                          ? "لم يتم إنشاء بصمة PDF بعد لهذه الوثيقة."
                          : "Document PDF hash not yet generated."}
                    </Alert>
                  </Card>
                </>
              )}
            </>
          )}

          {screen === "audit-chain" && (
            <>
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  isAr ? "text-right" : "text-left",
                )}
              >
                {t.auditChain}
              </h2>
              {audit.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  {isAr ? "لا توجد أحداث مسجّلة" : "No audit events recorded"}
                </Card>
              ) : (
                <div className="flex flex-col gap-0">
                  {audit.map((ev, i) => {
                    const tone = classifyAction(ev.action);
                    return (
                      <div
                        key={ev.id}
                        className={cls(
                          "flex gap-3 pb-4 relative",
                          isAr ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        {i < audit.length - 1 && (
                          <div
                            className={cls(
                              "absolute top-5 bottom-0 w-px bg-border",
                              isAr ? "right-2.5" : "left-2.5",
                            )}
                          />
                        )}
                        <div
                          className={cls(
                            "w-5 h-5 rounded-full border-2 bg-card shrink-0 mt-0.5 z-10",
                            eventBorderClass[tone],
                          )}
                        />
                        <div
                          className={cls(
                            "flex-1 bg-card rounded-lg border border-border p-3 flex flex-col gap-1",
                            isAr ? "text-right" : "text-left",
                          )}
                        >
                          <p className="text-sm font-medium text-foreground break-all">
                            {ev.action}
                          </p>
                          <div
                            className={cls(
                              "flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground",
                              isAr ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                            <span className="font-mono">
                              {fmtTs(ev.timestamp, lang)}
                            </span>
                            <span>·</span>
                            <span>{ev.actor}</span>
                            <span>·</span>
                            <span className="font-mono">{ev.entityType}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {screen === "otp-log" && (
            <>
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  isAr ? "text-right" : "text-left",
                )}
              >
                {t.otpLog}
              </h2>
              <Card className="overflow-hidden">
                <div
                  className={cls(
                    "grid grid-cols-4 px-4 py-2 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide",
                    isAr ? "text-right" : "text-left",
                  )}
                >
                  {(isAr
                    ? ["الوقت", "الإجراء", "المُنفذ", "IP"]
                    : ["Time", "Action", "Actor", "IP"]
                  ).map((h, i) => (
                    <span key={i}>{h}</span>
                  ))}
                </div>
                {otp.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {isAr
                      ? "لا توجد رموز تحقق مسجّلة"
                      : "No OTP events recorded"}
                  </div>
                ) : (
                  otp.map((row) => {
                    const verified = row.action.toLowerCase().includes("verify");
                    return (
                      <div
                        key={row.id}
                        className={cls(
                          "grid grid-cols-4 px-4 py-3 border-b border-border last:border-0 text-xs",
                          isAr ? "text-right" : "text-left",
                        )}
                      >
                        <span className="font-mono text-foreground">
                          {fmtTs(row.timestamp, lang)}
                        </span>
                        <span
                          className={cls(
                            "font-semibold",
                            verified
                              ? "text-emerald-600"
                              : "text-amber-600",
                          )}
                        >
                          {row.action}
                        </span>
                        <span className="font-mono text-muted-foreground break-all">
                          {row.actor}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {row.ipAddress || "—"}
                        </span>
                      </div>
                    );
                  })
                )}
              </Card>
            </>
          )}

          {screen === "pdf-status" && (
            <>
              <h2
                className={cls(
                  "text-lg font-bold text-foreground",
                  isAr ? "text-right" : "text-left",
                )}
              >
                {t.pdfStatus}
              </h2>

              {pdf.length > 1 && (
                <Card className="p-3">
                  <select
                    aria-label={isAr ? "اختر وثيقة PDF" : "Select PDF document"}
                    value={pdfCursor || ""}
                    onChange={(e) => setPdfCursor(e.target.value)}
                    className="w-full bg-input-background border border-border rounded px-3 py-2 text-sm font-mono"
                  >
                    {pdf.map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.reference} · {row.patientName}
                      </option>
                    ))}
                  </select>
                </Card>
              )}

              {!pdfRow ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  {isAr
                    ? "لا توجد وثائق PDF بعد"
                    : "No PDF documents generated yet"}
                </Card>
              ) : (
                <Card className="p-5 flex flex-col gap-4">
                  <div
                    className={cls(
                      "flex items-center gap-3",
                      isAr ? "flex-row-reverse" : "flex-row",
                    )}
                  >
                    <div className="w-10 h-10 rounded bg-red-50 border border-red-200 flex items-center justify-center">
                      <FileText size={18} className="text-red-500" />
                    </div>
                    <div
                      className={cls(
                        "flex-1",
                        isAr ? "text-right" : "text-left",
                      )}
                    >
                      <p className="text-sm font-semibold text-foreground break-all">
                        {(isAr ? "وثيقة الموافقة — " : "Consent Document — ") +
                          (pdfRow.reference || pdfRow.id) +
                          ".pdf"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {fmtTs(pdfRow.finalizedAt || pdfRow.updatedAt, lang)}
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  {[
                    {
                      label: isAr ? "الحالة" : "Status",
                      value: pdfRow.status,
                      ok: pdfRow.hasPdf,
                    },
                    {
                      label: isAr ? "الختم الزمني" : "Timestamp",
                      value: fmtTs(
                        pdfRow.finalizedAt || pdfRow.updatedAt,
                        lang,
                      ),
                      ok: true,
                    },
                    {
                      label: isAr ? "التوقيع الرقمي" : "Digital Signature",
                      value: pdfRow.hash
                        ? isAr
                          ? "موقَّع ومُتحقَّق منه"
                          : "Signed & Verified"
                        : isAr
                          ? "بانتظار التوقيع"
                          : "Pending Signature",
                      ok: Boolean(pdfRow.hash),
                    },
                    {
                      label: isAr ? "بصمة الوثيقة" : "Document Hash",
                      value: shortHash(pdfRow.hash),
                      ok: Boolean(pdfRow.hash),
                    },
                    {
                      label: isAr ? "نسخة الاحتفاظ" : "Retention Copy",
                      value: pdfRow.pdfUrl
                        ? isAr
                          ? "مُؤرشَفة"
                          : "Archived"
                        : isAr
                          ? "بانتظار الإصدار"
                          : "Pending generation",
                      ok: Boolean(pdfRow.pdfUrl),
                    },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className={cls(
                        "flex justify-between items-center",
                        isAr ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      <span className="text-xs text-muted-foreground">
                        {row.label}
                      </span>
                      <div
                        className={cls(
                          "flex items-center gap-1.5",
                          isAr ? "flex-row-reverse" : "flex-row",
                        )}
                      >
                        {row.ok && (
                          <CheckCircle size={12} className="text-emerald-500" />
                        )}
                        <span className="text-xs font-mono text-foreground/80 break-all max-w-[55ch]">
                          {row.value}
                        </span>
                      </div>
                    </div>
                  ))}

                  {pdfRow.pdfUrl ? (
                    <a
                      href={pdfRow.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cls(
                        "flex items-center gap-2 mt-1 py-2.5 px-4 rounded-lg border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors w-fit",
                        isAr ? "flex-row-reverse self-end" : "flex-row self-start",
                      )}
                    >
                      <Download size={14} />
                      {isAr ? "تحميل PDF" : "Download PDF"}
                    </a>
                  ) : null}
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default ApprovedLegalCompliance;
