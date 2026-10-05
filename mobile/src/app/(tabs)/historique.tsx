import { useCallback, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { fetchGerminationRecommendations, type GerminationRecommendations } from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { Page } from "../../components/Page";
import { presetToRange, RangePicker, type PresetKey } from "../../components/RangePicker";
import { SensorCard } from "../../components/SensorCard";
import { SectionTitle, T } from "../../components/ui";
import { SENSORS } from "../../config";
import { usePolling } from "../../hooks/usePolling";
import { colors } from "../../theme";

// Recommandations (réseau de neurones) : plus coûteuses à calculer que la
// simple prédiction du header (balayage par capteur côté serveur), et les
// cibles n'ont pas besoin d'être aussi réactives — intervalle plus long.
const RECOMMENDATIONS_POLL_MS = 30_000;

export default function HistoryPage() {
  const { token } = useAuth();
  const [preset, setPreset] = useState<PresetKey>("24h");
  const [customStart, setCustomStart] = useState<Date | null>(null);
  const [customEnd, setCustomEnd] = useState<Date | null>(null);
  const [recommendations, setRecommendations] = useState<GerminationRecommendations | null>(null);

  const range = useMemo(() => presetToRange(preset, customStart, customEnd), [preset, customStart, customEnd]);

  const loadRecommendations = useCallback(() => {
    if (!token) return;
    fetchGerminationRecommendations(token)
      .then(setRecommendations)
      // 503 : pas encore de relevé pour un des capteurs — pas une vraie
      // erreur, on garde juste les cartes sans badge "Cible IA".
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  usePolling(loadRecommendations, RECOMMENDATIONS_POLL_MS);

  return (
    <Page>
      <View style={{ gap: 4 }}>
        <SectionTitle>Historique</SectionTitle>
        <T size={12} color={colors.textSecondary}>
          Courbes de chaque capteur sur la plage choisie — touche une carte pour le détail.
        </T>
      </View>
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

      {SENSORS.map((sensor) => (
        <SensorCard
          key={sensor.key}
          sensor={sensor}
          range={range}
          live={preset !== "custom"}
          recommendedValue={recommendations?.recommendations[sensor.key]?.recommended_value}
        />
      ))}
    </Page>
  );
}
