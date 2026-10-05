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

/**
 * Moyenne mobile (fenêtre glissante) sur les valeurs réelles, pour amortir
 * le bruit de mesure (ex. HC-SR04 qui saute occasionnellement à 0 ou 100 sur
 * un écho parasite) sans cacher les vraies coupures : la fenêtre se
 * réinitialise à chaque point `null` (`withGapBreaks`) au lieu de lisser à
 * travers un trou.
 */
export function smoothPoints(points: GappedPoint[], windowSize: number): GappedPoint[] {
  if (windowSize <= 1) return points;

  const buffer: number[] = [];
  return points.map((point) => {
    if (point.value === null) {
      buffer.length = 0; // pas de lissage entre deux segments séparés par un trou
      return point;
    }
    buffer.push(point.value);
    if (buffer.length > windowSize) buffer.shift();
    const average = buffer.reduce((sum, v) => sum + v, 0) / buffer.length;
    return { ...point, value: Math.round(average * 10) / 10 };
  });
}
