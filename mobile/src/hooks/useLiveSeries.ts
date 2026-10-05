import { useEffect, useRef, useState } from "react";
import type { HistoryRange } from "../api";
import { smoothPoints, withGapBreaks } from "../chartGaps";
import { CHART_SMOOTHING_WINDOW, SENSOR_STALE_MS } from "../config";
import { useSensorHistory } from "./useSensorHistory";

export interface LiveChartPoint {
  time: number; // epoch ms — axe X numérique/temporel, pour un vrai espacement dans le temps
  value: number | null;
}

const NOW_TICK_MS = 1000;

interface Options {
  /** false pour une plage figée dans le passé (préréglage "Personnalisé") :
   * pas de curseur "maintenant", pas d'ajout des valeurs temps réel. */
  live: boolean;
  liveValue: number | null;
  receivedAt: number | null;
}

/**
 * Historique REST + valeurs temps réel greffées au fil de l'eau, avec un
 * curseur "maintenant" qui avance même sans nouvelle donnée : le graphe
 * montre le temps qui passe, casse la ligne dès qu'un capteur devient hors
 * ligne (silence > SENSOR_STALE_MS), et la reprend à la reconnexion — avec
 * un vrai trou entre les deux plutôt qu'une ligne continue trompeuse.
 */
export function useLiveSeries(sensor: string, range: HistoryRange, { live, liveValue, receivedAt }: Options) {
  const { data, loading, error } = useSensorHistory(sensor, range);

  const [liveHistory, setLiveHistory] = useState<{ value: number; created_at: string }[]>([]);
  const lastAppended = useRef<number | null>(null);

  useEffect(() => {
    if (!live || receivedAt === null || liveValue === null) return;
    if (lastAppended.current === receivedAt) return;
    lastAppended.current = receivedAt;
    setLiveHistory((prev) => [...prev, { value: liveValue, created_at: new Date(receivedAt).toISOString() }]);
  }, [live, receivedAt, liveValue]);

  // Repart de zéro à chaque changement de capteur/plage, pour ne pas mélanger
  // des valeurs temps réel accumulées avec un contexte différent.
  useEffect(() => {
    setLiveHistory([]);
    lastAppended.current = null;
  }, [sensor, live, range.start, range.end]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => setNow(Date.now()), NOW_TICK_MS);
    return () => clearInterval(interval);
  }, [live]);

  const combined = [...data, ...liveHistory].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const points: LiveChartPoint[] = smoothPoints(withGapBreaks(combined), CHART_SMOOTHING_WINDOW).map((p) => ({
    time: new Date(p.created_at).getTime(),
    value: p.value,
  }));

  let rightEdge = now;
  if (live) {
    const lastReal = [...combined].reverse().find((p) => p.value !== null);
    const lastTime = lastReal ? new Date(lastReal.created_at).getTime() : null;
    if (lastTime !== null && now - lastTime > SENSOR_STALE_MS) {
      // Rien depuis trop longtemps : la ligne s'arrête juste après le
      // dernier point réel, et reste blanche jusqu'à "maintenant".
      points.push({ time: lastTime + SENSOR_STALE_MS, value: null });
    }
  } else {
    rightEdge = range.end ? new Date(range.end).getTime() : now;
  }

  const leftEdge = range.start ? new Date(range.start).getTime() : rightEdge - 3600_000;

  return { points, leftEdge, rightEdge, loading, error };
}
