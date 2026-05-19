export interface EvidenceIndexRecord {
  auditId: string | null;
  documentType: string;
  evidenceId: string;
  generatedDate: string;
  patientMrn: string;
  signer: string;
}

export interface EvidenceIndexQuery {
  auditId?: string | null;
  documentType?: string | null;
  evidenceId?: string | null;
  generatedDate?: string | null;
  patientMrn?: string | null;
  signer?: string | null;
}

const evidenceIndex = new Map<string, EvidenceIndexRecord>();

export function indexEvidenceRecord(record: EvidenceIndexRecord): EvidenceIndexRecord {
  evidenceIndex.set(record.evidenceId, record);
  return record;
}

export function resolveEvidenceIndex(query: EvidenceIndexQuery): EvidenceIndexRecord[] {
  return Array.from(evidenceIndex.values())
    .filter((record) => {
      if (query.evidenceId && record.evidenceId !== query.evidenceId) return false;
      if (query.patientMrn && record.patientMrn !== query.patientMrn) return false;
      if (query.documentType && record.documentType !== query.documentType) return false;
      if (query.generatedDate && !record.generatedDate.startsWith(query.generatedDate)) return false;
      if (query.signer && record.signer !== query.signer) return false;
      if (query.auditId && record.auditId !== query.auditId) return false;
      return true;
    })
    .sort((left, right) => left.generatedDate.localeCompare(right.generatedDate) || left.evidenceId.localeCompare(right.evidenceId));
}