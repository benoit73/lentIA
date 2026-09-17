import { useEffect, useRef, useState } from "react";
import { sensorWebSocketUrl } from "../api";

/** Valeur temps réel d'un capteur, poussée par l'API via WebSocket. */
export function useSensorRealtime(sensor: string, token: string | null): number | null {
  const [value, setValue] = useState<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const socket = new WebSocket(sensorWebSocketUrl(sensor, token as string));
      socketRef.current = socket;

      socket.addEventListener("message", (event) => {
        setValue(JSON.parse(event.data));
      });

      socket.addEventListener("close", () => {
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

  return value;
}
