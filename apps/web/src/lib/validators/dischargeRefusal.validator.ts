export interface ValidationResult {
  valid: boolean;
  missing: string[];
  blockingErrors: string[];
}

export function validateDischargeRefusalGeneration(data: {
  patientName?: string;
  patientIdNumber?: string;
  medicalRecordNumber?: string;
  roomNumber?: string;
  attendingPhysicianName?: string;
  treatingPhysician?: string;
  doctorName?: string;
  dischargeDecisionAt?: string;
  incidentTimestamp?: string;
  eventDate?: string;
  refusalReason?: string;
  discussionSummary?: string;
}): ValidationResult {
  const missing: string[] = [];

  const patientName = data.patientName?.trim();
  const patientIdNumber = data.patientIdNumber?.trim();
  const medicalRecordNumber = data.medicalRecordNumber?.trim();
  const roomNumber = data.roomNumber?.trim();
  const attendingPhysicianName =
    data.attendingPhysicianName?.trim() || data.treatingPhysician?.trim() || data.doctorName?.trim();
  const dischargeDecisionAt =
    data.dischargeDecisionAt?.trim() || data.incidentTimestamp?.trim() || data.eventDate?.trim();
  const refusalReason = data.refusalReason?.trim();
  const discussionSummary = data.discussionSummary?.trim();
  const normalizedPhysician = attendingPhysicianName?.toLowerCase();
  const hasValidPhysician = Boolean(attendingPhysicianName) && !["n/a", "na", "unknown"].includes(normalizedPhysician || "");
  const hasValidDecisionTimestamp =
    Boolean(dischargeDecisionAt) && !Number.isNaN(new Date(dischargeDecisionAt || "").getTime());

  if (!patientName) missing.push("patientName");
  if (!patientIdNumber) missing.push("patientIdNumber");
  if (!medicalRecordNumber) missing.push("medicalRecordNumber");
  if (!roomNumber) missing.push("roomNumber");
  if (!hasValidPhysician) missing.push("attendingPhysicianName");
  if (!hasValidDecisionTimestamp) missing.push("dischargeDecisionAt");
  if (!refusalReason && !discussionSummary) {
    missing.push("refusalReasonOrDiscussionSummary");
  }

  return {
    valid: missing.length === 0,
    missing,
    blockingErrors: missing,
  };
}
