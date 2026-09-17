interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function ToggleSwitch({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full p-1 flex items-center transition-colors duration-200 disabled:opacity-50 ${
        checked ? "bg-theme-greenSoft justify-end" : "bg-slate-300 justify-start"
      }`}
    >
      <span className="w-4 h-4 bg-white rounded-full shadow-md" />
    </button>
  );
}
