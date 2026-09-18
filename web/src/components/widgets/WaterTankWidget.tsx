import { useAuth } from "../../auth/AuthContext";
import { WATER_TANK_LITERS } from "../../config";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
import { WidgetCard, WidgetPill } from "./WidgetCard";

function formatLiters(liters: number): string {
  return `${liters.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} L`;
}

export function WaterTankWidget({ delayMs = 0, className }: { delayMs?: number; className?: string }) {
  const { token } = useAuth();
  const { value, online } = useSensorRealtime("water_level", token);

  const pct = value === null ? null : Math.max(0, Math.min(100, value));
  const liters = pct === null ? null : (pct / 100) * WATER_TANK_LITERS;

  return (
    <WidgetCard
      title="Réservoir d'eau"
      subtitle="Capteur de niveau · mesure en temps réel"
      pill={<WidgetPill>{liters === null ? "— L restants" : `${formatLiters(liters)} restants`}</WidgetPill>}
      delayMs={delayMs}
      className={className}
    >
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-theme-textSecondary">Niveau mesuré</span>
        <span className={`text-sm font-bold ${online ? "text-theme-accent" : "text-red-500"}`}>
          {online ? "Capteur en ligne" : "Capteur hors ligne"}
        </span>
      </div>

      <div className="mt-3 relative h-24 sm:h-28 rounded-[1.6rem] bg-slate-200/80 ring-4 ring-white overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-[1.6rem] transition-[width] duration-700 ease-out"
          style={{
            width: `${pct ?? 0}%`,
            background: "linear-gradient(90deg, #4B84F7 0%, #35B6F0 55%, #6EE7F9 100%)",
          }}
        >
          {/* Bulles décoratives : donnent l'impression d'un liquide plutôt
              que d'une simple barre de progression. */}
          <span className="absolute left-[8%] top-[28%] w-2 h-2 rounded-full bg-white/50" />
          <span className="absolute left-[38%] bottom-[26%] w-1.5 h-1.5 rounded-full bg-white/40" />
          <span className="absolute left-[62%] top-[22%] w-1 h-1 rounded-full bg-white/40" />
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-2xl bg-white/95 px-4 py-1.5 text-2xl font-extrabold text-blue-600 shadow-sm tabular-nums">
            {pct === null ? "--" : `${Math.round(pct)}%`}
          </span>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-medium text-theme-textMuted">
        <span>0 L</span>
        <span>
          {liters === null ? "En attente de relevé" : `${formatLiters(liters)} disponibles sur ${formatLiters(WATER_TANK_LITERS)}`}
        </span>
        <span>{formatLiters(WATER_TANK_LITERS)}</span>
      </div>
    </WidgetCard>
  );
}
