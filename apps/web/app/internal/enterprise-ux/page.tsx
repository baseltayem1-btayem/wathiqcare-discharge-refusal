"use client";

import {
  EnterpriseShell,
  EnterpriseSidebar,
  EnterpriseHeader,
  EnterpriseRibbon,
  EnterpriseCard,
  EnterpriseStatusPill,
} from "@/components/enterprise";
import { EvidencePanel } from "@/components/evidence";
import type { EvidencePanelData } from "@/components/evidence/types";
import { useState } from "react";

const SIDEBAR_SECTIONS = [
  {
    id: "clinical",
    label: "Clinical Workflows",
    items: [
      { id: "consents", label: "Informed Consents", badge: 12, active: true },
      { id: "discharge", label: "Discharge Refusals", badge: 3 },
      { id: "handovers", label: "Handover Notes" },
      { id: "incidents", label: "Incident Reports" },
    ],
  },
  {
    id: "legal",
    label: "Legal Evidence",
    items: [
      { id: "evidence", label: "Evidence Bundles", badge: 8 },
      { id: "audit", label: "Audit Trail" },
      { id: "seals", label: "Legal Seals" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      { id: "monitoring", label: "OTP & Renderer Health", badge: "!" },
      { id: "users", label: "Users & Roles" },
      { id: "templates", label: "Consent Templates" },
    ],
  },
];

const MOCK_EVIDENCE: EvidencePanelData = {
  signers: [
    {
      role: "patient",
      displayName: "Ahmed Al-Mansour",
      signedAt: "2025-01-18 14:32:11",
      method: "combined-tablet-and-otp",
      acknowledged: true,
      signatureHash: "9f3c1a44a87b6e2f9d0c",
      deviceLabel: "Wacom STU-540",
    },
    {
      role: "physician",
      displayName: "Dr. Khalid Al-Ruwaili",
      signedAt: "2025-01-18 14:34:02",
      method: "biometric-fingerprint",
      acknowledged: true,
      signatureHash: "1bb22ce7710a8f99113d",
      deviceLabel: "DigitalPersona U.4500",
    },
    {
      role: "witness",
      displayName: "Sara Al-Otaibi (RN)",
      method: "otp",
    },
  ],
  otp: [
    {
      id: "otp-1",
      timestamp: "2025-01-18 14:30:02",
      channel: "sms",
      destinationMasked: "+9665••••4421",
      status: "sent",
      ip: "10.12.3.4",
    },
    {
      id: "otp-2",
      timestamp: "2025-01-18 14:30:18",
      channel: "sms",
      destinationMasked: "+9665••••4421",
      status: "delivered",
    },
    {
      id: "otp-3",
      timestamp: "2025-01-18 14:31:44",
      channel: "sms",
      destinationMasked: "+9665••••4421",
      status: "verified",
      ip: "10.12.3.4",
    },
    {
      id: "otp-4",
      timestamp: "2025-01-18 14:28:11",
      channel: "sms",
      destinationMasked: "+9665••••4421",
      status: "failed",
      failureReason: "Mistyped code",
    },
  ],
  audit: [
    {
      id: "a1",
      timestamp: "2025-01-18 14:27:00",
      actor: "Dr. K. Al-Ruwaili",
      action: "Consent draft created",
      detail: "Template: Cardiac Catheterization v3",
      severity: "info",
    },
    {
      id: "a2",
      timestamp: "2025-01-18 14:29:32",
      actor: "Patient (tablet)",
      action: "Acknowledged risks & alternatives",
      severity: "info",
    },
    {
      id: "a3",
      timestamp: "2025-01-18 14:32:11",
      actor: "Patient",
      action: "Signature captured",
      detail: "Method: tablet + OTP",
      severity: "info",
    },
    {
      id: "a4",
      timestamp: "2025-01-18 14:34:02",
      actor: "Dr. K. Al-Ruwaili",
      action: "Physician signature captured",
      severity: "info",
    },
    {
      id: "a5",
      timestamp: "2025-01-18 14:34:05",
      actor: "system",
      action: "Witness signature pending",
      severity: "warn",
    },
  ],
  qr: {
    verificationUrl: "https://wathiqcare.online/verify/EVB-2025-0118-A7F3",
    documentHash: "sha256:9f3c1a44a87b6e2f9d0c1bb22ce7710a8f99113d",
    shortCode: "A7F3-2K9P",
  },
  forensic: {
    capturedAt: "2025-01-18T14:32:11+03:00",
    ip: "10.12.3.4",
    userAgent: "Mozilla/5.0 (iPad; tablet) WathiqCareKiosk/1.4",
    geo: { latitude: 24.7136, longitude: 46.6753, accuracyM: 12 },
    signatureManifestHash: "sha256:1bb22ce7710a8f99113dffe1...",
    pdfBinaryHash: "sha256:7c0d4a91b25e8f3c4d1e...",
    evidenceBundleId: "EVB-2025-0118-A7F3",
    legalSealReference: "MOH-SEAL-2025-018-44219",
  },
};

export default function EnterpriseUxDemoPage() {
  const [direction, setDirection] = useState<"ltr" | "rtl">("ltr");

  const isAr = direction === "rtl";
  const brand = isAr
    ? { primary: "وثيق كير", secondary: "العيادة المنزلية الإلكترونية" }
    : { primary: "WathiqCare", secondary: "Enterprise Clinical Workflow" };

  return (
    <EnterpriseShell
      direction={direction}
      sidebar={
        <EnterpriseSidebar
          brand={brand}
          sections={SIDEBAR_SECTIONS}
          footer={
            <div className="text-[10px]" style={{ color: "var(--wc-ent-fg-on-dark-muted)" }}>
              {isAr ? "نسخة المعاينة 12.1" : "Phase 12.1 preview"}
            </div>
          }
        />
      }
      header={
        <EnterpriseHeader
          title={isAr ? "موافقة مستنيرة" : "Informed Consent"}
          subtitle={
            isAr
              ? "نموذج: قسطرة قلبية — الإصدار 3"
              : "Template: Cardiac Catheterization v3"
          }
          patient={{
            name: isAr ? "أحمد المنصور" : "Ahmed Al-Mansour",
            mrn: "MRN-44219",
            nationalId: "1099887766",
            department: isAr ? "قسم القلب" : "Cardiology",
          }}
          actions={
            <>
              <EnterpriseStatusPill
                status="warn"
                label={isAr ? "بانتظار الشاهد" : "Witness pending"}
              />
              <button
                type="button"
                onClick={() => setDirection(direction === "ltr" ? "rtl" : "ltr")}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: "var(--wc-ent-surface-ribbon-border)" }}
                data-testid="enterprise-ux-toggle-direction"
              >
                {direction === "ltr" ? "Switch to AR / RTL" : "Switch to EN / LTR"}
              </button>
            </>
          }
        />
      }
      ribbon={
        <EnterpriseRibbon
          groups={[
            {
              id: "consent",
              label: isAr ? "الموافقة" : "Consent",
              actions: [
                { id: "open", label: isAr ? "فتح" : "Open", variant: "primary" },
                { id: "review", label: isAr ? "مراجعة" : "Review", variant: "secondary" },
                { id: "send", label: isAr ? "إرسال OTP" : "Send OTP", variant: "secondary" },
              ],
            },
            {
              id: "signing",
              label: isAr ? "التوقيع" : "Signing",
              actions: [
                { id: "tablet", label: isAr ? "لوح التوقيع" : "Tablet", variant: "secondary" },
                { id: "bio", label: isAr ? "بصمة" : "Biometric", variant: "secondary" },
                { id: "witness", label: isAr ? "شاهد" : "Witness", variant: "secondary" },
              ],
            },
            {
              id: "evidence",
              label: isAr ? "الأدلة" : "Evidence",
              actions: [
                { id: "seal", label: isAr ? "ختم قانوني" : "Seal", variant: "primary" },
                { id: "pdf", label: isAr ? "تنزيل PDF" : "Download PDF", variant: "secondary" },
                { id: "revoke", label: isAr ? "إلغاء" : "Revoke", variant: "danger" },
              ],
            },
          ]}
          trailing={
            <span className="text-[11px]" style={{ color: "var(--wc-ent-fg-muted)" }}>
              {isAr ? "آخر تحديث منذ 1 د" : "Updated 1 min ago"}
            </span>
          }
        />
      }
    >
      <div className="grid gap-3" data-testid="enterprise-ux-main">
        <EnterpriseCard
          header={{
            title: isAr ? "ملخص الحالة" : "Case Summary",
            subtitle: isAr
              ? "نظرة عامة على الإجراء والمخاطر والبدائل"
              : "Procedure, risks, alternatives at a glance",
            status: { label: isAr ? "نشط" : "Active", tone: "info" },
          }}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div
                className="text-[10px] uppercase tracking-wide"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {isAr ? "الإجراء" : "Procedure"}
              </div>
              <div className="text-sm font-medium">
                {isAr ? "قسطرة قلبية تشخيصية" : "Diagnostic cardiac catheterization"}
              </div>
            </div>
            <div>
              <div
                className="text-[10px] uppercase tracking-wide"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {isAr ? "الطبيب" : "Physician"}
              </div>
              <div className="text-sm font-medium">
                Dr. Khalid Al-Ruwaili · SCFHS-552119
              </div>
            </div>
            <div>
              <div
                className="text-[10px] uppercase tracking-wide"
                style={{ color: "var(--wc-ent-fg-muted)" }}
              >
                {isAr ? "موعد الإجراء" : "Scheduled"}
              </div>
              <div className="text-sm font-medium">2025-01-19 09:00</div>
            </div>
          </div>
        </EnterpriseCard>

        <EvidencePanel data={MOCK_EVIDENCE} />
      </div>
    </EnterpriseShell>
  );
}
