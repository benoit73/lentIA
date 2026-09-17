import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchActuatorEvents, type ActuatorEvent } from "../api";
import { useAuth } from "../auth/AuthContext";
import { ACTUATOR_POLL_MS, ACTUATORS } from "../config";
import { formatDateTime } from "../format";
import { usePolling } from "../hooks/usePolling";

export function JournalPreview() {
  const { token } = useAuth();
  const [events, setEvents] = useState<ActuatorEvent[]>([]);

  const load = useCallback(() => {
    if (!token) return;
    fetchActuatorEvents(token, { limit: 5 })
      .then(setEvents)
      .catch(() => {
        // La page Journal complète affichera l'erreur ; ici on reste discret.
      });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Pas de canal temps réel pour le journal : on repasse régulièrement pour
  // voir apparaître les actions manuelles ou automatiques faites entre-temps.
  usePolling(load, ACTUATOR_POLL_MS);

  return (
    <div className="bg-theme-card rounded-3xl p-5 shadow-soft-card lg:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-lg text-theme-textPrimary tracking-tight">Journal</h2>
          <p className="text-xs text-theme-textSecondary mt-0.5">Dernières actions sur les actionneurs</p>
        </div>
        <Link to="/journal" className="text-xs font-bold text-theme-accent hover:underline whitespace-nowrap">
          Voir tout le journal →
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="mt-4 text-xs text-theme-textSecondary">Aucune action enregistrée pour l'instant.</p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {events.map((event) => {
            const actuator = ACTUATORS.find((a) => a.key === event.actuator);
            return (
              <li key={event.id} className="text-xs text-theme-textSecondary flex items-center justify-between gap-2">
                <span>
                  <strong className="text-theme-textPrimary">{actuator?.label ?? event.actuator}</strong>{" "}
                  {event.state ? "activé" : "désactivé"}
                  {event.actor_email ? ` par ${event.actor_email}` : ""}
                  {" · "}
                  {event.source === "manual" ? "manuel" : "auto"}
                </span>
                <span className="whitespace-nowrap">{formatDateTime(event.created_at)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
