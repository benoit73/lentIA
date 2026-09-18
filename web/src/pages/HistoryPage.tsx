import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, fetchGerminationRecommendations, type GerminationRecommendations } from "../api";
import { useAuth } from "../auth/AuthContext";
import { SENSORS } from "../config";
import { SensorCard } from "../components/SensorCard";
import { PresetKey, presetToRange, RangePicker } from "../components/RangePicker";
import { usePolling } from "../hooks/usePolling";

// Recommandations (réseau de neurones) : plus coûteuses à calculer que la
// simple prédiction du header (balayage par capteur côté serveur), et les
// cibles n'ont pas besoin d'être aussi réactives — intervalle plus long.
const RECOMMENDATIONS_POLL_MS = 30_000;

export function HistoryPage() {
  const { token } = useAuth();
  const [preset, setPreset] = useState<PresetKey>("24h");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [recommendations, setRecommendations] = useState<GerminationRecommendations | null>(null);

  const range = useMemo(() => presetToRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const loadRecommendations = useCallback(() => {
    if (!token) return;
    fetchGerminationRecommendations(token)
      .then(setRecommendations)
      .catch((err) => {
        // 503 : pas encore de relevé pour un des capteurs — pas une vraie
        // erreur, on garde juste les cartes sans badge "Cible IA".
        if (!(err instanceof ApiError && err.status === 503)) return;
      });
  }, [token]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  usePolling(loadRecommendations, RECOMMENDATIONS_POLL_MS);

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 pb-20">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-sm text-theme-textSecondary uppercase tracking-wide">Historique</h2>
          <p className="text-xs text-theme-textSecondary mt-0.5">
            Courbes de chaque capteur sur la plage choisie — clique une carte pour le détail.
          </p>
        </div>
        <RangePicker
          preset={preset}
          customStart={customStart}
          customEnd={customEnd}
          onPresetChange={setPreset}
          onCustomChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
        />
      </div>

      <main className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-5">
        {SENSORS.map((sensor) => (
          <SensorCard
            key={sensor.key}
            sensor={sensor}
            range={range}
            live={preset !== "custom"}
            recommendedValue={recommendations?.recommendations[sensor.key]?.recommended_value}
          />
        ))}
      </main>
    </div>
  );
}
