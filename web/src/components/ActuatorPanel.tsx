import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, fetchActuatorStates, toggleActuator, type ActuatorState } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ACTUATOR_POLL_MS, ACTUATORS } from "../config";
import { formatDateTime } from "../format";
import { usePolling } from "../hooks/usePolling";
import { ToggleSwitch } from "./ToggleSwitch";

export function ActuatorPanel() {
  const { token, signOut } = useAuth();
  const [states, setStates] = useState<Record<string, ActuatorState>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setStates(await fetchActuatorStates(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
    }
  }, [token, signOut]);

  useEffect(() => {
    load();
  }, [load]);

  // Rattrape les changements faits ailleurs (une règle d'automatisation qui
  // se déclenche, un toggle depuis un autre onglet/appareil) sans qu'il n'y
  // ait de canal temps réel dédié aux actionneurs.
  usePolling(load, ACTUATOR_POLL_MS);

  async function handleToggle(key: string, next: boolean) {
    if (!token) return;
    setPending(key);
    setError(null);
    // Pas de retour matériel pour l'instant : on affiche l'état commandé
    // tout de suite (optimiste), la commande part en parallèle sur MQTT.
    setStates((prev) => ({ ...prev, [key]: { state: next, updated_at: new Date().toISOString() } }));
    try {
      await toggleActuator(token, key, next);
      await load();
    } catch (err) {
      setError("Impossible de changer l'état de l'actionneur.");
      if (err instanceof ApiError && err.status === 401) signOut();
      load();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-theme-textPrimary tracking-tight">Actionneurs</h2>
          <p className="text-xs text-theme-textSecondary mt-0.5">
            Pas encore de matériel branché : les commandes sont envoyées sur MQTT et enregistrées, prêtes pour
            quand le Pico pilotera les relais. Peuvent aussi être pilotés automatiquement.
          </p>
        </div>
        <Link
          to="/automatisation"
          className="text-xs font-bold text-theme-accent hover:underline whitespace-nowrap"
        >
          Automatisation →
        </Link>
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      <div className="mt-4 divide-y divide-slate-200/70">
        {ACTUATORS.map((actuator) => {
          const current = states[actuator.key];
          const on = current?.state ?? false;
          return (
            <div key={actuator.key} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-bold text-sm text-theme-textPrimary">{actuator.label}</p>
                <p className="text-[11px] text-theme-textSecondary">
                  Dernier changement : {current?.updated_at ? formatDateTime(current.updated_at) : "jamais"}
                </p>
              </div>
              <ToggleSwitch
                checked={on}
                onChange={(next) => handleToggle(actuator.key, next)}
                disabled={pending === actuator.key}
                label={actuator.label}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
