/**
 * Candidate registry.
 *
 * Stores calibration candidates and their mappings. This abstraction lets us
 * test in-memory and swap to Prisma in production.
 */

import type { CandidateFieldMapping } from "../geometry/candidate-rectangle-generator";
import type { CalibrationQualityReport } from "../mapping/mapping-schema";
import type { CandidateConfidence } from "../confidence/confidence-aggregation";

export type CalibrationCandidate = {
  id: string;
  sourceFormId: string;
  sourceFileName: string;
  status: "pending" | "auto_review_candidate" | "assisted_review" | "manual_calibration_required" | "approved" | "rejected";
  mappings: CandidateFieldMapping[];
  qualityReport: CalibrationQualityReport;
  confidence?: CandidateConfidence;
  syntheticRenderUrl?: string;
  reviewDecision?: "APPROVE" | "REJECT" | "REQUEST_MANUAL";
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
};

export interface CandidateRegistry {
  create(candidate: Omit<CalibrationCandidate, "id" | "createdAt" | "updatedAt">): Promise<CalibrationCandidate>;
  update(id: string, patch: Partial<CalibrationCandidate>): Promise<CalibrationCandidate | null>;
  get(id: string): Promise<CalibrationCandidate | null>;
  listByStatus(status?: CalibrationCandidate["status"]): Promise<CalibrationCandidate[]>;
}

export class InMemoryCandidateRegistry implements CandidateRegistry {
  private store = new Map<string, CalibrationCandidate>();

  async create(
    candidate: Omit<CalibrationCandidate, "id" | "createdAt" | "updatedAt">,
  ): Promise<CalibrationCandidate> {
    const now = new Date();
    const created: CalibrationCandidate = {
      ...candidate,
      id: crypto.randomUUID?.() ?? `c-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    this.store.set(created.id, created);
    return created;
  }

  async update(
    id: string,
    patch: Partial<CalibrationCandidate>,
  ): Promise<CalibrationCandidate | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    this.store.set(id, updated);
    return updated;
  }

  async get(id: string): Promise<CalibrationCandidate | null> {
    return this.store.get(id) ?? null;
  }

  async listByStatus(status?: CalibrationCandidate["status"]): Promise<CalibrationCandidate[]> {
    const all = Array.from(this.store.values());
    return status ? all.filter((c) => c.status === status) : all;
  }
}
