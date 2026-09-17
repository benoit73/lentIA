import type { HistoryPoint } from "./api";
import { SENSOR_STALE_MS } from "./config";

export interface GappedPoint {
  value: number | null;
  created_at: string;
}

/**
 * Insère un point `value: null` entre deux relevés réels trop espacés dans
 * le temps, pour que Recharts (connectNulls=false) casse la ligne au lieu
 * de relier les deux points comme si la donnée avait été continue.
 */
export function withGapBreaks(data: HistoryPoint[], gapMs: number = SENSOR_STALE_MS): GappedPoint[] {
  const real = data.filter((d): d is { value: number; created_at: string } => d.value !== null);
  const points: GappedPoint[] = [];

  real.forEach((point, i) => {
    if (i > 0) {
      const prevTime = new Date(real[i - 1].created_at).getTime();
      const time = new Date(point.created_at).getTime();
      if (time - prevTime > gapMs) {
        points.push({ value: null, created_at: new Date((prevTime + time) / 2).toISOString() });
      }
    }
    points.push(point);
  });

  return points;
}
