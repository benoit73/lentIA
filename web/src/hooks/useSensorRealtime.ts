import { useEffect, useRef, useState } from "react";
import { sensorWebSocketUrl } from "../api";
import { SENSOR_STALE_MS } from "../config";

export interface SensorRealtime {
  value: number | null;
  /** false si aucun message reçu depuis SENSOR_STALE_MS (capteur hors ligne
   * ou WebSocket coupée), même si la connexion WebSocket est restée ouverte. */
  online: boolean;
  /** Horodatage (epoch ms) du dernier message reçu — sert à greffer les
   * valeurs temps réel sur les graphes (useLiveSeries). */
  receivedAt: number | null;
}

/** Valeur temps réel d'un capteur, poussée par l'API via WebSocket, avec un
 * statut en ligne/hors ligne basé sur la fraîcheur du dernier message. */
export function useSensorRealtime(sensor: string, token: string | null): SensorRealtime {
  const [value, setValue] = useState<number | null>(null);
  const [online, setOnline] = useState(false);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const lastMessageAt = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const socket = new WebSocket(sensorWebSocketUrl(sensor, token as string));
      socketRef.current = socket;

      socket.addEventListener("message", (event) => {
        const now = Date.now();
        lastMessageAt.current = now;
        setValue(JSON.parse(event.data));
        setOnline(true);
        setReceivedAt(now);
      });

      socket.addEventListener("close", () => {
        setOnline(false);
        if (!cancelled) retryTimer = setTimeout(connect, 3000);
      });
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      socketRef.current?.close();
    };
  }, [sensor, token]);

  // Le Pico peut s'arrêter d'envoyer sans que la WebSocket (vers notre API)
  // ne se ferme elle-même : on vérifie donc aussi périodiquement l'âge du
  // dernier message reçu pour détecter un capteur silencieux.
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastMessageAt.current !== null && Date.now() - lastMessageAt.current > SENSOR_STALE_MS) {
        setOnline(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return { value, online, receivedAt };
}
