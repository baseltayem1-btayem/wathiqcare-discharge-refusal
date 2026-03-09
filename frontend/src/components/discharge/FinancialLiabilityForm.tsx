export type FinancialLiabilityValue = {
  acceptsFinancialResponsibility: boolean;
  signatureMethod: "sms_otp" | "nafath" | "tablet_signature";
};

type Props = {
  value: FinancialLiabilityValue;
  onChange: (next: FinancialLiabilityValue) => void;
};

export default function FinancialLiabilityForm({ value, onChange }: Props) {
  return (
    <section className="md:col-span-2 rounded-xl border border-slate-300 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Financial Liability Notice</h3>
      <p className="mt-1 text-sm text-slate-600">
        Generates: Financial Liability Notice for Refusal of Medical Discharge.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.acceptsFinancialResponsibility}
            onChange={(event) =>
              onChange({ ...value, acceptsFinancialResponsibility: event.target.checked })
            }
          />
          Patient accepts financial responsibility
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Signature Method</span>
          <select
            value={value.signatureMethod}
            onChange={(event) =>
              onChange({
                ...value,
                signatureMethod: event.target.value as FinancialLiabilityValue["signatureMethod"],
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="sms_otp">SMS OTP</option>
            <option value="nafath">Nafath</option>
            <option value="tablet_signature">Tablet Signature</option>
          </select>
        </label>
      </div>
    </section>
  );
}
