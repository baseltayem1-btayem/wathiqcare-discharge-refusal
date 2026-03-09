type SignatureMethodSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

const METHODS = [
  { value: "SMS_OTP", label: "SMS OTP" },
  { value: "NAFATH", label: "Nafath" },
  { value: "TABLET", label: "Tablet" },
];

export default function SignatureMethodSelector({ value, onChange }: SignatureMethodSelectorProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-800">Signature Method</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {METHODS.map((method) => (
          <button
            key={method.value}
            type="button"
            onClick={() => onChange(method.value)}
            className={
              value === method.value
                ? "rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
                : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
            }
          >
            {method.label}
          </button>
        ))}
      </div>
    </div>
  );
}
