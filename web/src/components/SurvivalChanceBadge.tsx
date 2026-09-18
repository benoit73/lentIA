import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchGerminationChance } from "../api";
import { useAuth } from "../auth/AuthContext";
import { usePolling } from "../hooks/usePolling";

// Prédiction basée sur le dernier relevé connu de chaque capteur (voir
// api/prediction.py) : se rafraîchit plus souvent que les relevés eux-mêmes
// n'arrivent pour rester réactif sans être excessif.
const REFRESH_MS = 10_000;

function colorClasses(pct: number): string {
  if (pct >= 66) return "bg-emerald-100 text-emerald-700";
  if (pct >= 33) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
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
      <div className="glass-pill rounded-full px-4 py-1.5 text-xs font-semibold text-theme-textMuted border border-white/70">
        Chances de survie : pas encore de données
      </div>
    ) : null;
  }

  return (
    <div
      className={`rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold shadow-sm ${colorClasses(pct)}`}
      title="Chances de survie prédites à partir des derniers relevés capteur"
    >
      <span className="uppercase tracking-wide font-semibold opacity-80">Chances de survie</span>
      <span className="text-sm">{pct.toFixed(0)}%</span>
    </div>
  );
}
