import type { WorkflowOption } from "@/components/cases/workflowTreeTypes";
import { useI18n } from "@/i18n/I18nProvider";

type WorkflowDropdownFieldProps = {
  label: string;
  value: string;
  options: WorkflowOption[];
  onChange: (value: string) => void;
};

export default function WorkflowDropdownField({
  label,
  value,
  options,
  onChange,
}: WorkflowDropdownFieldProps) {
  const { lang } = useI18n();

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
      >
        <option value="">{lang === "ar" ? "اختر" : "Select"}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
