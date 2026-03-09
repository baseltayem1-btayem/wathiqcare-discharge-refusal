export type TransferHospitalValue = {
  receivingHospital: string;
  transferReason: string;
  medicalStabilityConfirmation: boolean;
};

type Props = {
  value: TransferHospitalValue;
  onChange: (next: TransferHospitalValue) => void;
};

export default function TransferHospitalForm({ value, onChange }: Props) {
  return (
    <section className="md:col-span-2 rounded-xl border border-slate-300 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">نموذج تصريح التحويل</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">المستشفى المستقبِل</span>
          <input
            value={value.receivingHospital}
            onChange={(event) => onChange({ ...value, receivingHospital: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">سبب التحويل</span>
          <input
            value={value.transferReason}
            onChange={(event) => onChange({ ...value, transferReason: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
          <input
            type="checkbox"
            checked={value.medicalStabilityConfirmation}
            onChange={(event) =>
              onChange({ ...value, medicalStabilityConfirmation: event.target.checked })
            }
          />
          تأكيد الاستقرار الطبي
        </label>
      </div>
    </section>
  );
}
