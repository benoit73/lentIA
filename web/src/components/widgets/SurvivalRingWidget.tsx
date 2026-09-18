import type { GerminationRecommendations } from "../../api";
import { sensorByKey } from "../../config";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import { WidgetCard } from "./WidgetCard";

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringColor(pct: number): string {
  if (pct >= 66) return "#10B981";
  if (pct >= 33) return "#F59E0B";
  return "#EF4444";
}

interface Advice {
  key: string;
  label: string;
  unit: string;
  current: number;
  target: number;
  gain: number;
}

/** Les 2 capteurs qui rapportent le plus de points de pousse si on les
 * corrige. L'API ne renvoie déjà que les leviers réels : un capteur dont la
 * courbe est plate (la luminosité, dans ce dataset) en est absent. */
function topAdvice(recommendations: GerminationRecommendations | null): Advice[] {
  if (!recommendations) return [];
  return Object.entries(recommendations.recommendations)
    .map(([key, recommendation]) => {
      const meta = sensorByKey(key);
      return {
        key,
        label: meta?.label ?? key,
        unit: meta?.unit ?? "",
        current: recommendations.based_on[key],
        target: recommendation.recommended_value,
        gain: recommendation.gain_pct,
      };
    })
    .filter((advice) => Number.isFinite(advice.current))
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 2);
}

interface Props {
  chancePct: number | null;
  recommendations: GerminationRecommendations | null;
  delayMs?: number;
}

export function SurvivalRingWidget({ chancePct, recommendations, delayMs = 0 }: Props) {
  const pct = chancePct ?? 0;
  const color = ringColor(pct);
  const advice = topAdvice(recommendations);

  return (
    <WidgetCard title="Chances de survie" subtitle="Prédiction du réseau de neurones" delayMs={delayMs}>
      <div className="mt-3 flex items-center justify-center">
        <div className="relative">
          <svg viewBox="0 0 140 140" className="w-36 h-36 -rotate-90">
            <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#E2E8F0" strokeWidth={13} />
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={13}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - (chancePct === null ? 0 : pct / 100))}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-extrabold tracking-tight tabular-nums" style={{ color }}>
              {chancePct === null ? "--" : `${Math.round(pct)}%`}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-theme-textMuted">de pousse</span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {advice.length === 0 ? (
          <p className="text-xs text-theme-textSecondary text-center">
            {recommendations ? "Conditions déjà proches de l'optimum." : "En attente de relevés."}
          </p>
        ) : (
          advice.map((item) => {
            const increase = item.target > item.current;
            return (
              <div key={item.key} className="flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2">
                <span
                  className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                    increase ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {increase ? <ArrowUpIcon /> : <ArrowDownIcon />}
                </span>
                <p className="text-[11px] leading-tight text-theme-textSecondary min-w-0">
                  <span className="font-bold text-theme-textPrimary">{item.label}</span> : vise{" "}
                  <span className="font-bold text-theme-textPrimary tabular-nums">
                    {item.target.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} {item.unit}
                  </span>{" "}
                  <span className="font-bold text-emerald-600 tabular-nums">+{Math.round(item.gain)} pts</span>
                  <br />
                  moy. 24 h : {item.current.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} {item.unit}
                </p>
              </div>
            );
          })
        )}
      </div>
    </WidgetCard>
  );
}
