import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LiveChartPoint } from "../hooks/useLiveSeries";

function formatTick(time: number) {
  return new Date(time).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  points: LiveChartPoint[];
  leftEdge: number;
  rightEdge: number;
  color: string;
  unit: string;
}

export function SensorChart({ points, leftEdge, rightEdge, color, unit }: Props) {
  const hasData = points.some((p) => p.value !== null);

  if (!hasData) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-theme-textSecondary">
        Aucune donnée sur cette plage.
      </div>
    );
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 4" stroke="#DDE1EE" vertical={false} />
          <XAxis
            dataKey="time"
            type="number"
            domain={[leftEdge, rightEdge]}
            tickFormatter={formatTick}
            tick={{ fontSize: 11, fill: "#8B90A5" }}
            minTickGap={40}
          />
          <YAxis tick={{ fontSize: 11, fill: "#8B90A5" }} width={48} domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value: number | string | Array<number | string>) =>
              value === null || value === undefined ? ["—", "Valeur"] : [`${value} ${unit}`, "Valeur"]
            }
            labelFormatter={(time: number) => new Date(time).toLocaleString("fr-FR")}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
