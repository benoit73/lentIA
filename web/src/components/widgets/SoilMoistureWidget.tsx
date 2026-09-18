import type { ActuatorEvent, GerminationRecommendations } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
import { formatRelativeToNow } from "../../format";
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
      <div className="mt-4 flex items-center gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-4xl font-extrabold text-theme-textPrimary tracking-tight tabular-nums">
            {pct === null ? "--" : `${Math.round(pct)}%`}
          </p>
          {target !== undefined && (
            <p className="mt-1 text-xs font-bold text-theme-accent">
              Cible IA : {target.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
            </p>
          )}
          <p className="mt-3 text-[11px] text-theme-textSecondary">
            {watering ? (
              <>
                Dernier arrosage
                <br />
                <span className="font-bold text-theme-textPrimary">{formatRelativeToNow(watering.created_at)}</span>
                {watering.source === "auto" && " · auto"}
              </>
            ) : (
              "Aucun arrosage enregistré"
            )}
          </p>
        </div>

        {/* Tube vertical : rappelle une sonde plantée dans la terre, et change
            de forme par rapport aux jauges horizontales des autres widgets. */}
        <div className="relative w-14 h-36 shrink-0 rounded-full bg-slate-200/80 ring-4 ring-white overflow-hidden">
          <div
            className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
            style={{
              height: `${pct ?? 0}%`,
              background: "linear-gradient(180deg, #7DD3FC 0%, #38BDF8 45%, #8E94F2 100%)",
            }}
          />
          {target !== undefined && (
            <span
              className="absolute inset-x-1 h-0.5 rounded-full bg-white/90 shadow"
              style={{ bottom: `${Math.max(0, Math.min(100, target))}%` }}
            />
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
