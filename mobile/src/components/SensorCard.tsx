import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { HistoryRange } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { SensorMeta } from "../config";
import { useLiveSeries } from "../hooks/useLiveSeries";
import { useSensorRealtime } from "../hooks/useSensorRealtime";
import { colors, radius, softCardShadow } from "../theme";
import { LiveStatusDot } from "./LiveStatusDot";
import { Sparkline } from "./Sparkline";
import { T } from "./ui";

export function formatValue(value: number | null, unit: string) {
  if (value === null || value === undefined) return "--";
  const rounded = unit === "lux" ? Math.round(value).toLocaleString("fr-FR") : value.toFixed(1);
  return `${rounded} ${unit}`;
}

export function SensorCard({
  sensor,
  range,
  live,
  recommendedValue,
}: {
  sensor: SensorMeta;
  range: HistoryRange;
  live: boolean;
  recommendedValue?: number;
}) {
  const { token } = useAuth();
  const { value: liveValue, online, receivedAt } = useSensorRealtime(sensor.key, token);
  const { points, leftEdge, rightEdge } = useLiveSeries(sensor.key, range, { live, liveValue, receivedAt });

  const lastRealValue = [...points].reverse().find((p) => p.value !== null)?.value ?? null;
  const currentValue = liveValue ?? lastRealValue;

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/sensors/[sensor]", params: { sensor: sensor.key } })}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T weight="bold" size={18}>
            {sensor.label}
          </T>
          <T weight="medium" size={12} color={colors.textSecondary} style={{ marginTop: 2 }}>
            Voir l'historique →
          </T>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <T weight="extrabold" size={22}>
            {formatValue(currentValue, sensor.unit)}
          </T>
          <LiveStatusDot online={online} />
        </View>
      </View>
      {recommendedValue !== undefined && (
        <View style={styles.target}>
          <T weight="semibold" size={11} color={colors.accent}>
            Cible IA : {formatValue(recommendedValue, sensor.unit)}
          </T>
        </View>
      )}
      <View style={{ marginTop: 16 }}>
        <Sparkline id={sensor.key} points={points} leftEdge={leftEdge} rightEdge={rightEdge} color={sensor.color} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius["3xl"],
    padding: 16,
    ...softCardShadow,
  },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  target: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
