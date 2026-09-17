import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HistoryPoint } from "../api";
import { withGapBreaks } from "../chartGaps";

interface ChartPoint {
  value: number | null;
  created_at: string;
  label: string;
}

function formatTick(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SensorChart({ data, color, unit }: { data: HistoryPoint[]; color: string; unit: string }) {
  const points: ChartPoint[] = withGapBreaks(data).map((d) => ({
    ...d,
    label: formatTick(d.created_at),
  }));

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
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8B90A5" }} minTickGap={40} />
          <YAxis tick={{ fontSize: 11, fill: "#8B90A5" }} width={48} />
          <Tooltip
            formatter={(value: number | string | Array<number | string>) =>
              value === null || value === undefined ? ["—", "Valeur"] : [`${value} ${unit}`, "Valeur"]
            }
            labelFormatter={(_label, payload) => {
              const point = payload?.[0]?.payload as ChartPoint | undefined;
              return point ? new Date(point.created_at).toLocaleString("fr-FR") : "";
            }}
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
