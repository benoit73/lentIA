import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { ActuatorEvent, AutomationRule, ScheduleThresholdConfig, TimeRange } from "../../api";
import { DEFAULT_LIGHT_TARGET_HOURS } from "../../config";
import { colors, tabularNums } from "../../theme";
import { T } from "../ui";
import { LightIcon } from "./icons";
import { SoftPulse, WidgetCard, WidgetPill } from "./WidgetCard";

/** Cumul des minutes éclairées aujourd'hui, en comptant la période en cours
 * (`ended_at` nul) jusqu'à maintenant et en rognant ce qui déborde d'hier. */
function lightHoursToday(events: ActuatorEvent[]): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();
  const now = Date.now();

  let seconds = 0;
  for (const event of events) {
    if (event.actuator !== "light" || !event.state) continue;
    const start = Math.max(new Date(event.created_at).getTime(), dayStart);
    const end = event.ended_at ? new Date(event.ended_at).getTime() : now;
    if (end > start) seconds += (end - start) / 1000;
  }
  return seconds / 3600;
}

function rangeHours(ranges: TimeRange[]): number {
  const minutes = ranges.reduce((total, range) => {
    const [startHour, startMinute] = range.start.split(":").map(Number);
    const [endHour, endMinute] = range.end.split(":").map(Number);
    let span = endHour * 60 + endMinute - (startHour * 60 + startMinute);
    if (span <= 0) span += 24 * 60; // plage qui traverse minuit
    return total + span;
  }, 0);
  return minutes / 60;
}

function scheduleRanges(rule: AutomationRule | undefined): TimeRange[] {
  if (!rule?.enabled) return [];
  const config = rule.config as ScheduleThresholdConfig;
  return Array.isArray(config?.ranges) ? config.ranges : [];
}

function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;
}

interface Props {
  on: boolean;
  events: ActuatorEvent[];
  rule: AutomationRule | undefined;
  delayMs?: number;
}

export function LightingWidget({ on, events, rule, delayMs = 0 }: Props) {
  const ranges = scheduleRanges(rule);
  const targetHours = ranges.length > 0 ? rangeHours(ranges) : DEFAULT_LIGHT_TARGET_HOURS;
  const doneHours = lightHoursToday(events);
  const remainingHours = Math.max(0, targetHours - doneHours);
  const progress = targetHours > 0 ? Math.min(100, (doneHours / targetHours) * 100) : 0;

  return (
    <WidgetCard
      title="Éclairage horticole"
      subtitle="Cycle lumineux du jour"
      pill={
        <WidgetPill>{remainingHours > 0 ? `${formatHours(remainingHours)} restantes` : "Cycle atteint"}</WidgetPill>
      }
      delayMs={delayMs}
    >
      {/* Version compacte de la scène du web (abat-jour + cône de lumière) :
          l'icône s'éclaire et pulse quand la lampe est allumée. */}
      <View style={styles.panel}>
        <View style={styles.head}>
          <View style={styles.iconWrap}>
            {on && <SoftPulse style={styles.glow} />}
            <View style={[styles.icon, { backgroundColor: on ? colors.amber100 : colors.slate100 }]}>
              <LightIcon color={on ? colors.amber600 : colors.textMuted} size={22} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T
              weight="extrabold"
              size={10}
              color={on ? colors.amber600 : colors.textMuted}
              style={{ letterSpacing: 0.6 }}
            >
              {on ? "LAMPE ALLUMÉE" : "LAMPE ÉTEINTE"}
            </T>
            <T weight="extrabold" size={20} style={tabularNums}>
              {formatHours(doneHours)} sur {formatHours(targetHours)}
            </T>
          </View>
        </View>

        <View style={styles.track}>
          <LinearGradient
            colors={["#FBBF24", "#A78BFA", "#8B5CF6"]}
            locations={[0, 0.65, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: "100%", width: `${progress}%`, borderRadius: 999 }}
          />
        </View>

        <View style={styles.row}>
          <T weight="medium" size={11} color={colors.textMuted}>
            {ranges.length > 0 ? `Début ${ranges[0].start}` : "Pas de plage programmée"}
          </T>
          <T weight="medium" size={11} color={colors.textMuted}>
            {ranges.length > 0 ? `Fin prévue ${ranges[ranges.length - 1].end}` : "—"}
          </T>
        </View>
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 14, borderRadius: 16, backgroundColor: colors.whiteGlass, padding: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(252,211,77,0.45)" },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  track: { marginTop: 12, height: 8, borderRadius: 999, backgroundColor: "rgba(226,232,240,0.9)", overflow: "hidden" },
  row: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", gap: 8 },
});
