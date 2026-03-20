"use client";

type CaseMetaCardProps = {
  patientName?: string | null;
  patientMrn?: string | null;
  status?: string | null;
  roomNumber?: string | null;
  attendingPhysician?: string | null;
};

export default function CaseMetaCard({
  patientName,
  patientMrn,
  status,
  roomNumber,
  attendingPhysician,
}: CaseMetaCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Case Metadata</h3>
      <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div>
          <dt className="text-slate-500">Patient</dt>
          <dd className="font-medium text-slate-900">{patientName || "-"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">MRN</dt>
          <dd className="font-medium text-slate-900">{patientMrn || "-"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd className="font-medium text-slate-900">{status || "-"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Room</dt>
          <dd className="font-medium text-slate-900">{roomNumber || "-"}</dd>
        </div>
        <div className="md:col-span-2">
          <dt className="text-slate-500">Attending Physician</dt>
          <dd className="font-medium text-slate-900">{attendingPhysician || "-"}</dd>
        </div>
      </dl>
    </section>
  );
}
