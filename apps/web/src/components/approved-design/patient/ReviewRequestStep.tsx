"use client";

import { Building2, ChevronRight, FileText, Stethoscope } from "lucide-react";
import { Alert, Card, cls, PatientIdentityCard, type Lang } from "../shared";

export function ReviewRequestStep({
  lang,
  facilityName,
  procedureTitle,
  physicianName,
  patientName,
  patientMrn,
  consentRef,
  versionLabel,
  onProceed,
}: {
  lang: Lang;
  facilityName: string;
  procedureTitle: string;
  physicianName: string;
  patientName: string;
  patientMrn: string;
  consentRef: string;
  versionLabel: string;
  onProceed: () => void;
}) {
  const isAr = lang === "ar";

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cls(
          "flex flex-col gap-1",
          isAr ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-1">
          <FileText size={22} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-foreground leading-tight">
          {isAr ? "وصل إليك طلب موافقة طبية" : "You have a medical consent request"}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isAr
            ? "أرسل الفريق الطبي طلب موافقة على إجراء طبي. يُرجى مراجعة المعلومات بعناية قبل اتخاذ قرارك."
            : "Your medical team has sent a consent request for a procedure. Please review the information carefully before deciding."}
        </p>
      </div>

      <PatientIdentityCard lang={lang} name={patientName} mrn={patientMrn} />

      <Card className="p-4 flex flex-col gap-3">
        <div
          className={cls(
            "flex flex-col gap-1",
            isAr ? "text-right" : "text-left",
          )}
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {isAr ? "نوع الموافقة" : "Consent Type"}
          </p>
          <p className="text-sm font-semibold text-foreground leading-snug">
            {procedureTitle}
          </p>
          {versionLabel ? (
            <p className="text-[10px] font-mono text-muted-foreground">
              {versionLabel}
            </p>
          ) : null}
        </div>
        <div className="h-px bg-border" />
        {physicianName ? (
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <Stethoscope size={14} className="text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">{physicianName}</p>
          </div>
        ) : null}
        <div
          className={cls(
            "flex items-center gap-2",
            isAr ? "flex-row-reverse" : "flex-row",
          )}
        >
          <Building2 size={14} className="text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">{facilityName}</p>
        </div>
        {consentRef ? (
          <div
            className={cls(
              "flex items-center gap-2",
              isAr ? "flex-row-reverse" : "flex-row",
            )}
          >
            <span className="text-xs text-muted-foreground">
              {isAr ? "الرقم المرجعي:" : "Reference:"}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground break-all">
              {consentRef}
            </span>
          </div>
        ) : null}
      </Card>

      <Alert type="info" lang={lang}>
        {isAr
          ? "هذا الطلب صادر رسمياً من الفريق الطبي. لا يُطلب منك أي دفع."
          : "This request is officially issued by your medical team. No payment is required."}
      </Alert>

      <button
        type="button"
        onClick={onProceed}
        className={cls(
          "w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors active:scale-[0.99]",
          isAr ? "flex-row-reverse" : "flex-row",
        )}
      >
        {isAr ? "مراجعة الموافقة" : "Review Consent"}
        <ChevronRight size={16} className={isAr ? "rotate-180" : ""} />
      </button>
    </div>
  );
}
