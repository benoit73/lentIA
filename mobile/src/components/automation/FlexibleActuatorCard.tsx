import { View } from "react-native";
import type { RuleType, TimeRange } from "../../api";
import { colors } from "../../theme";
import { ToggleSwitch } from "../ToggleSwitch";
import { Card, PrimaryButton, Segmented, T } from "../ui";
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

const RULE_TYPES: { key: "threshold" | "schedule"; label: string }[] = [
  { key: "threshold", label: "Seuil" },
  { key: "schedule", label: "Plage horaire" },
];

export function FlexibleActuatorCard({ title, description, form, onChange, onSave, saving, message, sensorOptions, unit }: Props) {
  return (
    <Card>
      <RuleHeader
        title={title}
        description={description}
        enabled={form.enabled}
        onToggle={(enabled) => onChange({ ...form, enabled })}
      />

      <View style={{ marginTop: 16 }}>
        <Segmented
          options={RULE_TYPES}
          value={form.ruleType === "schedule" ? "schedule" : "threshold"}
          onChange={(ruleType) => onChange({ ...form, ruleType })}
        />
      </View>

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

      <SaveRow onSave={onSave} saving={saving} message={message} />
    </Card>
  );
}

export function RuleHeader({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <View style={{ flex: 1 }}>
        <T weight="bold" size={16}>
          {title}
        </T>
        <T size={12} color={colors.textSecondary} style={{ marginTop: 2 }}>
          {description}
        </T>
      </View>
      <ToggleSwitch checked={enabled} onChange={onToggle} label={`Automatisation ${title.toLowerCase()}`} />
    </View>
  );
}

export function SaveRow({ onSave, saving, message }: { onSave: () => void; saving: boolean; message?: string }) {
  return (
    <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
      <PrimaryButton label="Enregistrer" onPress={onSave} disabled={saving} />
      {!!message && (
        <T size={12} color={colors.textSecondary} style={{ flex: 1 }}>
          {message}
        </T>
      )}
    </View>
  );
}
