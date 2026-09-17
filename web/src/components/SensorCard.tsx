import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { HistoryRange } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { SensorMeta } from "../config";
import { useSensorHistory } from "../hooks/useSensorHistory";
import { useSensorRealtime } from "../hooks/useSensorRealtime";

function formatValue(value: number | null, unit: string) {
  if (value === null || value === undefined) return "--";
  const rounded = unit === "lux" ? Math.round(value).toLocaleString("fr-FR") : value.toFixed(1);
  return `${rounded} ${unit}`;
}

export function SensorCard({ sensor, range }: { sensor: SensorMeta; range: HistoryRange }) {
  const { token } = useAuth();
  const live = useSensorRealtime(sensor.key, token);
  const { data } = useSensorHistory(sensor.key, range);

  const latestHistoryValue = [...data].reverse().find((d) => d.value !== null)?.value ?? null;
  const currentValue = live ?? latestHistoryValue;
  const chartData = data.filter((d) => d.value !== null).map((d) => ({ value: d.value }));

  return (
    <Link
      to={`/sensors/${sensor.key}`}
      className="block bg-theme-card rounded-3xl p-4 shadow-soft-card transition duration-300 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-theme-textPrimary tracking-tight">{sensor.label}</h2>
          <p className="text-xs text-theme-textSecondary mt-0.5 font-medium">Voir l'historique →</p>
        </div>
        <span className="text-2xl font-extrabold text-theme-textPrimary tracking-tight whitespace-nowrap">
          {formatValue(currentValue, sensor.unit)}
        </span>
      </div>
      <div className="h-16 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`grad-${sensor.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={sensor.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={sensor.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={sensor.color}
              strokeWidth={3}
              fill={`url(#grad-${sensor.key})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Link>
  );
}
