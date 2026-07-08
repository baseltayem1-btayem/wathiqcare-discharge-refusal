"use client";

import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Alert, Button, Stack } from "@/components/design-system";
import type { PatientAlert } from "../../types/workspace";

interface PatientAlertCardProps {
  alert: PatientAlert;
  acknowledged: boolean;
  onAcknowledge: () => void;
}

export function PatientAlertCard({ alert, acknowledged, onAcknowledge }: PatientAlertCardProps) {
  const Icon = alert.severity === "critical" ? AlertTriangle : alert.severity === "warning" ? AlertCircle : Info;
  const variant = alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warning" : "info";

  return (
    <Alert variant={variant} icon={<Icon className="w-5 h-5 mt-0.5 shrink-0" />}>
      <Stack direction="row" align="start" justify="between" gap={3} className="w-full">
        <div className="flex-1">
          <div className="font-semibold text-sm">{alert.messageEn}</div>
          <div className="text-xs opacity-80 mt-0.5">{alert.messageAr}</div>
          <div className="text-[10px] uppercase tracking-wider font-bold opacity-70 mt-2">{alert.source}</div>
        </div>
        {!acknowledged ? (
          <Button variant="outline" size="sm" uppercase={false} onClick={onAcknowledge}>
            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledge
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
          </span>
        )}
      </Stack>
    </Alert>
  );
}
