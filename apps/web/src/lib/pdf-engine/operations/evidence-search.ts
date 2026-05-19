import { determineRetentionClass } from "@/lib/pdf-engine/persistence/retention-policy";
import { listArchivedEvidence, type ArchivedEvidenceRecord } from "@/lib/pdf-engine/persistence/evidence-archive";

export interface EvidenceSearchQuery {
  auditId?: string | null;
  documentType?: string | null;
  evidenceId?: string | null;
  generatedDate?: string | null;
  patientMrn?: string | null;
  retentionClass?: string | null;
  signer?: string | null;
}

export interface EvidenceSearchResult {
  auditId: string | null;
  documentType: string;
  evidenceId: string;
  generatedDate: string;
  patientMrn: string;
  retentionClass: string;
  signer: string;
}

function mapArchivedEvidenceToSearchResult(record: ArchivedEvidenceRecord): EvidenceSearchResult {
  return {
    auditId: record.legalEvidencePackage.metadata.auditId,
    documentType: record.legalEvidencePackage.metadata.sourceModule,
    evidenceId: record.evidenceId,
    generatedDate: record.legalEvidencePackage.metadata.generatedAt,
    patientMrn: record.legalEvidencePackage.signerDetails.signerReference,
    retentionClass: determineRetentionClass({ moduleKey: record.legalEvidencePackage.metadata.sourceModule }),
    signer:
      record.legalEvidencePackage.signerDetails.signerName || record.legalEvidencePackage.signerDetails.signerReference,
  };
}

export function searchEvidence(
  query: EvidenceSearchQuery,
  records: ArchivedEvidenceRecord[] = listArchivedEvidence(),
): EvidenceSearchResult[] {
  return records
    .map(mapArchivedEvidenceToSearchResult)
    .filter((record) => {
      if (query.evidenceId && record.evidenceId !== query.evidenceId) return false;
      if (query.patientMrn && record.patientMrn !== query.patientMrn) return false;
      if (query.documentType && record.documentType !== query.documentType) return false;
      if (query.signer && record.signer !== query.signer) return false;
      if (query.auditId && record.auditId !== query.auditId) return false;
      if (query.retentionClass && record.retentionClass !== query.retentionClass) return false;
      if (query.generatedDate && !record.generatedDate.startsWith(query.generatedDate)) return false;
      return true;
    })
    .sort((left, right) => left.generatedDate.localeCompare(right.generatedDate) || left.evidenceId.localeCompare(right.evidenceId));
}