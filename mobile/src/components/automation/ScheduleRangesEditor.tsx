import { Pressable, View } from "react-native";
import type { TimeRange } from "../../api";
import { colors } from "../../theme";
import { LinkText, T } from "../ui";
import { TimeField } from "./fields";

interface Props {
  ranges: TimeRange[];
  onChange: (ranges: TimeRange[]) => void;
}

export function ScheduleRangesEditor({ ranges, onChange }: Props) {
  function updateRange(index: number, patch: Partial<TimeRange>) {
    onChange(ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRange(index: number) {
    onChange(ranges.filter((_, i) => i !== index));
  }

  function addRange() {
    onChange([...ranges, { start: "08:00", end: "10:00" }]);
  }

  return (
    <View style={{ marginTop: 16, gap: 8 }}>
      {ranges.map((range, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
          <TimeField label="Début" value={range.start} onChange={(start) => updateRange(i, { start })} />
          <T color={colors.textSecondary} style={{ paddingBottom: 10 }}>
            →
          </T>
          <TimeField label="Fin" value={range.end} onChange={(end) => updateRange(i, { end })} />
          <Pressable
            onPress={() => removeRange(i)}
            disabled={ranges.length <= 1}
            accessibilityLabel="Supprimer cette plage"
            hitSlop={6}
            style={{ marginBottom: 8, width: 28, height: 28, alignItems: "center", justifyContent: "center", opacity: ranges.length <= 1 ? 0.3 : 1 }}
          >
            <T size={14} color={colors.textSecondary}>
              ✕
            </T>
          </Pressable>
        </View>
      ))}
      <LinkText onPress={addRange}>+ Ajouter une plage</LinkText>
    </View>
  );
}
