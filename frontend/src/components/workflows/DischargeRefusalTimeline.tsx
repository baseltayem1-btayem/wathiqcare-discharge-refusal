"use client";

import WorkflowTimelinePanel from "@/components/workflow/WorkflowTimelinePanel";
import type { DischargeWorkflow } from "@/types/dischargeWorkflow";

type DischargeRefusalTimelineProps = {
  workflow: DischargeWorkflow | null;
};

export default function DischargeRefusalTimeline({ workflow }: DischargeRefusalTimelineProps) {
  return <WorkflowTimelinePanel workflow={workflow} />;
}
