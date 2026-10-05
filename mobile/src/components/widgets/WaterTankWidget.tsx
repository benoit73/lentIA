import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../auth/AuthContext";
import { WATER_TANK_LITERS } from "../../config";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
import { colors, tabularNums } from "../../theme";
import { T } from "../ui";
import { WidgetCard, WidgetPill } from "./WidgetCard";

function formatLiters(liters: number): string {
  return `${liters.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} L`;
}

export function WaterTankWidget({ delayMs = 0 }: { delayMs?: number }) {
  const { token } = useAuth();
  const { value, online } = useSensorRealtime("water_level", token);

  const pct = value === null ? null : Math.max(0, Math.min(100, value));
  const liters = pct === null ? null : (pct / 100) * WATER_TANK_LITERS;

  return (
    <WidgetCard
      title="Réservoir d'eau"
      subtitle="Capteur de niveau · mesure en temps réel"
      pill={<WidgetPill>{liters === null ? "— L" : `${formatLiters(liters)} restants`}</WidgetPill>}
      delayMs={delayMs}
    >
      <View style={styles.row}>
        <T weight="semibold" size={13} color={colors.textSecondary}>
          Niveau mesuré
        </T>
        <T weight="bold" size={13} color={online ? colors.accent : colors.red500}>
          {online ? "Capteur en ligne" : "Capteur hors ligne"}
        </T>
      </View>

      <View style={styles.tank}>
        <LinearGradient
          colors={["#4B84F7", "#35B6F0", "#6EE7F9"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${pct ?? 0}%` }]}
        >
          {/* Bulles décoratives : donnent l'impression d'un liquide plutôt
              que d'une simple barre de progression. */}
          <View style={[styles.bubble, { left: "8%", top: "28%", width: 8, height: 8, opacity: 0.5 }]} />
          <View style={[styles.bubble, { left: "38%", bottom: "26%", width: 6, height: 6, opacity: 0.4 }]} />
          <View style={[styles.bubble, { left: "62%", top: "22%", width: 4, height: 4, opacity: 0.4 }]} />
        </LinearGradient>

        <View style={styles.center}>
          <View style={styles.badge}>
            <T weight="extrabold" size={24} color={colors.blue600} style={tabularNums}>
              {pct === null ? "--" : `${Math.round(pct)}%`}
            </T>
          </View>
        </View>
      </View>

      <View style={[styles.row, { marginTop: 8 }]}>
        <T weight="medium" size={11} color={colors.textMuted}>
          0 L
        </T>
        <T weight="medium" size={11} color={colors.textMuted} style={{ flexShrink: 1, textAlign: "center" }}>
          {liters === null ? "En attente de relevé" : `${formatLiters(liters)} sur ${formatLiters(WATER_TANK_LITERS)}`}
        </T>
        <T weight="medium" size={11} color={colors.textMuted}>
          {formatLiters(WATER_TANK_LITERS)}
        </T>
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  tank: {
    marginTop: 12,
    height: 96,
    borderRadius: 26,
    backgroundColor: "rgba(226,232,240,0.8)",
    borderWidth: 4,
    borderColor: colors.white,
    overflow: "hidden",
  },
  fill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 22 },
  bubble: { position: "absolute", borderRadius: 999, backgroundColor: colors.white },
  center: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  badge: { borderRadius: 16, backgroundColor: "rgba(255,255,255,0.95)", paddingHorizontal: 16, paddingVertical: 4 },
});
