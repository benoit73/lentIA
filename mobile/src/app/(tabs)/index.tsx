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
} from "../../api";
import { useAuth } from "../../auth/AuthContext";
import { Page } from "../../components/Page";
import { SectionTitle } from "../../components/ui";
import { ActuatorsWidget } from "../../components/widgets/ActuatorsWidget";
import { LightingWidget } from "../../components/widgets/LightingWidget";
import { MeasuresWidget } from "../../components/widgets/MeasuresWidget";
import { NextActionsWidget } from "../../components/widgets/NextActionsWidget";
import { SurvivalRingWidget } from "../../components/widgets/SurvivalRingWidget";
import { ACTUATOR_POLL_MS } from "../../config";
import { usePolling } from "../../hooks/usePolling";

// États et journal changent vite (une règle peut basculer un actionneur à
// tout moment) ; règles, prédiction et recommandations bougent lentement et
// coûtent plus cher à calculer côté serveur.
const SLOW_POLL_MS = 30_000;

export default function Dashboard() {
  const { token, handleUnauthorized } = useAuth();
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
      if (err instanceof ApiError && err.status === 401) handleUnauthorized();
    }
  }, [token, handleUnauthorized]);

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
      if (err instanceof ApiError && err.status === 401) handleUnauthorized();
      loadLive();
    } finally {
      setPending(null);
    }
  }

  return (
    <Page>
      <SectionTitle>Vue d'ensemble</SectionTitle>
      {/* Version resserrée du dashboard web : réservoir, climat et sol
          regroupés en une grille de tuiles pour limiter le défilement. */}
      <SurvivalRingWidget chancePct={chancePct} recommendations={recommendations} delayMs={0} />
      <MeasuresWidget events={events} recommendations={recommendations} delayMs={60} />
      <ActuatorsWidget states={states} pending={pending} onToggle={handleToggle} error={actuatorError} delayMs={120} />
      <LightingWidget on={states.light?.state ?? false} events={events} rule={rules.light} delayMs={180} />
      <NextActionsWidget rules={rules} delayMs={240} />
    </Page>
  );
}
