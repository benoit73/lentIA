import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { ActuatorEvent, GerminationRecommendations } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { sensorByKey, WATER_TANK_LITERS } from "../../config";
import { formatRelativeToNow } from "../../format";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
import { colors, tabularNums } from "../../theme";
import { T } from "../ui";
import { WidgetCard } from "./WidgetCard";

// Version téléphone des widgets Réservoir, Climat et Humidité du sol du web :
// une tuile par capteur dans une grille 2×2, pour tout voir sans défiler.

const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });

function position(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

interface TileProps {
  sensorKey: string;
  /** Bornes de la barre (échelle lisible pour l'œil, pas celles du modèle). */
  min: number;
  max: number;
  target?: number;
  /** Ligne sous la barre ; à défaut, la cible IA si elle existe. */
  caption?: string | ((value: number) => string);
}

function Tile({ sensorKey, min, max, target, caption }: TileProps) {
  const { token } = useAuth();
  const { value, online } = useSensorRealtime(sensorKey, token);
  const meta = sensorByKey(sensorKey);
  const color = meta?.color ?? colors.accent;
  const unit = meta?.unit ?? "";

  const custom = typeof caption === "function" ? (value === null ? undefined : caption(value)) : caption;
  const footer =
    custom ?? (target !== undefined ? `Cible IA ${fr(target)} ${unit}` : online ? "En direct" : "Hors ligne");

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/sensors/[sensor]", params: { sensor: sensorKey } })}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}
      accessibilityLabel={`${meta?.label}, voir l'historique`}
    >
      <View style={styles.tileHeader}>
        <T weight="semibold" size={11} color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
          {meta?.label}
        </T>
        <View style={[styles.dot, { backgroundColor: online ? colors.emerald500 : colors.slate300 }]} />
      </View>

      <T weight="extrabold" size={24} style={[{ marginTop: 4 }, tabularNums]}>
        {value === null ? "--" : `${fr(value)}`}
        <T weight="bold" size={13} color={colors.textSecondary}>
          {value === null ? "" : ` ${unit}`}
        </T>
      </T>

      <View style={styles.track}>
        <LinearGradient
          colors={[`${color}66`, color]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${value === null ? 0 : position(value, min, max)}%` }]}
        />
        {target !== undefined && <View style={[styles.target, { left: `${position(target, min, max)}%` }]} />}
      </View>

      <T size={10} color={colors.textMuted} numberOfLines={1} style={{ marginTop: 6 }}>
        {footer}
      </T>
    </Pressable>
  );
}

function lastWatering(events: ActuatorEvent[]): ActuatorEvent | undefined {
  // `events` arrive déjà du plus récent au plus ancien (cf. /api/actuators/events).
  return events.find((event) => event.actuator === "watering" && event.state);
}

interface Props {
  events: ActuatorEvent[];
  recommendations: GerminationRecommendations | null;
  delayMs?: number;
}

export function MeasuresWidget({ events, recommendations, delayMs = 0 }: Props) {
  const targets = recommendations?.recommendations;
  const watering = lastWatering(events);

  return (
    <WidgetCard title="Mesures" subtitle="En direct · touche une tuile pour l'historique" delayMs={delayMs}>
      <View style={styles.grid}>
        <Tile
          sensorKey="water_level"
          min={0}
          max={100}
          caption={(pct) =>
            `${fr((Math.max(0, Math.min(100, pct)) / 100) * WATER_TANK_LITERS)} L sur ${fr(WATER_TANK_LITERS)} L`
          }
        />
        <Tile
          sensorKey="soil_humidity"
          min={0}
          max={100}
          target={targets?.soil_humidity?.recommended_value}
          caption={watering ? `Arrosé ${formatRelativeToNow(watering.created_at)}` : undefined}
        />
        <Tile sensorKey="temperature" min={5} max={40} target={targets?.temperature?.recommended_value} />
        <Tile sensorKey="air_humidity" min={0} max={100} target={targets?.air_humidity?.recommended_value} />
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  grid: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, flexBasis: "45%", borderRadius: 16, padding: 12, backgroundColor: colors.whiteGlass },
  tileHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  track: { marginTop: 8, height: 6, borderRadius: 999, backgroundColor: "rgba(226,232,240,0.9)" },
  fill: { position: "absolute", top: 0, bottom: 0, left: 0, borderRadius: 999 },
  target: {
    position: "absolute",
    top: -3,
    width: 2,
    height: 12,
    marginLeft: -1,
    borderRadius: 1,
    backgroundColor: "rgba(30,32,43,0.7)",
  },
});
