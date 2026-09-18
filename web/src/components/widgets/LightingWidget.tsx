import type { ActuatorEvent, AutomationRule, ScheduleThresholdConfig, TimeRange } from "../../api";
import { DEFAULT_LIGHT_TARGET_HOURS } from "../../config";
import { WidgetCard, WidgetPill } from "./WidgetCard";

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
  className?: string;
}

export function LightingWidget({ on, events, rule, delayMs = 0, className }: Props) {
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
      className={className}
    >
      <div className="mt-4 relative flex-1 min-h-[168px] rounded-2xl bg-white/60 overflow-hidden flex items-center justify-center">
        {/* Halo : seule partie qui change vraiment quand la lampe s'allume. */}
        {on && (
          <span
            className="soft-pulse absolute w-56 h-56 rounded-full blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0) 70%)" }}
          />
        )}
        <div className="relative flex flex-col items-center">
          <span className={`w-0.5 h-10 rounded-full ${on ? "bg-amber-300" : "bg-slate-300"}`} />
          <div
            className={`relative -mt-px w-40 h-14 rounded-t-full flex items-end justify-center pb-2.5 shadow-sm ${
              on ? "bg-gradient-to-b from-white to-amber-50" : "bg-gradient-to-b from-white to-slate-100"
            }`}
          >
            <span
              className={`text-[11px] font-extrabold tracking-wide ${on ? "text-amber-600" : "text-theme-textMuted"}`}
            >
              {on ? "LAMPE ALLUMÉE" : "LAMPE ÉTEINTE"}
            </span>
          </div>
          {/* Cône de lumière projeté sous l'abat-jour : c'est lui qui fait
              vraiment « lampe allumée », le halo seul restait plat. */}
          {on && (
            <span
              className="w-52 h-20 -mt-px"
              style={{
                clipPath: "polygon(24% 0%, 76% 0%, 100% 100%, 0% 100%)",
                background: "linear-gradient(180deg, rgba(251,191,36,0.42) 0%, rgba(253,224,71,0.12) 55%, rgba(254,240,138,0) 100%)",
              }}
            />
          )}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/60 p-4">
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-theme-textSecondary">
          Exposition lumineuse
        </p>
        <p className="mt-1 text-2xl font-extrabold text-theme-textPrimary tracking-tight tabular-nums">
          {formatHours(doneHours)} sur {formatHours(targetHours)}
        </p>

        <div className="mt-3 h-2.5 rounded-full bg-slate-200/90 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #FBBF24 0%, #A78BFA 65%, #8B5CF6 100%)",
            }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-theme-textMuted">
          <span>{ranges.length > 0 ? `Début ${ranges[0].start}` : "Pas de plage programmée"}</span>
          <span>{ranges.length > 0 ? `Fin prévue ${ranges[ranges.length - 1].end}` : "—"}</span>
        </div>
        <p className="mt-2 text-[11px] text-theme-textSecondary">
          Cycle cible de {formatHours(targetHours)} pour la croissance des lentilles.
        </p>
      </div>
    </WidgetCard>
  );
}
