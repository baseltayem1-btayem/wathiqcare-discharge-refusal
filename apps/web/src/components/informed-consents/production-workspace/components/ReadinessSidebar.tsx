"use client";

import { CheckCircle2, Circle, AlertCircle, Send } from "lucide-react";
import { Alert, Button, Card, CardContent, CardHeader, CardTitle, Progress, Stack } from "@/components/design-system";
import type { MockClinicalKnowledgeAssembly } from "../types/workspace";

interface ReadinessSidebarProps {
  patientReady: boolean;
  encounterReady: boolean;
  procedureReady: boolean;
  assemblyReady: boolean;
  blockersResolved: boolean;
  draftApproved: boolean;
  sendReady: boolean;
  progressPercentage: number;
  blockers: MockClinicalKnowledgeAssembly["blockers"];
  onJump: (target: string) => void;
}

function CheckItem({
  done,
  label,
  target,
  onJump,
}: {
  done: boolean;
  label: string;
  target: string;
  onJump: (target: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      uppercase={false}
      onClick={() => onJump(target)}
      className="h-auto w-full justify-start px-3 py-2 text-left hover:bg-[var(--wc-surface-2)]"
    >
      {done ? (
        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
      ) : (
        <Circle className="w-5 h-5 text-[var(--wc-text-light)] shrink-0" />
      )}
      <span className={`text-sm ${done ? "text-[var(--wc-text)]" : "text-[var(--wc-text-muted)]"}`}>{label}</span>
    </Button>
  );
}

export function ReadinessSidebar({
  patientReady,
  encounterReady,
  procedureReady,
  assemblyReady,
  blockersResolved,
  draftApproved,
  sendReady,
  progressPercentage,
  blockers,
  onJump,
}: ReadinessSidebarProps) {
  return (
    <Card variant="default" className="overflow-hidden">
      <CardHeader className="workspace-card-header">
        <CardTitle className="workspace-section-title">Case Readiness</CardTitle>
      </CardHeader>
      <CardContent className="p-5 space-y-5">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-[var(--wc-text-muted)]">Completion</span>
            <span className="text-[var(--wc-navy)]">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Checklist */}
        <div className="space-y-1">
          <CheckItem done={patientReady} label="Patient selected" target="patient" onJump={onJump} />
          <CheckItem done={encounterReady} label="Encounter selected" target="patient" onJump={onJump} />
          <CheckItem done={procedureReady} label="Procedure confirmed" target="procedure" onJump={onJump} />
          <CheckItem
            done={assemblyReady && blockersResolved}
            label="Knowledge package ready"
            target="package"
            onJump={onJump}
          />
          <CheckItem done={draftApproved} label="Draft approved" target="package" onJump={onJump} />
        </div>

        {/* Blockers */}
        {blockers.length > 0 && (
          <Alert variant="error" icon={<AlertCircle className="w-4 h-4" />}>
            <div className="font-semibold text-sm mb-1">Blockers</div>
            <ul className="space-y-1">
              {blockers.map((b) => (
                <li key={b.key} className="text-xs">
                  • {b.messageEn}
                </li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Send status */}
        <Alert variant={sendReady ? "success" : "info"} icon={<Send className="w-4 h-4" />}>
          <span className="font-semibold">{sendReady ? "Ready to send" : "Send locked until ready"}</span>
        </Alert>
      </CardContent>
    </Card>
  );
}
