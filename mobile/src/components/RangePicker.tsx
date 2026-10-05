import { Pressable, StyleSheet, View } from "react-native";
import { colors } from "../theme";
import { pickDateTime } from "./pickers";
import { Segmented, T } from "./ui";

export type PresetKey = "1h" | "24h" | "7d" | "30d" | "custom";

interface Props {
  preset: PresetKey;
  customStart: Date | null;
  customEnd: Date | null;
  onPresetChange: (preset: PresetKey) => void;
  onCustomChange: (start: Date | null, end: Date | null) => void;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "1h", label: "1 h" },
  { key: "24h", label: "24 h" },
  { key: "7d", label: "7 j" },
  { key: "30d", label: "30 j" },
  { key: "custom", label: "Personnalisé" },
];

function formatShort(date: Date | null) {
  if (!date) return "Choisir…";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function RangePicker({ preset, customStart, customEnd, onPresetChange, onCustomChange }: Props) {
  async function editStart() {
    const picked = await pickDateTime(customStart ?? new Date(Date.now() - 24 * 3600 * 1000));
    if (picked) onCustomChange(picked, customEnd);
  }

  async function editEnd() {
    const picked = await pickDateTime(customEnd ?? new Date());
    if (picked) onCustomChange(customStart, picked);
  }

  return (
    <View style={{ gap: 8 }}>
      <Segmented options={PRESETS} value={preset} onChange={onPresetChange} />
      {preset === "custom" && (
        <View style={styles.customRow}>
          <Pressable onPress={editStart} style={styles.dateButton}>
            <T weight="semibold" size={12}>
              {formatShort(customStart)}
            </T>
          </Pressable>
          <T weight="semibold" size={12} color={colors.textSecondary}>
            →
          </T>
          <Pressable onPress={editEnd} style={styles.dateButton}>
            <T weight="semibold" size={12}>
              {formatShort(customEnd)}
            </T>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function presetToRange(preset: PresetKey, customStart: Date | null, customEnd: Date | null) {
  if (preset === "custom") {
    return {
      start: customStart ? customStart.toISOString() : undefined,
      end: customEnd ? customEnd.toISOString() : undefined,
      limit: 2000,
    };
  }
  const hoursByPreset: Record<Exclude<PresetKey, "custom">, number> = {
    "1h": 1,
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  };
  const now = new Date();
  const start = new Date(now.getTime() - hoursByPreset[preset] * 3600 * 1000);
  return { start: start.toISOString(), end: now.toISOString(), limit: 2000 };
}

const styles = StyleSheet.create({
  customRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dateButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
});
