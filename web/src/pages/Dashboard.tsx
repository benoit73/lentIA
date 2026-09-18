import { useCallback, useEffect, useState } from "react";
import {
  ApiError,
  fetchActuatorEvents,
  fetchActuatorStates,
  fetchAutomationRules,
  fetchGerminationChance,
  fetchGerminationRecommendations,
  toggleActuator,
  type ActuatorEvent,
  type ActuatorState,
  type AutomationRule,
  type GerminationRecommendations,
} from "../api";
import { useAuth } from "../auth/AuthContext";
import { ActuatorsWidget } from "../components/widgets/ActuatorsWidget";
import { ClimateWidget } from "../components/widgets/ClimateWidget";
import { LightingWidget } from "../components/widgets/LightingWidget";
import { NextActionsWidget } from "../components/widgets/NextActionsWidget";
import { SoilMoistureWidget } from "../components/widgets/SoilMoistureWidget";
import { SurvivalRingWidget } from "../components/widgets/SurvivalRingWidget";
import { WaterTankWidget } from "../components/widgets/WaterTankWidget";
import { ACTUATOR_POLL_MS } from "../config";
import { usePolling } from "../hooks/usePolling";

// États et journal changent vite (une règle peut basculer un actionneur à
// tout moment) ; règles, prédiction et recommandations bougent lentement et
// coûtent plus cher à calculer côté serveur.
const SLOW_POLL_MS = 30_000;

export function Dashboard() {
  const { token, signOut } = useAuth();
  const [states, setStates] = useState<Record<string, ActuatorState>>({});
  const [events, setEvents] = useState<ActuatorEvent[]>([]);
  const [rules, setRules] = useState<Record<string, AutomationRule>>({});
  const [chancePct, setChancePct] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<GerminationRecommendations | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [actuatorError, setActuatorError] = useState<string | null>(null);

  const loadLive = useCallback(async () => {
    if (!token) return;
    // Depuis hier minuit : une période d'éclairage commencée hier soir doit
    // encore être comptée dans l'exposition du jour.
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 1);

    try {
      const [nextStates, nextEvents] = await Promise.all([
        fetchActuatorStates(token),
        fetchActuatorEvents(token, { start: since.toISOString(), limit: 200 }),
      ]);
      setStates(nextStates);
      setEvents(nextEvents);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
    }
  }, [token, signOut]);

  const loadSlow = useCallback(async () => {
    if (!token) return;
    // allSettled : un capteur sans relevé fait échouer la prédiction (503)
    // sans que ça doive priver le dashboard des règles d'automatisation.
    const [rulesResult, chanceResult, recommendationsResult] = await Promise.allSettled([
      fetchAutomationRules(token),
      fetchGerminationChance(token),
      fetchGerminationRecommendations(token),
    ]);
    if (rulesResult.status === "fulfilled") setRules(rulesResult.value);
    if (chanceResult.status === "fulfilled") setChancePct(chanceResult.value.chance_pct);
    if (recommendationsResult.status === "fulfilled") setRecommendations(recommendationsResult.value);
  }, [token]);

  useEffect(() => {
    loadLive();
    loadSlow();
  }, [loadLive, loadSlow]);

  usePolling(loadLive, ACTUATOR_POLL_MS);
  usePolling(loadSlow, SLOW_POLL_MS);

  async function handleToggle(key: string, next: boolean) {
    if (!token) return;
    setPending(key);
    setActuatorError(null);
    // Pas de retour matériel : on affiche l'état commandé tout de suite,
    // la commande part en parallèle sur MQTT.
    setStates((prev) => ({ ...prev, [key]: { state: next, updated_at: new Date().toISOString() } }));
    try {
      await toggleActuator(token, key, next);
      await loadLive();
    } catch (err) {
      setActuatorError("Impossible de changer l'état de l'actionneur.");
      if (err instanceof ApiError && err.status === 401) signOut();
      loadLive();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="min-h-full p-4 sm:p-6 lg:p-8 pb-20">
      <h2 className="font-bold text-sm text-theme-textSecondary uppercase tracking-wide">Vue d'ensemble</h2>

      <div className="mt-3 grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5">
        <WaterTankWidget delayMs={0} className="lg:col-span-3" />

        {/* Colonne de droite sur deux rangées : le seul widget vertical,
            il équilibre la grille face aux jauges horizontales. */}
        <LightingWidget
          on={states.light?.state ?? false}
          events={events}
          rule={rules.light}
          delayMs={60}
          className="lg:row-span-2"
        />

        <SurvivalRingWidget chancePct={chancePct} recommendations={recommendations} delayMs={120} />
        <ClimateWidget recommendations={recommendations} delayMs={180} />
        <SoilMoistureWidget events={events} recommendations={recommendations} delayMs={240} />

        <ActuatorsWidget
          states={states}
          pending={pending}
          onToggle={handleToggle}
          error={actuatorError}
          delayMs={300}
          className="lg:col-span-3"
        />
        <NextActionsWidget rules={rules} delayMs={360} />
      </div>
    </div>
  );
}
