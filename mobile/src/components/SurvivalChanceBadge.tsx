import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { ApiError, fetchGerminationChance } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePolling } from "../hooks/usePolling";
import { colors } from "../theme";
import { T } from "./ui";

// Prédiction basée sur le dernier relevé connu de chaque capteur (voir
// api/prediction.py) : se rafraîchit plus souvent que les relevés eux-mêmes
// n'arrivent pour rester réactif sans être excessif.
const REFRESH_MS = 10_000;

function tone(pct: number): { bg: string; fg: string } {
  if (pct >= 66) return { bg: colors.emerald100, fg: colors.emerald700 };
  if (pct >= 33) return { bg: colors.amber100, fg: colors.amber700 };
  return { bg: colors.red100, fg: colors.red700 };
}

export function SurvivalChanceBadge() {
  const { token } = useAuth();
  const [pct, setPct] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    fetchGerminationChance(token)
      .then((prediction) => {
        setPct(prediction.chance_pct);
        setUnavailable(false);
      })
      .catch((err) => {
        // 503 : aucun capteur n'a encore rien reçu — pas une vraie erreur,
        // juste "pas encore de donnée" (ex. juste après un démarrage).
        if (err instanceof ApiError && err.status === 503) setUnavailable(true);
      });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  usePolling(load, REFRESH_MS);

  if (pct === null) {
    return unavailable ? (
      <View style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.whitePill }}>
        <T weight="semibold" size={12} color={colors.textMuted}>
          Survie : —
        </T>
      </View>
    ) : null;
  }

  const { bg, fg } = tone(pct);
  return (
    <View
      style={{ borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: bg, flexDirection: "row", alignItems: "center", gap: 6 }}
      accessibilityLabel="Chances de pousse prédites à partir des moyennes capteur des dernières 24 h"
    >
      <T weight="semibold" size={11} color={fg} style={{ textTransform: "uppercase", letterSpacing: 0.5, opacity: 0.8 }}>
        Survie
      </T>
      <T weight="bold" size={14} color={fg}>
        {pct.toFixed(0)}%
      </T>
    </View>
  );
}
