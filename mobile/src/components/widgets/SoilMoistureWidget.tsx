import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ActuatorEvent, GerminationRecommendations } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { formatRelativeToNow } from "../../format";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
import { colors, tabularNums } from "../../theme";
import { T } from "../ui";
import { WidgetCard, WidgetPill } from "./WidgetCard";

function lastWatering(events: ActuatorEvent[]): ActuatorEvent | undefined {
  // `events` arrive déjà du plus récent au plus ancien (cf. /api/actuators/events).
  return events.find((event) => event.actuator === "watering" && event.state);
}

interface Props {
  events: ActuatorEvent[];
  recommendations: GerminationRecommendations | null;
  delayMs?: number;
}

export function SoilMoistureWidget({ events, recommendations, delayMs = 0 }: Props) {
  const { token } = useAuth();
  const { value, online } = useSensorRealtime("soil_humidity", token);
  const target = recommendations?.recommendations.soil_humidity?.recommended_value;
  const watering = lastWatering(events);

  const pct = value === null ? null : Math.max(0, Math.min(100, value));

  return (
    <WidgetCard
      title="Humidité du sol"
      subtitle="Sonde plantée dans le substrat"
      pill={<WidgetPill tone={online ? "accent" : "muted"}>{online ? "En ligne" : "Hors ligne"}</WidgetPill>}
      delayMs={delayMs}
    >
      <View style={styles.row}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T weight="extrabold" size={36} style={tabularNums}>
            {pct === null ? "--" : `${Math.round(pct)}%`}
          </T>
          {target !== undefined && (
            <T weight="bold" size={12} color={colors.accent} style={{ marginTop: 4 }}>
              Cible IA : {target.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
            </T>
          )}
          <T size={11} color={colors.textSecondary} style={{ marginTop: 12 }}>
            {watering ? (
              <>
                Dernier arrosage{"\n"}
                <T weight="bold" size={11}>
                  {formatRelativeToNow(watering.created_at)}
                </T>
                {watering.source === "auto" && " · auto"}
              </>
            ) : (
              "Aucun arrosage enregistré"
            )}
          </T>
        </View>

        {/* Tube vertical : rappelle une sonde plantée dans la terre, et change
            de forme par rapport aux jauges horizontales des autres widgets. */}
        <View style={styles.tube}>
          <LinearGradient
            colors={["#7DD3FC", "#38BDF8", "#8E94F2"]}
            locations={[0, 0.45, 1]}
            style={[styles.liquid, { height: `${pct ?? 0}%` }]}
          />
          {target !== undefined && (
            <View style={[styles.targetLine, { bottom: `${Math.max(0, Math.min(100, target))}%` }]} />
          )}
        </View>
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  row: { marginTop: 16, flexDirection: "row", alignItems: "center", gap: 20 },
  tube: {
    width: 56,
    height: 144,
    borderRadius: 999,
    backgroundColor: "rgba(226,232,240,0.8)",
    borderWidth: 4,
    borderColor: colors.white,
    overflow: "hidden",
  },
  liquid: { position: "absolute", left: 0, right: 0, bottom: 0 },
  targetLine: {
    position: "absolute",
    left: 4,
    right: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
