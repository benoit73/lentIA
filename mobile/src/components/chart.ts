import type { LiveChartPoint } from "../hooks/useLiveSeries";

/** Géométrie commune aux courbes SVG (remplace Recharts du dashboard web) :
 * axe X temporel [leftEdge, rightEdge], axe Y automatique, et une ligne
 * cassée à chaque point `value: null` — même rendu que `connectNulls={false}`. */

export interface ChartBox {
  width: number;
  height: number;
  /** Marges internes (place des axes). */
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
}

export interface Scales {
  x: (time: number) => number;
  y: (value: number) => number;
  yMin: number;
  yMax: number;
  inner: { left: number; right: number; top: number; bottom: number };
}

export function computeScales(points: LiveChartPoint[], leftEdge: number, rightEdge: number, box: ChartBox): Scales {
  const left = box.left ?? 0;
  const right = box.width - (box.right ?? 0);
  const top = box.top ?? 0;
  const bottom = box.height - (box.bottom ?? 0);

  const values = points
    .filter((p) => p.value !== null && p.time >= leftEdge && p.time <= rightEdge)
    .map((p) => p.value as number);
  let yMin = values.length ? Math.min(...values) : 0;
  let yMax = values.length ? Math.max(...values) : 1;
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.08;
  yMin -= pad;
  yMax += pad;

  const span = Math.max(1, rightEdge - leftEdge);
  return {
    x: (time) => left + ((time - leftEdge) / span) * (right - left),
    y: (value) => bottom - ((value - yMin) / (yMax - yMin)) * (bottom - top),
    yMin,
    yMax,
    inner: { left, right, top, bottom },
  };
}

/** Segments continus (séparés par les `null`), limités à la fenêtre visible. */
function segments(points: LiveChartPoint[], leftEdge: number, rightEdge: number): { time: number; value: number }[][] {
  const result: { time: number; value: number }[][] = [];
  let current: { time: number; value: number }[] = [];
  for (const point of points) {
    if (point.value === null) {
      if (current.length) result.push(current);
      current = [];
      continue;
    }
    if (point.time < leftEdge || point.time > rightEdge) continue;
    current.push({ time: point.time, value: point.value });
  }
  if (current.length) result.push(current);
  return result;
}

export function linePath(points: LiveChartPoint[], leftEdge: number, rightEdge: number, scales: Scales): string {
  return segments(points, leftEdge, rightEdge)
    .map((segment) => {
      // Un point isolé (entouré de trous) : petit trait horizontal pour
      // qu'il reste visible, une ligne SVG d'un seul point ne dessine rien.
      if (segment.length === 1) {
        const x = scales.x(segment[0].time);
        const y = scales.y(segment[0].value);
        return `M${x - 1.5},${y}L${x + 1.5},${y}`;
      }
      return segment.map((p, i) => `${i === 0 ? "M" : "L"}${scales.x(p.time)},${scales.y(p.value)}`).join("");
    })
    .join("");
}

export function areaPath(points: LiveChartPoint[], leftEdge: number, rightEdge: number, scales: Scales): string {
  const base = scales.inner.bottom;
  return segments(points, leftEdge, rightEdge)
    .filter((segment) => segment.length > 1)
    .map((segment) => {
      const line = segment.map((p, i) => `${i === 0 ? "M" : "L"}${scales.x(p.time)},${scales.y(p.value)}`).join("");
      const first = scales.x(segment[0].time);
      const last = scales.x(segment[segment.length - 1].time);
      return `${line}L${last},${base}L${first},${base}Z`;
    })
    .join("");
}

/** Point réel le plus proche d'une abscisse (pour l'info-bulle au toucher). */
export function nearestPoint(points: LiveChartPoint[], time: number): { time: number; value: number } | null {
  let best: { time: number; value: number } | null = null;
  for (const point of points) {
    if (point.value === null) continue;
    if (!best || Math.abs(point.time - time) < Math.abs(best.time - time)) {
      best = { time: point.time, value: point.value };
    }
  }
  return best;
}
