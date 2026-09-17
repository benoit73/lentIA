import type { RuleType, TimeRange } from "../../api";
import { ToggleSwitch } from "../ToggleSwitch";
import { ScheduleRangesEditor } from "./ScheduleRangesEditor";
import { ThresholdEditor, type ThresholdFormState } from "./ThresholdEditor";

export interface FlexibleForm {
  enabled: boolean;
  ruleType: RuleType;
  ranges: TimeRange[];
  threshold: ThresholdFormState;
}

interface Props {
  title: string;
  description: string;
  form: FlexibleForm;
  onChange: (form: FlexibleForm) => void;
  onSave: () => void;
  saving: boolean;
  message?: string;
  sensorOptions: { value: string; label: string }[];
  unit: string;
}

export function FlexibleActuatorCard({
  title,
  description,
  form,
  onChange,
  onSave,
  saving,
  message,
  sensorOptions,
  unit,
}: Props) {
  return (
    <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-base text-theme-textPrimary">{title}</h3>
          <p className="text-xs text-theme-textSecondary mt-0.5">{description}</p>
        </div>
        <ToggleSwitch
          checked={form.enabled}
          onChange={(next) => onChange({ ...form, enabled: next })}
          label={`Automatisation ${title.toLowerCase()}`}
        />
      </div>

      <div className="mt-4 glass-pill rounded-full p-1 inline-flex items-center gap-1 border border-white/70 w-fit">
        <button
          type="button"
          onClick={() => onChange({ ...form, ruleType: "threshold" })}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
            form.ruleType === "threshold"
              ? "bg-white shadow-sm text-theme-textPrimary"
              : "text-theme-textSecondary hover:text-theme-textPrimary"
          }`}
        >
          Seuil
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...form, ruleType: "schedule" })}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
            form.ruleType === "schedule"
              ? "bg-white shadow-sm text-theme-textPrimary"
              : "text-theme-textSecondary hover:text-theme-textPrimary"
          }`}
        >
          Plage horaire
        </button>
      </div>

      {form.ruleType === "threshold" ? (
        <ThresholdEditor
          form={form.threshold}
          onChange={(threshold) => onChange({ ...form, threshold })}
          sensorOptions={sensorOptions}
          unit={unit}
        />
      ) : (
        <ScheduleRangesEditor ranges={form.ranges} onChange={(ranges) => onChange({ ...form, ranges })} />
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className="px-4 py-2 rounded-xl bg-theme-accent text-white text-xs font-bold disabled:opacity-50"
        >
          Enregistrer
        </button>
        {message && <span className="text-xs text-theme-textSecondary">{message}</span>}
      </div>
    </div>
  );
}
