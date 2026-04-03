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
  dischargeDecisionAt?: string;
  refusalReason?: string;
  discussionSummary?: string;
}): ValidationResult {
  const missing: string[] = [];

  const patientName = data.patientName?.trim();
  const patientIdNumber = data.patientIdNumber?.trim();
  const medicalRecordNumber = data.medicalRecordNumber?.trim();
  const roomNumber = data.roomNumber?.trim();
  const attendingPhysicianName = data.attendingPhysicianName?.trim();
  const dischargeDecisionAt = data.dischargeDecisionAt?.trim();
  const refusalReason = data.refusalReason?.trim();
  const discussionSummary = data.discussionSummary?.trim();

  if (!patientName) missing.push("patientName");
  if (!patientIdNumber) missing.push("patientIdNumber");
  if (!medicalRecordNumber) missing.push("medicalRecordNumber");
  if (!roomNumber) missing.push("roomNumber");
  if (!attendingPhysicianName) missing.push("attendingPhysicianName");
  if (!dischargeDecisionAt) missing.push("dischargeDecisionAt");
  if (!refusalReason && !discussionSummary) {
    missing.push("refusalReasonOrDiscussionSummary");
  }

  return {
    valid: missing.length === 0,
    missing,
    blockingErrors: missing,
  };
}
