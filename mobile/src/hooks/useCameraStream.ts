import { useEffect, useRef, useState } from "react";
import { cameraWebSocketUrl, type CameraFrame } from "../api";
import { useAuth } from "../auth/AuthContext";
import { CAMERA_STALE_MS } from "../config";

export interface CameraStream {
  frame: CameraFrame | null;
  /** false si aucune image depuis CAMERA_STALE_MS (Pico éteint, caméra
   * débranchée...) ou WebSocket coupée. */
  online: boolean;
  /** Images reçues par seconde, mesurées sur les dernières secondes. */
  fps: number;
}

const FPS_WINDOW_MS = 3_000;

/** Flux temps réel de la caméra, poussé par l'API via WebSocket (une image
 * JPEG par message). Même principe que useSensorRealtime. */
export function useCameraStream(): CameraStream {
  const { token } = useAuth();
  const [frame, setFrame] = useState<CameraFrame | null>(null);
  const [online, setOnline] = useState(false);
  const [fps, setFps] = useState(0);
  const arrivals = useRef<number[]>([]);
  const lastFrameAt = useRef<number | null>(null);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;
    let socket: WebSocket | null = null;

    function connect() {
      socket = new WebSocket(cameraWebSocketUrl(token as string));
      socket.onmessage = (event) => {
        const next = JSON.parse(event.data) as CameraFrame;
        const now = Date.now();
        // À l'ouverture, l'API renvoie la dernière image connue, qui peut
        // être ancienne : on se fie à son horodatage pour le statut.
        const age = now - new Date(next.received_at).getTime();
        setFrame(next);
        if (age < CAMERA_STALE_MS) {
          lastFrameAt.current = now;
          arrivals.current.push(now);
          setOnline(true);
        }
      };
      socket.onclose = () => {
        setOnline(false);
        if (!cancelled) retryTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      arrivals.current = arrivals.current.filter((t) => now - t < FPS_WINDOW_MS);
      setFps(arrivals.current.length / (FPS_WINDOW_MS / 1000));
      if (lastFrameAt.current !== null && now - lastFrameAt.current > CAMERA_STALE_MS) {
        setOnline(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return { frame, online, fps };
}
