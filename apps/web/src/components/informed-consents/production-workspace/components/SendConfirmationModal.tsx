"use client";

import { Send, ShieldCheck, Smartphone } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/design-system";
import type { Patient, Encounter, Procedure, MockClinicalKnowledgeAssembly } from "../types/workspace";

interface SendConfirmationModalProps {
  open: boolean;
  patient?: Patient;
  encounter?: Encounter;
  procedure?: Procedure;
  assembly?: MockClinicalKnowledgeAssembly;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SendConfirmationModal({
  open,
  patient,
  encounter,
  procedure,
  assembly,
  onConfirm,
  onCancel,
}: SendConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Send consent to patient
          </DialogTitle>
          <DialogDescription>
            You are about to dispatch the informed consent to the patient&apos;s secure signing session.
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
            <span className="font-semibold text-[var(--wc-text)]">{patient?.mobileNumber}</span>
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
          <Button variant="success" size="sm" uppercase={false} onClick={onConfirm}>
            <Smartphone className="w-4 h-4" /> Confirm send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
