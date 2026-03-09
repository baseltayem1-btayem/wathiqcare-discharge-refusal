export type HomeCarePlanValue = {
  careType: string;
  equipmentRequired: string[];
  careProvider: string;
};

type Props = {
  value: HomeCarePlanValue;
  onChange: (next: HomeCarePlanValue) => void;
};

const EQUIPMENT_OPTIONS = [
  { key: "oxygen", label: "Oxygen" },
  { key: "portable_ventilator", label: "Portable Ventilator" },
  { key: "hospital_bed", label: "Hospital Bed" },
  { key: "suction_device", label: "Suction Device" },
];

export default function HomeCarePlanForm({ value, onChange }: Props) {
  function toggleEquipment(item: string) {
    const set = new Set(value.equipmentRequired);
    if (set.has(item)) {
      set.delete(item);
    } else {
      set.add(item);
    }
    onChange({ ...value, equipmentRequired: Array.from(set) });
  }

  return (
    <section className="md:col-span-2 rounded-xl border border-slate-300 bg-white p-4">
      <h3 className="text-base font-semibold text-slate-900">Home Care Plan Form</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Care Type</span>
          <select
            value={value.careType}
            onChange={(event) => onChange({ ...value, careType: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            <option value="nursing">Nursing</option>
            <option value="equipment">Equipment</option>
            <option value="family_caregiver_training">Family Caregiver Training</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Care Provider</span>
          <select
            value={value.careProvider}
            onChange={(event) => onChange({ ...value, careProvider: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select</option>
            <option value="family">Family</option>
            <option value="private_nurse">Private Nurse</option>
            <option value="home_care_company">Home Care Company</option>
          </select>
        </label>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium text-slate-700">Equipment Required</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {EQUIPMENT_OPTIONS.map((option) => (
            <label key={option.key} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={value.equipmentRequired.includes(option.key)}
                onChange={() => toggleEquipment(option.key)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
