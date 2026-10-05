import { View } from "react-native";
import type { ActionMode } from "../../api";
import { Segmented } from "../ui";
import { FieldLabel, NumberField } from "./fields";

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

const ACTION_MODES: { key: ActionMode; label: string }[] = [
  { key: "duration", label: "Pendant une durée" },
  { key: "until_target", label: "Jusqu'à une valeur" },
];

export function ThresholdEditor({ form, onChange, sensorOptions, unit }: Props) {
  return (
    <View style={{ marginTop: 16, gap: 12 }}>
      {sensorOptions.length > 1 && (
        <View style={{ gap: 4 }}>
          <FieldLabel>Capteur</FieldLabel>
          <Segmented
            small
            options={sensorOptions.map((opt) => ({ key: opt.value, label: opt.label }))}
            value={form.sensor}
            onChange={(sensor) => onChange({ ...form, sensor })}
          />
        </View>
      )}

      <NumberField
        label={`Seuil (${unit}) — moyenne sur les 10 dernières minutes`}
        value={form.threshold}
        onChange={(threshold) => onChange({ ...form, threshold })}
      />

      <View style={{ gap: 4 }}>
        <FieldLabel>Une fois déclenché</FieldLabel>
        <Segmented small options={ACTION_MODES} value={form.actionMode} onChange={(actionMode) => onChange({ ...form, actionMode })} />
      </View>

      {form.actionMode === "duration" ? (
        <NumberField
          label="Durée (minutes)"
          value={form.durationMinutes}
          onChange={(durationMinutes) => onChange({ ...form, durationMinutes })}
        />
      ) : (
        <NumberField
          label={`Valeur cible (${unit})`}
          value={form.targetValue}
          onChange={(targetValue) => onChange({ ...form, targetValue })}
        />
      )}
    </View>
  );
}
