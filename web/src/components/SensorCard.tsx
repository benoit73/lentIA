import { Link } from "react-router-dom";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { HistoryRange } from "../api";
import { useAuth } from "../auth/AuthContext";
import type { SensorMeta } from "../config";
import { useLiveSeries } from "../hooks/useLiveSeries";
import { useSensorRealtime } from "../hooks/useSensorRealtime";
import { LiveStatusDot } from "./LiveStatusDot";

function formatValue(value: number | null, unit: string) {
  if (value === null || value === undefined) return "--";
  const rounded = unit === "lux" ? Math.round(value).toLocaleString("fr-FR") : value.toFixed(1);
  return `${rounded} ${unit}`;
}

export function SensorCard({ sensor, range, live }: { sensor: SensorMeta; range: HistoryRange; live: boolean }) {
  const { token } = useAuth();
  const { value: liveValue, online, receivedAt } = useSensorRealtime(sensor.key, token);
  const { points, leftEdge, rightEdge } = useLiveSeries(sensor.key, range, { live, liveValue, receivedAt });

  const lastRealValue = [...points].reverse().find((p) => p.value !== null)?.value ?? null;
  const currentValue = liveValue ?? lastRealValue;

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
        <div className="flex flex-col items-end gap-1">
          <span className="text-2xl font-extrabold text-theme-textPrimary tracking-tight whitespace-nowrap">
            {formatValue(currentValue, sensor.unit)}
          </span>
          <LiveStatusDot online={online} />
        </div>
      </div>
      <div className="h-16 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points}>
            <defs>
              <linearGradient id={`grad-${sensor.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={sensor.color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={sensor.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" type="number" domain={[leftEdge, rightEdge]} hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={sensor.color}
              strokeWidth={3}
              fill={`url(#grad-${sensor.key})`}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Link>
  );
}
