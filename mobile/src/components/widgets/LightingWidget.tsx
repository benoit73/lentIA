import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";
import type { ActuatorEvent, AutomationRule, ScheduleThresholdConfig, TimeRange } from "../../api";
import { DEFAULT_LIGHT_TARGET_HOURS } from "../../config";
import { colors, tabularNums } from "../../theme";
import { T } from "../ui";
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
      pill={<WidgetPill>{remainingHours > 0 ? `${formatHours(remainingHours)} restantes` : "Cycle atteint"}</WidgetPill>}
      delayMs={delayMs}
    >
      <View style={styles.scene}>
        {/* Halo : seule partie qui change vraiment quand la lampe s'allume. */}
        {on && (
          <SoftPulse style={styles.halo}>
            <Svg width={224} height={224}>
              <Defs>
                <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FBBF24" stopOpacity={0.55} />
                  <Stop offset="0.7" stopColor="#FBBF24" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Rect width={224} height={224} fill="url(#halo)" />
            </Svg>
          </SoftPulse>
        )}
        <View style={{ alignItems: "center" }}>
          <View style={[styles.cord, { backgroundColor: on ? colors.amber300 : colors.slate300 }]} />
          <LinearGradient colors={on ? [colors.white, colors.amber50] : [colors.white, colors.slate100]} style={styles.shade}>
            <T weight="extrabold" size={11} color={on ? colors.amber600 : colors.textMuted} style={{ letterSpacing: 0.6 }}>
              {on ? "LAMPE ALLUMÉE" : "LAMPE ÉTEINTE"}
            </T>
          </LinearGradient>
          {/* Cône de lumière projeté sous l'abat-jour : c'est lui qui fait
              vraiment « lampe allumée », le halo seul restait plat. */}
          {on ? (
            <Svg width={208} height={80}>
              <Defs>
                <SvgLinearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FBBF24" stopOpacity={0.42} />
                  <Stop offset="0.55" stopColor="#FDE047" stopOpacity={0.12} />
                  <Stop offset="1" stopColor="#FEF08A" stopOpacity={0} />
                </SvgLinearGradient>
              </Defs>
              <Polygon points="50,0 158,0 208,80 0,80" fill="url(#cone)" />
            </Svg>
          ) : (
            <View style={{ height: 80 }} />
          )}
        </View>
      </View>

      <View style={styles.panel}>
        <T weight="extrabold" size={11} color={colors.textSecondary} style={{ textTransform: "uppercase", letterSpacing: 0.5 }}>
          Exposition lumineuse
        </T>
        <T weight="extrabold" size={24} style={[{ marginTop: 4 }, tabularNums]}>
          {formatHours(doneHours)} sur {formatHours(targetHours)}
        </T>

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
        <T size={11} color={colors.textSecondary} style={{ marginTop: 8 }}>
          Cycle cible de {formatHours(targetHours)} pour la croissance des lentilles.
        </T>
      </View>
    </WidgetCard>
  );
}

const styles = StyleSheet.create({
  scene: {
    marginTop: 16,
    height: 168,
    borderRadius: 16,
    backgroundColor: colors.whiteGlass,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  halo: { position: "absolute", width: 224, height: 224 },
  cord: { width: 2, height: 40, borderRadius: 1 },
  shade: {
    width: 160,
    height: 56,
    borderTopLeftRadius: 80,
    borderTopRightRadius: 80,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 10,
  },
  panel: { marginTop: 16, borderRadius: 16, backgroundColor: colors.whiteGlass, padding: 16 },
  track: { marginTop: 12, height: 10, borderRadius: 999, backgroundColor: "rgba(226,232,240,0.9)", overflow: "hidden" },
  row: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", gap: 8 },
});
