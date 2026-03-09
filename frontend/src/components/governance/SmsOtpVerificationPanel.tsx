type SmsOtpVerificationPanelProps = {
  phone?: string | null;
  onSend: () => void;
  onVerify: () => void;
  code: string;
  setCode: (value: string) => void;
};

export default function SmsOtpVerificationPanel({
  phone,
  onSend,
  onVerify,
  code,
  setCode,
}: SmsOtpVerificationPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">SMS OTP Verification</h3>
      <p className="mt-2 text-sm text-slate-600">Mobile: {phone ?? "not provided"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onSend} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white">Send OTP</button>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Enter OTP"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={onVerify} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700">Verify</button>
      </div>
    </section>
  );
}
