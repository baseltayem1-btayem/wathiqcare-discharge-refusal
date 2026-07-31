"use client";

import { Send, ShieldCheck, Smartphone, AlertTriangle } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/design-system";
import type { ProductionPatient, ProductionEncounter, ClinicalKnowledgeAssembly } from "../types";

interface ProcedureSummary {
  nameEn?: string;
}

interface SendConfirmationModalProps {
  open: boolean;
  patient?: ProductionPatient;
  encounter?: ProductionEncounter;
  procedure?: ProcedureSummary;
  assembly?: ClinicalKnowledgeAssembly;
  recipientMobile?: string;
  recipientEmail?: string;
  allowlisted?: boolean;
  pilotEnabled?: boolean;
  eligibilityReason?: string;
  onConfirm: () => void;
  onDryRun?: () => void;
  onCancel: () => void;
  allowRealSend?: boolean;
}

export function SendConfirmationModal({
  open,
  patient,
  encounter,
  procedure,
  assembly,
  recipientMobile,
  recipientEmail,
  allowlisted,
  pilotEnabled,
  eligibilityReason,
  onConfirm,
  onDryRun,
  onCancel,
  allowRealSend = false,
}: SendConfirmationModalProps) {
  const normalizedMobile = (recipientMobile || patient?.mobileNumber || "").replace(/[\s\-()]/g, "");
  const email = recipientEmail || patient?.email || "";
  const canSendReal = allowRealSend && allowlisted;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Send consent to patient
          </DialogTitle>
          <DialogDescription>
            {canSendReal
              ? "You are about to dispatch the informed consent to the patient\'s secure signing session."
              : "IMC Physician Pilot: only dry-run validation is permitted. No real SMS or email will be sent."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-surface-2)] text-sm space-y-1">
          <div>
            <span className="text-[var(--wc-text-muted)]">Patient:</span>{" "}
            <span className="font-semibold text-[var(--wc-text)]">{patient?.name}</span>
          </div>
          <div>
            <span className="text-[var(--wc-text-muted)]">Procedure:</span>{" "}
            <span className="font-semibold text-[var(--wc-text)]">{procedure?.nameEn}</span>
          </div>
          <div>
            <span className="text-[var(--wc-text-muted)]">Mobile:</span>{" "}
            <span className="font-semibold text-[var(--wc-text)]">{normalizedMobile || "â€”"}</span>
          </div>
          <div>
            <span className="text-[var(--wc-text-muted)]">Email:</span>{" "}
            <span className="font-semibold text-[var(--wc-text)]">{email || "â€”"}</span>
          </div>
          <div>
            <span className="text-[var(--wc-text-muted)]">Encounter:</span>{" "}
            <span className="font-semibold text-[var(--wc-text)]">{encounter?.encounterId}</span>
          </div>
          <div>
            <span className="text-[var(--wc-text-muted)]">Required participants:</span>{" "}
            <span className="font-semibold text-[var(--wc-text)]">
              {assembly?.requiredParticipants.join(", ") || "None"}
            </span>
          </div>
        </div>

        {!allowlisted && (
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 p-2 rounded-lg">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Recipient is not on the pilot allowlist. {eligibilityReason}
              {!pilotEnabled && " Pilot sending is disabled for this tenant."}
            </span>
          </div>
        )}

        <div className="flex items-start gap-2 text-xs text-[var(--wc-text-muted)]">
          <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            This action is recorded in the audit trail. The patient will receive a secure link; OTP and signature
            flows are handled by the existing production pipeline.
          </span>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" uppercase={false} onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="brand" size="sm" uppercase={false} onClick={onConfirm}>
            <Smartphone className="w-4 h-4" /> Confirm send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



