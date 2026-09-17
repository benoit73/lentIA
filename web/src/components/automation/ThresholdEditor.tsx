import type { ActionMode } from "../../api";

export interface ThresholdFormState {
  sensor: string;
  comparator: "above" | "below";
  threshold: string;
  actionMode: ActionMode;
  durationMinutes: string;
  targetValue: string;
}

interface Props {
  form: ThresholdFormState;
  onChange: (form: ThresholdFormState) => void;
  sensorOptions: { value: string; label: string }[];
  unit: string;
}

function inputClass() {
  return "rounded-xl border border-slate-200 px-2 py-1.5 bg-white text-theme-textPrimary text-sm";
}

export function ThresholdEditor({ form, onChange, sensorOptions, unit }: Props) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      {sensorOptions.length > 1 && (
        <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
          Capteur
          <select
            value={form.sensor}
            onChange={(e) => onChange({ ...form, sensor: e.target.value })}
            className={inputClass()}
          >
            {sensorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
        Seuil ({unit}) — moyenne sur les 10 dernières minutes
        <input
          type="number"
          value={form.threshold}
          onChange={(e) => onChange({ ...form, threshold: e.target.value })}
          className={inputClass()}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-theme-textSecondary">Une fois déclenché</span>
        <div className="glass-pill rounded-full p-1 inline-flex items-center gap-1 border border-white/70 w-fit">
          <button
            type="button"
            onClick={() => onChange({ ...form, actionMode: "duration" })}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              form.actionMode === "duration"
                ? "bg-white shadow-sm text-theme-textPrimary"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            Pendant une durée
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...form, actionMode: "until_target" })}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              form.actionMode === "until_target"
                ? "bg-white shadow-sm text-theme-textPrimary"
                : "text-theme-textSecondary hover:text-theme-textPrimary"
            }`}
          >
            Jusqu'à une valeur
          </button>
        </div>
      </div>

      {form.actionMode === "duration" ? (
        <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
          Durée (minutes)
          <input
            type="number"
            value={form.durationMinutes}
            onChange={(e) => onChange({ ...form, durationMinutes: e.target.value })}
            className={inputClass()}
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-xs font-semibold text-theme-textSecondary">
          Valeur cible ({unit})
          <input
            type="number"
            value={form.targetValue}
            onChange={(e) => onChange({ ...form, targetValue: e.target.value })}
            className={inputClass()}
          />
        </label>
      )}
    </div>
  );
}
