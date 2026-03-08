type PasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  showPassword: boolean;
  isDisabled?: boolean;
  showLabel: string;
  hideLabel: string;
  onChange: (value: string) => void;
  onToggleVisibility: () => void;
};

export default function PasswordField({
  id,
  label,
  value,
  showPassword,
  isDisabled = false,
  showLabel,
  hideLabel,
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300/60 disabled:bg-slate-100"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          type={showPassword ? "text" : "password"}
          required
          disabled={isDisabled}
          autoComplete="current-password"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          className="absolute inset-y-1 end-1 rounded-lg px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label={showPassword ? hideLabel : showLabel}
        >
          {showPassword ? hideLabel : showLabel}
        </button>
      </div>
    </div>
  );
}
