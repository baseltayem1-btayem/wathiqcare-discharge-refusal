"use client";

import { useEffect, useState } from "react";

type Candidate = {
  id: string;
  sourceFormId: string;
  sourceFileName: string;
  status: string;
  qualityScore: number;
  createdAt: string;
};

export default function FormCalibrationReviewConsole() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  async function loadCandidates() {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter
        ? `/api/admin/form-calibration/candidates?status=${statusFilter}`
        : "/api/admin/form-calibration/candidates";
      const res = await fetch(url);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed to load candidates");
      setCandidates(json.candidates ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidates();
  }, [statusFilter]);

  async function review(id: string, decision: "APPROVE" | "REJECT" | "REQUEST_MANUAL") {
    const res = await fetch(`/api/admin/form-calibration/candidates/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const json = await res.json();
    if (!json.ok) {
      alert(json.error ?? "Review failed");
      return;
    }
    loadCandidates();
  }

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Form Auto-Calibration Review</h1>

      <div className="mb-4 flex gap-4 items-center">
        <label className="text-sm font-medium">Filter by status</label>
        <select
          className="border rounded px-2 py-1"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="AUTO_REVIEW_CANDIDATE">Auto Review Candidate</option>
          <option value="ASSISTED_REVIEW">Assisted Review</option>
          <option value="MANUAL_CALIBRATION_REQUIRED">Manual Required</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <table className="w-full text-left border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Form ID</th>
              <th className="border p-2">File</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Quality Score</th>
              <th className="border p-2">Created</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="border p-2">{c.sourceFormId}</td>
                <td className="border p-2">{c.sourceFileName}</td>
                <td className="border p-2">{c.status}</td>
                <td className="border p-2">{c.qualityScore}</td>
                <td className="border p-2">{new Date(c.createdAt).toLocaleString()}</td>
                <td className="border p-2 space-x-2">
                  <button
                    className="px-2 py-1 bg-green-600 text-white rounded"
                    onClick={() => review(c.id, "APPROVE")}
                  >
                    Approve
                  </button>
                  <button
                    className="px-2 py-1 bg-yellow-600 text-white rounded"
                    onClick={() => review(c.id, "REQUEST_MANUAL")}
                  >
                    Manual
                  </button>
                  <button
                    className="px-2 py-1 bg-red-600 text-white rounded"
                    onClick={() => review(c.id, "REJECT")}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
