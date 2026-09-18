import type { GerminationRecommendations } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { sensorByKey } from "../../config";
import { useSensorRealtime } from "../../hooks/useSensorRealtime";
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

function Gauge({ sensorKey, min, max, target }: GaugeProps) {
  const { token } = useAuth();
  const { value, online } = useSensorRealtime(sensorKey, token);
  const meta = sensorByKey(sensorKey);
  const color = meta?.color ?? "#8E94F2";

  return (
    <div className={online ? "" : "opacity-60"}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold text-theme-textSecondary">{meta?.label}</span>
        <span className="text-xl font-extrabold text-theme-textPrimary tracking-tight tabular-nums">
          {value === null ? "--" : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} ${meta?.unit}`}
        </span>
      </div>

      <div className="mt-2 relative h-2.5 rounded-full bg-slate-200/90">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out"
          style={{
            width: `${value === null ? 0 : position(value, min, max)}%`,
            background: `linear-gradient(90deg, ${color}55 0%, ${color} 100%)`,
          }}
        />
        {target !== undefined && (
          <span
            className="absolute -top-1 w-0.5 rounded-full bg-theme-textPrimary/70"
            style={{ left: `${position(target, min, max)}%`, height: "1.125rem" }}
            title={`Cible IA : ${target} ${meta?.unit}`}
          />
        )}
      </div>

      <div className="mt-1 flex items-center justify-between text-[10px] font-medium text-theme-textMuted">
        <span>
          {min} {meta?.unit}
        </span>
        {target !== undefined && (
          <span className="font-bold text-theme-textSecondary">
            Cible IA {target.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} {meta?.unit}
          </span>
        )}
        <span>
          {max} {meta?.unit}
        </span>
      </div>
    </div>
  );
}

interface Props {
  recommendations: GerminationRecommendations | null;
  delayMs?: number;
}

export function ClimateWidget({ recommendations, delayMs = 0 }: Props) {
  return (
    <WidgetCard title="Climat" subtitle="Air du bac, en direct" delayMs={delayMs}>
      <div className="mt-4 flex flex-col gap-5">
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
      </div>
    </WidgetCard>
  );
}
