export type EquipmentRequestValue = {
  requestedEquipment: string;
  department: "respiratory_therapy" | "physical_therapy" | "occupational_therapy";
  status: "pending" | "approved" | "unavailable";
};

type Props = {
  value: EquipmentRequestValue;
  onChange: (next: EquipmentRequestValue) => void;
};

export default function EquipmentRequestForm({ value, onChange }: Props) {
  return (
    <section className="md:col-span-2 rounded-xl border border-slate-300 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Equipment Request Form</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Requested Equipment</span>
          <input
            value={value.requestedEquipment}
            onChange={(event) => onChange({ ...value, requestedEquipment: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Department</span>
          <select
            value={value.department}
            onChange={(event) =>
              onChange({
                ...value,
                department: event.target.value as EquipmentRequestValue["department"],
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="respiratory_therapy">Respiratory Therapy</option>
            <option value="physical_therapy">Physical Therapy</option>
            <option value="occupational_therapy">Occupational Therapy</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <select
            value={value.status}
            onChange={(event) =>
              onChange({ ...value, status: event.target.value as EquipmentRequestValue["status"] })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
      </div>

      {value.status === "unavailable" ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Temporary Equipment Approval will be generated automatically.
        </p>
      ) : null}
    </section>
  );
}
