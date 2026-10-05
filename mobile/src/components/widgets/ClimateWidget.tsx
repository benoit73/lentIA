import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { GerminationRecommendations } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { sensorByKey } from "../../config";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
import { colors, tabularNums } from "../../theme";
import { T } from "../ui";
import { WidgetCard } from "./WidgetCard";

interface GaugeProps {
  sensorKey: string;
  /** Bornes de l'échelle affichée (pas celles du modèle : ici on veut une
   * échelle lisible pour l'œil, ex. 5-40 °C). */
  min: number;
  max: number;
  target?: number;
}

function position(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function Gauge({ sensorKey, min, max, target }: GaugeProps) {
  const { token } = useAuth();
  const { value, online } = useSensorRealtime(sensorKey, token);
  const meta = sensorByKey(sensorKey);
  const color = meta?.color ?? colors.accent;

  return (
    <View style={{ opacity: online ? 1 : 0.6 }}>
      <View style={styles.header}>
        <T weight="semibold" size={12} color={colors.textSecondary}>
          {meta?.label}
        </T>
        <T weight="extrabold" size={20} style={tabularNums}>
          {value === null ? "--" : `${fr(value)} ${meta?.unit}`}
        </T>
      </View>

      <View style={styles.track}>
        <LinearGradient
          colors={[`${color}55`, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${value === null ? 0 : position(value, min, max)}%` }]}
        />
        {target !== undefined && <View style={[styles.target, { left: `${position(target, min, max)}%` }]} />}
      </View>

      <View style={styles.scale}>
        <T weight="medium" size={10} color={colors.textMuted}>
          {min} {meta?.unit}
        </T>
        {target !== undefined && (
          <T weight="bold" size={10} color={colors.textSecondary}>
            Cible IA {fr(target)} {meta?.unit}
          </T>
        )}
        <T weight="medium" size={10} color={colors.textMuted}>
          {max} {meta?.unit}
        </T>
      </View>
    </View>
  );
}

interface Props {
  recommendations: GerminationRecommendations | null;
  delayMs?: number;
}

export function ClimateWidget({ recommendations, delayMs = 0 }: Props) {
  return (
    <WidgetCard title="Climat" subtitle="Air du bac, en direct" delayMs={delayMs}>
      <View style={{ marginTop: 16, gap: 20 }}>
        <Gauge
          sensorKey="temperature"
          min={5}
          max={40}
          target={recommendations?.recommendations.temperature?.recommended_value}
        />
        <Gauge
          sensorKey="air_humidity"
          min={0}
          max={100}
          target={recommendations?.recommendations.air_humidity?.recommended_value}
        />
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 8 },
  track: { marginTop: 8, height: 10, borderRadius: 999, backgroundColor: "rgba(226,232,240,0.9)" },
  fill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999 },
  target: {
    position: "absolute",
    top: -4,
    width: 2,
    height: 18,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: "rgba(30,32,43,0.7)",
  },
  scale: { marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
