import type { AutomationRule, ScheduleThresholdConfig, ThresholdConfig, TimeRange } from "../../api";
import { ACTUATORS, sensorByKey } from "../../config";
import { View } from "react-native";
import { colors } from "../../theme";
import { T } from "../ui";
import { WidgetCard } from "./WidgetCard";

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function nowMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function isInRange(range: TimeRange, current: number): boolean {
  const start = toMinutes(range.start);
  const end = toMinutes(range.end);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

interface Entry {
  key: string;
  when: string;
  title: string;
  detail: string;
  active: boolean;
}

function comparatorText(config: ThresholdConfig | ScheduleThresholdConfig): string {
  const meta = sensorByKey(config.sensor);
  const symbol = config.comparator === "below" ? "<" : ">";
  return `si ${meta?.label.toLowerCase() ?? config.sensor} ${symbol} ${config.threshold} ${meta?.unit ?? ""}`.trim();
}

function scheduleEntry(ranges: TimeRange[], current: number): { when: string; detail: string; active: boolean } | null {
  if (ranges.length === 0) return null;

  const activeRange = ranges.find((range) => isInRange(range, current));
  if (activeRange) return { when: "En cours", detail: `jusqu'à ${activeRange.end}`, active: true };

  const next = ranges
    .map((range) => ({ range, delay: (toMinutes(range.start) - current + 1440) % 1440 }))
    .sort((a, b) => a.delay - b.delay)[0];
  return { when: next.range.start, detail: `jusqu'à ${next.range.end}`, active: false };
}

function buildEntries(rules: Record<string, AutomationRule>): Entry[] {
  const current = nowMinutes();
  const entries: Entry[] = [];

  for (const actuator of ACTUATORS) {
    const rule = rules[actuator.key];
    if (!rule?.enabled) continue;

    if (rule.rule_type === "threshold") {
      const config = rule.config as ThresholdConfig;
      const stop =
        config.action_mode === "duration"
          ? `pendant ${config.duration_minutes} min`
          : `jusqu'à ${config.target_value} ${sensorByKey(config.sensor)?.unit ?? ""}`.trim();
      entries.push({
        key: actuator.key,
        when: "Sur seuil",
        title: actuator.label,
        detail: `${comparatorText(config)} · ${stop}`,
        active: false,
      });
      continue;
    }

    const config = rule.config as ScheduleThresholdConfig;
    const schedule = scheduleEntry(Array.isArray(config?.ranges) ? config.ranges : [], current);
    if (!schedule) continue;

    const condition = rule.rule_type === "schedule_threshold" ? ` · ${comparatorText(config)}` : "";
    entries.push({
      key: actuator.key,
      when: schedule.when,
      title: actuator.label,
      detail: `${schedule.detail}${condition}`,
      active: schedule.active,
    });
  }

  // En cours d'abord, puis les horaires à venir, puis les règles à seuil qui
  // n'ont pas d'heure de déclenchement prévisible.
  return entries.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    const aTimed = a.when !== "Sur seuil";
    const bTimed = b.when !== "Sur seuil";
    if (aTimed !== bTimed) return aTimed ? -1 : 1;
    return a.when.localeCompare(b.when);
  });
}

export function NextActionsWidget({
  rules,
  delayMs = 0,
}: {
  rules: Record<string, AutomationRule>;
  delayMs?: number;
}) {
  const entries = buildEntries(rules);

  return (
    <WidgetCard title="Prochaines actions" subtitle="Ce que l'automatisation va faire" delayMs={delayMs}>
      <View style={{ marginTop: 16 }}>
        {entries.length === 0 ? (
          <T size={12} color={colors.textSecondary}>
            Aucune règle active. Active une automatisation pour voir les prochaines actions ici.
          </T>
        ) : (
          <View style={{ gap: 10 }}>
            {entries.map((entry) => (
              <View key={entry.key} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                <View
                  style={{
                    marginTop: 6,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: entry.active ? colors.emerald500 : "rgba(142,148,242,0.5)",
                  }}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T weight="bold" size={12}>
                    <T weight="bold" size={12} color={entry.active ? colors.emerald600 : colors.accent}>
                      {entry.when}
                    </T>
                    {" · "}
                    {entry.title}
                  </T>
                  <T size={11} color={colors.textSecondary} numberOfLines={1}>
                    {entry.detail}
                  </T>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </WidgetCard>
  );
}
