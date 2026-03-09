"use client";

type RoiDraft = {
  requesterName: string;
  requesterRelationship: string;
  purpose: string;
  documentsRequested: string;
  dateRange: string;
  identityVerificationMethod: string;
  authorizedRecipient: string;
  minimumNecessaryConfirmed: boolean;
};

type RoidRequestFormProps = {
  value: RoiDraft;
  onChange: (next: RoiDraft) => void;
};

export default function RoidRequestForm({ value, onChange }: RoidRequestFormProps) {
  function setField<K extends keyof RoiDraft>(key: K, nextValue: RoiDraft[K]) {
    onChange({ ...value, [key]: nextValue });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">Release of Information Request</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Requester Name" value={value.requesterName} onChange={(e) => setField("requesterName", e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Relationship" value={value.requesterRelationship} onChange={(e) => setField("requesterRelationship", e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Purpose" value={value.purpose} onChange={(e) => setField("purpose", e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Requested Records" value={value.documentsRequested} onChange={(e) => setField("documentsRequested", e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Date Range" value={value.dateRange} onChange={(e) => setField("dateRange", e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Authorized Recipient" value={value.authorizedRecipient} onChange={(e) => setField("authorizedRecipient", e.target.value)} />
        <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={value.identityVerificationMethod} onChange={(e) => setField("identityVerificationMethod", e.target.value)}>
          <option value="sms_otp">SMS OTP</option>
          <option value="nafath">Nafath</option>
          <option value="manual">Manual</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={value.minimumNecessaryConfirmed} onChange={(e) => setField("minimumNecessaryConfirmed", e.target.checked)} />
          Minimum Necessary Confirmed
        </label>
      </div>
    </section>
  );
}
